import { useState, useRef, useCallback, useEffect } from 'react'
import { FileText, Upload, ChevronDown, ChevronRight, Check } from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

// ─── Types ──────────────────────────────────────────────────────────────────

type Step = 'upload' | 'analyzing' | 'review' | 'importing' | 'success'

interface ExtractedItem {
  key: string
  name: string
  description: string
  price_ars: number
  price_usd: number | null
  tags: string[]
  allergens: string[]
  selected: boolean
}

interface ReviewSection {
  name: string
  items: ExtractedItem[]
  collapsed: boolean
}

interface ClaudeMenu {
  sections: {
    name: string
    items: {
      name: string
      description?: string
      price_ars?: number
      price_usd?: number | null
      tags?: string[]
      allergens?: string[]
    }[]
  }[]
}

// ─── PDF extraction ─────────────────────────────────────────────────────────

async function extractPDFText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const task = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) })
  const pdf = await task.promise
  const pages: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .filter(item => 'str' in item)
      .map(item => (item as { str: string }).str)
      .join(' ')
    pages.push(pageText)
  }
  return pages.join('\n\n').trim()
}

// ─── Claude API ──────────────────────────────────────────────────────────────

const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY

function buildPrompt(text: string): string {
  return `Analizá el siguiente texto extraído de una carta de restaurante y extraé TODOS los productos en JSON.

TEXTO:
${text.slice(0, 30000)}

Devolvé ÚNICAMENTE JSON válido, sin texto adicional, sin markdown:

{
  "sections": [
    {
      "name": "Nombre de la sección",
      "items": [
        {
          "name": "Nombre del producto",
          "description": "Descripción si existe, sino string vacío",
          "price_ars": 0,
          "price_usd": null,
          "tags": [],
          "allergens": []
        }
      ]
    }
  ]
}

REGLAS:
- Extraé TODOS los productos sin excepción
- price_ars: precio en pesos como número (sin símbolos). 0 si no hay precio
- price_usd: precio en dólares como número o null
- tags válidos: ["vegano","vegetariano","sin_tacc","picante","recomendado","nuevo"]
- allergens válidos: ["gluten","lactosa","frutos_secos","mariscos","huevo","soja","pescado"]
- Si no hay secciones claras, agrupar todo en "General"
- Respetar el orden original`
}

async function callClaude(text: string): Promise<ClaudeMenu> {
  if (!ANTHROPIC_KEY || ANTHROPIC_KEY.includes('REPLACE')) {
    throw new Error('Configurá VITE_ANTHROPIC_API_KEY en tu archivo .env para usar esta función.')
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8000,
      messages: [{ role: 'user', content: buildPrompt(text) }],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: { message?: string } }).error?.message ?? `Error ${res.status}`)
  }

  const json = await res.json() as { content: { type: string; text: string }[] }
  const raw = json.content.find(b => b.type === 'text')?.text ?? ''

  // Strip possible markdown fences
  const cleaned = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim()
  return JSON.parse(cleaned) as ClaudeMenu
}

// ─── Importing to Supabase ───────────────────────────────────────────────────

async function getOrCreateSection(restaurantId: string, sectionName: string): Promise<string> {
  const { data: existing } = await supabase
    .from('menu_sections')
    .select('id')
    .eq('restaurant_id', restaurantId)
    .ilike('name', sectionName.trim())
    .maybeSingle()

  if (existing?.id) return existing.id

  const { data: maxData } = await supabase
    .from('menu_sections')
    .select('sort_order')
    .eq('restaurant_id', restaurantId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data, error } = await supabase
    .from('menu_sections')
    .insert({
      restaurant_id: restaurantId,
      name: sectionName.trim(),
      name_en: null,
      description: null,
      description_en: null,
      is_active: true,
      sort_order: (maxData?.sort_order ?? -1) + 1,
    })
    .select('id')
    .single()

  if (error) throw error
  return data.id
}

// ─── Component ───────────────────────────────────────────────────────────────

interface PDFImportModalProps {
  isOpen: boolean
  onClose: () => void
  restaurantId: string
  onSuccess: () => void
}

const ANALYSIS_STAGES = [
  'Leyendo el PDF...',
  'Identificando secciones...',
  'Extrayendo productos...',
  'Analizando precios y etiquetas...',
  'Preparando la revisión...',
]

export function PDFImportModal({ isOpen, onClose, restaurantId, onSuccess }: PDFImportModalProps) {
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [progress, setProgress] = useState(0)
  const [stageIdx, setStageIdx] = useState(0)
  const [foundSections, setFoundSections] = useState<string[]>([])
  const [reviewSections, setReviewSections] = useState<ReviewSection[]>([])
  const [importCount, setImportCount] = useState(0)
  const [importDone, setImportDone] = useState(0)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep('upload')
        setFile(null)
        setProgress(0)
        setStageIdx(0)
        setFoundSections([])
        setReviewSections([])
        setErrorMsg(null)
      }, 300)
    }
  }, [isOpen])

  // ── File selection ──────────────────────────────────────────────────────────

  const acceptFile = useCallback((f: File) => {
    if (f.type !== 'application/pdf') { toast.error('Solo se aceptan archivos PDF'); return }
    if (f.size > 10 * 1024 * 1024) { toast.error('El PDF no puede superar los 10 MB'); return }
    setFile(f)
    setErrorMsg(null)
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) acceptFile(f)
  }, [acceptFile])

  // ── Analyze ─────────────────────────────────────────────────────────────────

  const startAnalysis = useCallback(async () => {
    if (!file) return
    setStep('analyzing')
    setProgress(0)
    setStageIdx(0)
    setFoundSections([])
    setErrorMsg(null)

    // Fake progress: crawls to 85% while API call is in flight
    let fakeP = 0
    progressInterval.current = setInterval(() => {
      fakeP = Math.min(fakeP + (fakeP < 60 ? 2.5 : 0.8), 85)
      setProgress(Math.round(fakeP))
      setStageIdx(Math.min(Math.floor(fakeP / 20), ANALYSIS_STAGES.length - 1))
    }, 300)

    try {
      const text = await extractPDFText(file)

      if (text.length < 50) {
        throw new Error('Este PDF parece ser una imagen escaneada. Usá un PDF con texto digital.')
      }

      const menu = await callClaude(text)

      clearInterval(progressInterval.current!)
      setProgress(100)
      setFoundSections(menu.sections.map(s => s.name))

      // Build review state
      let keyCounter = 0
      const sections: ReviewSection[] = menu.sections.map(s => ({
        name: s.name,
        collapsed: false,
        items: s.items.map(i => ({
          key: String(keyCounter++),
          name: i.name ?? '',
          description: i.description ?? '',
          price_ars: typeof i.price_ars === 'number' ? i.price_ars : 0,
          price_usd: typeof i.price_usd === 'number' ? i.price_usd : null,
          tags: Array.isArray(i.tags) ? i.tags : [],
          allergens: Array.isArray(i.allergens) ? i.allergens : [],
          selected: true,
        })),
      }))

      setTimeout(() => {
        setReviewSections(sections)
        setStep('review')
      }, 400)
    } catch (err) {
      clearInterval(progressInterval.current!)
      setErrorMsg(err instanceof Error ? err.message : 'Error al analizar la carta')
      setProgress(0)
      setStep('upload')
    }
  }, [file])

  // ── Review helpers ──────────────────────────────────────────────────────────

  const selectedCount = reviewSections.reduce(
    (sum, s) => sum + s.items.filter(i => i.selected).length, 0
  )

  const toggleItem = (sIdx: number, iIdx: number) => {
    setReviewSections(prev => prev.map((s, si) =>
      si !== sIdx ? s : {
        ...s,
        items: s.items.map((it, ii) =>
          ii !== iIdx ? it : { ...it, selected: !it.selected }
        ),
      }
    ))
  }

  const toggleSection = (sIdx: number) => {
    setReviewSections(prev => {
      const allSelected = prev[sIdx].items.every(i => i.selected)
      return prev.map((s, si) =>
        si !== sIdx ? s : {
          ...s,
          items: s.items.map(it => ({ ...it, selected: !allSelected })),
        }
      )
    })
  }

  const toggleCollapse = (sIdx: number) => {
    setReviewSections(prev => prev.map((s, si) =>
      si !== sIdx ? s : { ...s, collapsed: !s.collapsed }
    ))
  }

  const updateItem = (sIdx: number, iIdx: number, field: keyof ExtractedItem, value: unknown) => {
    setReviewSections(prev => prev.map((s, si) =>
      si !== sIdx ? s : {
        ...s,
        items: s.items.map((it, ii) =>
          ii !== iIdx ? it : { ...it, [field]: value }
        ),
      }
    ))
  }

  // ── Import ───────────────────────────────────────────────────────────────────

  const handleImport = useCallback(async () => {
    const total = selectedCount
    if (total === 0) { toast.error('Seleccioná al menos un producto'); return }

    setImportCount(total)
    setImportDone(0)
    setStep('importing')

    try {
      let done = 0
      for (const section of reviewSections) {
        const selectedItems = section.items.filter(i => i.selected)
        if (selectedItems.length === 0) continue

        const sectionId = await getOrCreateSection(restaurantId, section.name)

        // Get current max sort_order for this section
        const { data: maxData } = await supabase
          .from('menu_items')
          .select('sort_order')
          .eq('section_id', sectionId)
          .order('sort_order', { ascending: false })
          .limit(1)
          .maybeSingle()

        let sortBase = (maxData?.sort_order ?? -1) + 1

        const rows = selectedItems.map(item => ({
          restaurant_id: restaurantId,
          section_id: sectionId,
          name: item.name.trim() || 'Sin nombre',
          name_en: null,
          description: item.description.trim() || null,
          description_en: null,
          price_ars: item.price_ars,
          price_usd: item.price_usd ?? 0,
          image_url: '',
          is_available: false,
          tags: item.tags,
          allergens: item.allergens,
          sort_order: sortBase++,
        }))

        const { error } = await supabase.from('menu_items').insert(rows)
        if (error) throw error

        done += selectedItems.length
        setImportDone(done)
      }

      setStep('success')
      onSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al importar')
      setStep('review')
    }
  }, [reviewSections, selectedCount, restaurantId, onSuccess])

  // ── Render ───────────────────────────────────────────────────────────────────

  const modalSize = step === 'review' ? 'xl' : 'md'

  return (
    <Modal
      isOpen={isOpen}
      onClose={step === 'analyzing' || step === 'importing' ? () => undefined : onClose}
      title={
        step === 'upload'     ? 'Importar carta desde PDF' :
        step === 'analyzing'  ? 'Analizando tu carta...'   :
        step === 'review'     ? 'Revisá los productos detectados' :
        step === 'importing'  ? 'Importando productos...'  :
                               '¡Importación completada!'
      }
      size={modalSize}
    >
      {/* ── Step 1: Upload ── */}
      {step === 'upload' && (
        <div className="space-y-5">
          {errorMsg && (
            <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <span className="shrink-0">⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Drop zone */}
          <div
            className={cn(
              'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors',
              isDragging
                ? 'border-[#FF6B7A] bg-red-50'
                : file
                ? 'border-emerald-400 bg-emerald-50'
                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            )}
            onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) acceptFile(f) }}
            />

            {file ? (
              <div className="space-y-2">
                <FileText className="w-10 h-10 text-emerald-500 mx-auto" />
                <p className="font-semibold text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-500">
                  {(file.size / 1024).toFixed(0)} KB · Click para cambiar
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <Upload className="w-10 h-10 text-gray-400 mx-auto" />
                <div>
                  <p className="font-semibold text-gray-700">Arrastrá tu PDF aquí</p>
                  <p className="text-sm text-gray-400 mt-1">o hacé click para seleccionar</p>
                </div>
                <p className="text-xs text-gray-400">Solo PDF con texto digital · Máx. 10 MB</p>
              </div>
            )}
          </div>

          {/* Tip */}
          <div className="flex gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-700">
            <span className="text-base">💡</span>
            <span>
              Claude va a leer tu carta y crear todos los productos automáticamente.
              Podés revisar y editar todo antes de importar.
            </span>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button
              onClick={startAnalysis}
              disabled={!file}
              style={{ background: file ? 'linear-gradient(135deg,#FF6B7A,#FF8E53)' : undefined }}
              className={file ? 'text-white border-0' : ''}
            >
              Analizar carta
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 2: Analyzing ── */}
      {step === 'analyzing' && (
        <div className="py-6 space-y-6 text-center">
          <div className="text-5xl">🤖</div>
          <div>
            <p className="text-lg font-semibold text-gray-900">Analizando tu carta...</p>
            <p className="text-sm text-gray-500 mt-1">Esto puede tardar unos segundos</p>
          </div>

          {/* Progress bar */}
          <div className="max-w-xs mx-auto space-y-2">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-[#FF6B7A] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-400">{progress}%</p>
          </div>

          {/* Stage log */}
          <div className="text-left max-w-xs mx-auto space-y-1.5">
            <p className="text-sm font-medium text-gray-600">{ANALYSIS_STAGES[stageIdx]}</p>
            {foundSections.map(s => (
              <p key={s} className="text-xs text-emerald-600 flex items-center gap-1.5">
                <Check className="w-3 h-3" /> Sección: <span className="font-medium">{s}</span>
              </p>
            ))}
          </div>
        </div>
      )}

      {/* ── Step 3: Review ── */}
      {step === 'review' && (
        <div className="space-y-4 -mx-6 -mb-6">
          {/* Sticky top bar */}
          <div className="px-6 pb-2 flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-gray-500">
              {reviewSections.reduce((s, sec) => s + sec.items.length, 0)} productos detectados ·{' '}
              <button className="text-[#FF6B7A] hover:underline" onClick={() =>
                setReviewSections(prev => prev.map(s => ({
                  ...s, items: s.items.map(i => ({ ...i, selected: true }))
                })))
              }>
                Seleccionar todos
              </button>
            </p>
            <Button
              onClick={handleImport}
              disabled={selectedCount === 0}
              style={{ background: selectedCount > 0 ? 'linear-gradient(135deg,#FF6B7A,#FF8E53)' : undefined }}
              className={selectedCount > 0 ? 'text-white border-0' : ''}
            >
              Importar {selectedCount > 0 ? `${selectedCount} ` : ''}productos
            </Button>
          </div>

          {/* Sections */}
          <div className="overflow-y-auto max-h-[60vh] border-t border-gray-100">
            {reviewSections.map((section, sIdx) => {
              const allSelected = section.items.every(i => i.selected)
              const someSelected = section.items.some(i => i.selected)
              return (
                <div key={section.name + sIdx} className="border-b border-gray-100">
                  {/* Section header */}
                  <div className="flex items-center gap-2 px-6 py-2.5 bg-gray-50 sticky top-0">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={el => { if (el) el.indeterminate = !allSelected && someSelected }}
                      onChange={() => toggleSection(sIdx)}
                      className="w-4 h-4 accent-[#FF6B7A]"
                    />
                    <button
                      className="flex items-center gap-1.5 flex-1 text-left"
                      onClick={() => toggleCollapse(sIdx)}
                    >
                      {section.collapsed
                        ? <ChevronRight className="w-4 h-4 text-gray-400" />
                        : <ChevronDown className="w-4 h-4 text-gray-400" />
                      }
                      <span className="text-sm font-semibold text-gray-800">{section.name}</span>
                      <span className="text-xs text-gray-400">({section.items.length})</span>
                    </button>
                  </div>

                  {/* Items */}
                  {!section.collapsed && (
                    <div className="divide-y divide-gray-50">
                      {section.items.map((item, iIdx) => (
                        <div key={item.key} className={cn(
                          'flex items-start gap-3 px-6 py-2.5 hover:bg-gray-50 transition-colors',
                          !item.selected && 'opacity-50'
                        )}>
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={() => toggleItem(sIdx, iIdx)}
                            className="mt-1 w-4 h-4 accent-[#FF6B7A] shrink-0"
                          />

                          {/* Editable name */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <input
                              value={item.name}
                              onChange={e => updateItem(sIdx, iIdx, 'name', e.target.value)}
                              className="w-full text-sm font-medium text-gray-900 bg-transparent border-0 border-b border-transparent hover:border-gray-300 focus:border-[#FF6B7A] outline-none transition-colors py-0.5"
                              placeholder="Nombre del producto"
                            />
                            <input
                              value={item.description}
                              onChange={e => updateItem(sIdx, iIdx, 'description', e.target.value)}
                              className="w-full text-xs text-gray-400 bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-gray-300 outline-none transition-colors py-0.5"
                              placeholder="Descripción (opcional)"
                            />
                            {item.tags.length > 0 && (
                              <div className="flex gap-1 flex-wrap">
                                {item.tags.map(tag => (
                                  <span key={tag} className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Editable price */}
                          <div className="shrink-0 text-right">
                            <div className="flex items-center gap-0.5">
                              <span className="text-xs text-gray-400">$</span>
                              <input
                                type="number"
                                min="0"
                                step="100"
                                value={item.price_ars || ''}
                                onChange={e => updateItem(sIdx, iIdx, 'price_ars', parseFloat(e.target.value) || 0)}
                                className="w-20 text-sm font-semibold text-right text-gray-900 bg-transparent border-0 border-b border-transparent hover:border-gray-300 focus:border-[#FF6B7A] outline-none transition-colors"
                                placeholder="0"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Bottom bar */}
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
            <Button variant="secondary" size="sm" onClick={() => setStep('upload')}>
              ← Volver
            </Button>
            <Button
              onClick={handleImport}
              disabled={selectedCount === 0}
              style={{ background: selectedCount > 0 ? 'linear-gradient(135deg,#FF6B7A,#FF8E53)' : undefined }}
              className={selectedCount > 0 ? 'text-white border-0' : ''}
            >
              Importar {selectedCount > 0 ? `${selectedCount} ` : ''}productos
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 4: Importing ── */}
      {step === 'importing' && (
        <div className="py-10 text-center space-y-5">
          <div className="text-4xl">⏳</div>
          <div>
            <p className="text-lg font-semibold text-gray-900">Importando productos...</p>
            <p className="text-sm text-gray-500 mt-1">{importDone} / {importCount}</p>
          </div>
          <div className="max-w-xs mx-auto">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-[#FF6B7A] transition-all duration-300"
                style={{ width: importCount > 0 ? `${Math.round((importDone / importCount) * 100)}%` : '0%' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Step 5: Success ── */}
      {step === 'success' && (
        <div className="py-8 text-center space-y-5">
          <div className="text-5xl">✅</div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{importDone} productos importados</p>
            <p className="text-sm text-gray-500 mt-2">
              Todos están <span className="font-semibold text-orange-500">desactivados</span> por defecto.
              Activá los que quieras mostrar en tu menú y agregá las fotos.
            </p>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-left">
            <p className="text-sm font-semibold text-amber-800 mb-1">📸 Consejo</p>
            <p className="text-sm text-amber-700">
              Agregar fotos a tus productos puede aumentar las ventas hasta un 30%.
              ¡No te olvides de subirlas!
            </p>
          </div>

          <Button
            onClick={onClose}
            style={{ background: 'linear-gradient(135deg,#FF6B7A,#FF8E53)' }}
            className="text-white border-0 w-full"
          >
            Ver mis productos
          </Button>
        </div>
      )}
    </Modal>
  )
}
