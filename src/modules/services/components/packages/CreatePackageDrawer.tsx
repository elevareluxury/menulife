import { useState } from 'react'
import { X, Calendar } from 'lucide-react'
import type { PackageTemplate } from '../../packages/packageTypes'
import { computeExpiresAt } from '../../packages/packageUtils'

interface CreatePackageDrawerProps {
  open:        boolean
  onClose:     () => void
  onCreated:   () => void
  templates:   PackageTemplate[]
  customerId:  string
  onCreate:    (input: {
    customer_id: string
    template_id: string
    starts_at:   string
    expires_at?: string | null
    notes?:      string | null
  }) => Promise<unknown>
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export function CreatePackageDrawer({
  open, onClose, onCreated, templates, customerId, onCreate,
}: CreatePackageDrawerProps) {
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '')
  const [startsAt,   setStartsAt]   = useState(todayStr())
  const [notes,      setNotes]      = useState('')
  const [saving,     setSaving]     = useState(false)

  if (!open) return null

  const activeTemplates  = templates.filter(t => t.status === 'active')
  const selectedTemplate = templates.find(t => t.id === templateId)
  const expiresAt        = selectedTemplate?.validity_days
    ? computeExpiresAt(new Date(startsAt), selectedTemplate.validity_days)?.toISOString() ?? null
    : null

  const handleSave = async () => {
    if (!templateId || !startsAt) return
    setSaving(true)
    await onCreate({
      customer_id: customerId,
      template_id: templateId,
      starts_at:   new Date(startsAt).toISOString(),
      expires_at:  expiresAt,
      notes:       notes.trim() || null,
    })
    setSaving(false)
    onCreated()
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl lg:inset-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-[440px] lg:rounded-3xl"
        style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.08)', maxHeight: '92dvh', overflowY: 'auto' }}
      >
        <div className="flex justify-center pt-3 pb-1 lg:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
        </div>

        <div className="px-5 pt-2 pb-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-white">Asignar paquete</h2>
            <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.4)' }}>
              <X className="w-5 h-5" />
            </button>
          </div>

          {activeTemplates.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'rgba(255,255,255,0.4)' }}>
              No hay plantillas activas. Creá una desde la sección Paquetes.
            </p>
          ) : (
            <div className="space-y-4">
              {/* Template selector */}
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>Paquete</label>
                <div className="space-y-2">
                  {activeTemplates.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTemplateId(t.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                      style={{
                        background: templateId === t.id ? `${t.color ?? '#F4705A'}15` : 'rgba(255,255,255,0.04)',
                        border:     `1px solid ${templateId === t.id ? (t.color ?? '#F4705A') + '50' : 'rgba(255,255,255,0.08)'}`,
                      }}
                    >
                      <span className="text-base">{t.icon ?? '📦'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white">{t.name}</p>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          {t.currency} {t.price.toLocaleString('es-AR')}
                          {t.validity_days ? ` · ${t.validity_days}d de vigencia` : ''}
                        </p>
                      </div>
                      <div
                        className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                        style={{ borderColor: templateId === t.id ? (t.color ?? '#F4705A') : 'rgba(255,255,255,0.2)' }}
                      >
                        {templateId === t.id && (
                          <div className="w-2 h-2 rounded-full" style={{ background: t.color ?? '#F4705A' }} />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Start date */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Fecha de inicio
                </label>
                <input
                  type="date"
                  value={startsAt}
                  onChange={e => setStartsAt(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                />
                {expiresAt && (
                  <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    <Calendar className="w-3 h-3" />
                    Vence:{' '}
                    {new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
                      .format(new Date(expiresAt))}
                  </p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Notas (opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Observaciones internas..."
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none resize-none placeholder:text-white/25"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                />
              </div>

              <button
                onClick={handleSave}
                disabled={!templateId || saving}
                className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                style={{ background: '#F4705A', color: '#fff' }}
              >
                {saving ? 'Guardando...' : 'Asignar paquete'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
