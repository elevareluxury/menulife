import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Upload, FileUp, Loader2 } from 'lucide-react'
import { useDocumentCategories } from '../../hooks/useDocumentCategories'
import type { UploadDocumentInput } from '../../hooks/useDocuments'

interface UploadDocumentDrawerProps {
  open:         boolean
  restaurantId: string
  customerId?:  string
  onClose:      () => void
  onUploaded:   () => void
  onUpload:     (input: UploadDocumentInput) => Promise<unknown>
  uploading:    boolean
}

const MAX_BYTES = 52_428_800
const EASE      = [0.4, 0, 0.2, 1] as const

export function UploadDocumentDrawer({
  open, restaurantId, customerId, onClose, onUploaded, onUpload, uploading,
}: UploadDocumentDrawerProps) {
  const [file,           setFile]           = useState<File | null>(null)
  const [title,          setTitle]          = useState('')
  const [description,    setDescription]    = useState('')
  const [categoryId,     setCategoryId]     = useState('')
  const [expirationDate, setExpirationDate] = useState('')
  const [dragOver,       setDragOver]       = useState(false)
  const [sizeError,      setSizeError]      = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const catHook = useDocumentCategories(restaurantId)

  useEffect(() => {
    if (open) {
      catHook.fetchOrSeed()
      setFile(null); setTitle(''); setDescription('')
      setCategoryId(''); setExpirationDate(''); setSizeError('')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const pickFile = (f: File) => {
    if (f.size > MAX_BYTES) { setSizeError('El archivo supera el límite de 50 MB'); return }
    setSizeError('')
    setFile(f)
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''))
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) pickFile(f)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title])

  const handleSubmit = async () => {
    if (!file || !title.trim()) return
    const result = await onUpload({
      file,
      title:          title.trim(),
      description:    description.trim() || undefined,
      categoryId:     categoryId || null,
      customerId:     customerId ?? null,
      expirationDate: expirationDate || null,
    })
    if (result) onUploaded()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{    opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/60"
            onClick={onClose}
          />

          {/* Sheet — mobile: slides from bottom; desktop: centered modal */}
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{    y: '100%' }}
            transition={{ duration: 0.28, ease: EASE }}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl lg:inset-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-[480px] lg:rounded-3xl"
            style={{
              background:  '#13161C',
              border:      '1px solid rgba(255,255,255,0.08)',
              maxHeight:   '92dvh',
              overflowY:   'auto',
            }}
          >
            {/* Handle — mobile only */}
            <div className="flex justify-center pt-3 pb-1 lg:hidden">
              <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
            </div>

            <div className="px-5 pt-2 pb-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-bold text-white">Subir documento</h2>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              {/* Drop zone */}
              <motion.div
                animate={{
                  borderColor: dragOver ? '#F4705A' : 'rgba(255,255,255,0.1)',
                  background:  dragOver ? 'rgba(244,112,90,0.06)' : 'rgba(255,255,255,0.02)',
                }}
                transition={{ duration: 0.15 }}
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                className="rounded-2xl border-2 border-dashed flex flex-col items-center justify-center py-8 cursor-pointer mb-4 select-none"
              >
                <AnimatePresence mode="wait">
                  {file ? (
                    <motion.div
                      key="file"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1   }}
                      exit={{    opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.18 }}
                      className="flex flex-col items-center"
                    >
                      <FileUp className="w-8 h-8 mb-2" style={{ color: '#F4705A' }} />
                      <p className="text-sm font-semibold text-white text-center px-4 truncate max-w-[280px]">
                        {file.name}
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        {(file.size / 1024).toFixed(0)} KB · Toca para cambiar
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{    opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="flex flex-col items-center"
                    >
                      <Upload className="w-8 h-8 mb-2" style={{ color: 'rgba(255,255,255,0.3)' }} />
                      <p className="text-sm font-semibold text-white mb-1">Arrastrá o seleccioná un archivo</p>
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        PDF, imagen, Word, Excel, CSV, ZIP · máx. 50 MB
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              <AnimatePresence>
                {sizeError && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{    opacity: 0, height: 0     }}
                    className="text-xs mb-3 text-center"
                    style={{ color: '#EF4444' }}
                  >
                    {sizeError}
                  </motion.p>
                )}
              </AnimatePresence>

              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx,.csv,.txt,.zip"
                onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(f) }}
              />

              {/* Fields */}
              <div className="space-y-3">
                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Nombre del documento *
                  </label>
                  <input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Ej. Contrato de membresía"
                    className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/25 outline-none"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border:     '1px solid rgba(255,255,255,0.08)',
                    }}
                  />
                </div>

                {/* Category */}
                {catHook.categories.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      Categoría
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[{ id: '', name: 'Sin categoría', color: '#6B7280' }, ...catHook.categories].map(cat => {
                        const selected = categoryId === cat.id
                        return (
                          <motion.button
                            key={cat.id}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setCategoryId(cat.id)}
                            className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                            style={{
                              background:  selected ? cat.color        : `${cat.color}15`,
                              color:       selected ? '#fff'           : cat.color,
                              border:      '1px solid',
                              borderColor: selected ? cat.color        : `${cat.color}30`,
                            }}
                          >
                            {cat.name}
                          </motion.button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Expiration date */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Fecha de vencimiento <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>(opcional)</span>
                  </label>
                  <input
                    type="date"
                    value={expirationDate}
                    onChange={e => setExpirationDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                    style={{
                      background:  'rgba(255,255,255,0.05)',
                      border:      '1px solid rgba(255,255,255,0.08)',
                      colorScheme: 'dark',
                    } as React.CSSProperties}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Descripción <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>(opcional)</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Notas internas sobre este documento"
                    rows={2}
                    className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/25 outline-none resize-none"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border:     '1px solid rgba(255,255,255,0.08)',
                    }}
                  />
                </div>
              </div>

              {/* CTA */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={uploading || !file || !title.trim()}
                className="w-full mt-5 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: '#F4705A', color: '#fff' }}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  'Guardar documento'
                )}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
