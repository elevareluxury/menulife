import { useState } from 'react'
import { X, FileText } from 'lucide-react'
import { validateBlockConfig } from '@/modules/hub/lib/blocksConfig'

const ACC = '#F4705A'
const MAX_CHARS = 1000

interface BioBlockEditModalProps {
  config: { content?: string; format?: 'html' | 'markdown' }
  onSave: (config: Record<string, any>) => Promise<void>
  onClose: () => void
}

export function BioBlockEditModal({ config, onSave, onClose }: BioBlockEditModalProps) {
  const [content, setContent] = useState(config.content ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const remaining = MAX_CHARS - content.length
  const isOverLimit = remaining < 0

  // Formato simple: el textarea guarda texto plano que se convierte a párrafos HTML
  async function handleSave() {
    // Convertir saltos de línea a párrafos <p>
    const htmlContent = content
      .split('\n\n')
      .filter(p => p.trim())
      .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
      .join('')

    const newConfig = { content: htmlContent || content, format: 'html' as const }
    const validation = validateBlockConfig('bio', newConfig)
    if (!validation.success) {
      setError(validation.error ?? 'Contenido inválido')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave(validation.data)
      onClose()
    } catch {
      setError('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  // Extrae texto plano del HTML guardado para editar en el textarea
  function htmlToText(html: string): string {
    if (!html.includes('<')) return html
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>\s*<p>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .trim()
  }

  const [rawText] = useState(() => htmlToText(config.content ?? ''))

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div style={{
        width: '100%', maxWidth: 500,
        background: '#161A24', borderRadius: '24px 24px 0 0',
        border: '1px solid rgba(255,255,255,0.08)',
        padding: 24,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'rgba(244,112,90,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <FileText size={18} color={ACC} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ color: '#fff', fontWeight: 700, fontSize: 16, margin: 0 }}>Bio Extendida</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: 0 }}>
              Contá tu historia en detalle
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Textarea */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            Texto
          </label>
          <textarea
            style={{
              width: '100%', boxSizing: 'border-box',
              borderRadius: 12, padding: '12px',
              fontSize: 14, color: '#fff',
              background: '#0F1115',
              border: `1px solid ${isOverLimit ? '#EF4444' : 'rgba(255,255,255,0.08)'}`,
              outline: 'none', resize: 'vertical',
              minHeight: 140, lineHeight: 1.6,
              fontFamily: "'DM Sans',sans-serif",
            }}
            placeholder="Contá quién sos, qué hacés y qué te hace especial…

Usá párrafos separados por una línea en blanco."
            value={content || rawText}
            onChange={e => { setContent(e.target.value); setError(null) }}
            maxLength={MAX_CHARS + 50}
          />
          <p style={{
            fontSize: 12, textAlign: 'right', margin: '4px 0 0',
            color: isOverLimit ? '#EF4444' : 'rgba(255,255,255,0.3)',
          }}>
            {Math.max(0, MAX_CHARS - content.length)} / {MAX_CHARS}
          </p>
        </div>

        {error && (
          <p style={{ color: '#EF4444', fontSize: 13, marginBottom: 16 }}>{error}</p>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '12px', borderRadius: 14,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !content.trim() || isOverLimit}
            style={{
              flex: 2, padding: '12px', borderRadius: 14,
              background: ACC, border: 'none',
              color: '#fff', fontSize: 14, fontWeight: 700, cursor: saving ? 'wait' : 'pointer',
              opacity: saving || !content.trim() || isOverLimit ? 0.6 : 1,
            }}
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
