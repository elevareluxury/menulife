import { useState, useMemo } from 'react'
import { X, Video } from 'lucide-react'
import { validateBlockConfig } from '@/modules/hub/lib/blocksConfig'

const ACC = '#F4705A'
const inputCls = 'w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 bg-[#0F1115] border border-gray-800 focus:outline-none focus:border-[#F4705A] transition-all'

function detectPlatform(url: string): string | null {
  if (!url) return null
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YouTube'
  if (url.includes('vimeo.com')) return 'Vimeo'
  if (url.includes('tiktok.com')) return 'TikTok'
  if (url.includes('instagram.com')) return 'Instagram'
  return null
}

interface VideoBlockEditModalProps {
  config: { url?: string; title?: string; autoplay?: boolean }
  onSave: (config: Record<string, any>) => Promise<void>
  onClose: () => void
}

export function VideoBlockEditModal({ config, onSave, onClose }: VideoBlockEditModalProps) {
  const [url, setUrl] = useState(config.url ?? '')
  const [title, setTitle] = useState(config.title ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const platform = useMemo(() => detectPlatform(url), [url])

  async function handleSave() {
    const newConfig = { url: url.trim(), title: title.trim() || undefined }
    const validation = validateBlockConfig('video', newConfig)
    if (!validation.success) {
      setError(validation.error ?? 'Configuración inválida')
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
            <Video size={18} color={ACC} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ color: '#fff', fontWeight: 700, fontSize: 16, margin: 0 }}>Video</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: 0 }}>
              YouTube · Vimeo · TikTok · Instagram
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}>
            <X size={20} />
          </button>
        </div>

        {/* URL */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            URL del video
          </label>
          <input
            className={inputCls}
            type="url"
            placeholder="https://www.youtube.com/watch?v=..."
            value={url}
            onChange={e => { setUrl(e.target.value); setError(null) }}
          />
          {platform && (
            <p style={{ fontSize: 12, color: ACC, marginTop: 4, marginLeft: 4 }}>
              ✓ {platform} detectado
            </p>
          )}
        </div>

        {/* Título opcional */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            Título (opcional)
          </label>
          <input
            className={inputCls}
            type="text"
            placeholder="Ej: Mirá cómo trabajamos"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={120}
          />
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
            disabled={saving || !url.trim()}
            style={{
              flex: 2, padding: '12px', borderRadius: 14,
              background: ACC, border: 'none',
              color: '#fff', fontSize: 14, fontWeight: 700, cursor: saving ? 'wait' : 'pointer',
              opacity: saving || !url.trim() ? 0.6 : 1,
            }}
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
