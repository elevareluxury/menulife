import { useState } from 'react'
import { X, Mail } from 'lucide-react'
import { validateBlockConfig } from '@/modules/hub/lib/blocksConfig'

const ACC = '#F4705A'
const inputCls = 'w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 bg-[#0F1115] border border-gray-800 focus:outline-none focus:border-[#F4705A] transition-all'

interface ContactFormBlockEditModalProps {
  config: {
    title?: string
    showPhoneField?: boolean
    emailNotifications?: boolean
  }
  onSave:  (config: Record<string, any>) => Promise<void>
  onClose: () => void
}

export function ContactFormBlockEditModal({ config, onSave, onClose }: ContactFormBlockEditModalProps) {
  const [title, setTitle]           = useState(config.title           ?? 'Contáctame')
  const [showPhone, setShowPhone]   = useState(config.showPhoneField  ?? false)
  const [emailNotif, setEmailNotif] = useState(config.emailNotifications ?? true)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState<string | null>(null)

  async function handleSave() {
    const newConfig = {
      title:              title.trim() || 'Contáctame',
      showPhoneField:     showPhone,
      emailNotifications: emailNotif,
    }
    const validation = validateBlockConfig('contact_form', newConfig)
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
            <Mail size={18} color={ACC} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ color: '#fff', fontWeight: 700, fontSize: 16, margin: 0 }}>
              Formulario de Contacto
            </p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: 0 }}>
              Los mensajes llegan a tu email
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Título */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            Título de la sección
          </label>
          <input
            className={inputCls}
            type="text"
            placeholder="Contáctame"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={80}
          />
        </div>

        {/* Toggles */}
        <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <ToggleRow
            label="Mostrar campo de teléfono"
            description="Agrega un campo opcional de teléfono al formulario"
            checked={showPhone}
            onChange={setShowPhone}
          />
          <ToggleRow
            label="Notificaciones por email"
            description="Recibís un email cuando alguien completa el formulario"
            checked={emailNotif}
            onChange={setEmailNotif}
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
            disabled={saving}
            style={{
              flex: 2, padding: '12px', borderRadius: 14,
              background: ACC, border: 'none',
              color: '#fff', fontSize: 14, fontWeight: 700, cursor: saving ? 'wait' : 'pointer',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ToggleRow({
  label, description, checked, onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '12px 14px', borderRadius: 14,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        cursor: 'pointer',
      }}
    >
      <div style={{ flex: 1 }}>
        <p style={{ color: '#fff', fontSize: 14, fontWeight: 600, margin: 0 }}>{label}</p>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, margin: '2px 0 0' }}>{description}</p>
      </div>
      <div style={{
        width: 44, height: 24, borderRadius: 12,
        background: checked ? ACC : 'rgba(255,255,255,0.1)',
        position: 'relative', flexShrink: 0,
        transition: 'background 0.2s',
      }}>
        <div style={{
          position: 'absolute', top: 3,
          left: checked ? 23 : 3,
          width: 18, height: 18, borderRadius: '50%',
          background: '#fff',
          transition: 'left 0.2s',
        }}/>
      </div>
    </div>
  )
}
