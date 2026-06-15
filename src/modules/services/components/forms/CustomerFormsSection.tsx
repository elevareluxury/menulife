import { useState, useEffect } from 'react'
import { Plus, CheckCircle2, X, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useFormSubmissions } from '../../hooks/useFormSubmissions'
import { useFormTemplates } from '../../hooks/useFormTemplates'
import { useFormFields } from '../../hooks/useFormFields'
import { FormRenderer } from './FormRenderer'
import type { FormSubmission, FormField } from '../../forms/formTypes'
import { formatFieldValue } from '../../forms/formUtils'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

interface CustomerFormsSectionProps {
  customerId:   string
  restaurantId: string
}

function SubmissionViewer({
  submission, onClose,
}: { submission: FormSubmission; restaurantId: string; onClose: () => void }) {
  const [fields, setFields] = useState<FormField[]>([])

  useEffect(() => {
    db.from('service_form_fields')
      .select('*')
      .eq('template_id', submission.template_id)
      .order('sort_order')
      .then(({ data }: { data: FormField[] | null }) => setFields(data ?? []))
  }, [submission.template_id])

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl lg:inset-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-[480px] lg:rounded-3xl"
        style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.08)', maxHeight: '88dvh', overflowY: 'auto' }}
      >
        <div className="flex justify-center pt-3 pb-1 lg:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
        </div>
        <div className="px-5 pt-3 pb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">{submission.template?.name ?? 'Formulario'}</h3>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
                  .format(new Date(submission.submitted_at))}
              </p>
            </div>
            <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.4)' }}>
              <X className="w-5 h-5" />
            </button>
          </div>
          <div
            className="space-y-4 pt-4"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
          >
            {fields.length === 0 ? (
              <p className="text-xs text-center py-6" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Cargando respuestas...
              </p>
            ) : (
              fields.map(f => {
                const raw = submission.data_json[f.id]
                return (
                  <div key={f.id}>
                    <p className="text-[11px] font-semibold mb-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                      {f.label}
                    </p>
                    <p className="text-sm text-white">{formatFieldValue(f, raw)}</p>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function CreateSubmissionDrawer({
  open, onClose, onCreated, customerId, restaurantId,
}: {
  open: boolean; onClose: () => void; onCreated: () => void
  customerId: string; restaurantId: string
}) {
  const [step,       setStep]       = useState<'select' | 'fill'>('select')
  const [templateId, setTemplateId] = useState('')
  const [values,     setValues]     = useState<Record<string, unknown>>({})
  const [saving,     setSaving]     = useState(false)

  const templateHook = useFormTemplates(restaurantId)
  const fieldsHook   = useFormFields(restaurantId)
  const submitHook   = useFormSubmissions(restaurantId)

  useEffect(() => {
    if (open) { templateHook.fetch(); setStep('select'); setTemplateId(''); setValues({}) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (templateId) fieldsHook.fetchByTemplate(templateId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId])

  if (!open) return null

  const activeTemplates  = templateHook.templates.filter(t => t.status === 'active')
  const selectedTemplate = templateHook.templates.find(t => t.id === templateId)

  const handleSubmit = async () => {
    if (!templateId) return
    setSaving(true)
    await submitHook.submit({
      template_id:   templateId,
      customer_id:   customerId,
      data_json:     values,
      template_name: selectedTemplate?.name ?? null,
    })
    setSaving(false)
    onCreated()
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl lg:inset-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-[480px] lg:rounded-3xl"
        style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.08)', maxHeight: '92dvh', overflowY: 'auto' }}
      >
        <div className="flex justify-center pt-3 pb-1 lg:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
        </div>
        <div className="px-5 pt-2 pb-8">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              {step === 'fill' && (
                <button
                  onClick={() => setStep('select')}
                  className="text-xs font-semibold"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                >
                  ←
                </button>
              )}
              <h2 className="text-base font-bold text-white">
                {step === 'select' ? 'Completar formulario' : selectedTemplate?.name ?? 'Formulario'}
              </h2>
            </div>
            <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.4)' }}>
              <X className="w-5 h-5" />
            </button>
          </div>

          {step === 'select' ? (
            activeTemplates.length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: 'rgba(255,255,255,0.4)' }}>
                No hay formularios activos. Activá un formulario desde la sección Formularios.
              </p>
            ) : (
              <div className="space-y-2">
                {activeTemplates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { setTemplateId(t.id); setValues({}); setStep('fill') }}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-left hover:opacity-90 transition-opacity"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">{t.name}</p>
                      {t.description && (
                        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{t.description}</p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.25)' }} />
                  </button>
                ))}
              </div>
            )
          ) : (
            <div className="space-y-5">
              <FormRenderer
                fields={fieldsHook.fields}
                values={values}
                onChange={(id, val) => setValues(prev => ({ ...prev, [id]: val }))}
              />
              <button
                onClick={handleSubmit}
                disabled={saving || fieldsHook.fields.length === 0}
                className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                style={{ background: '#F4705A', color: '#fff' }}
              >
                {saving ? 'Guardando...' : 'Guardar respuestas'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export function CustomerFormsSection({ customerId, restaurantId }: CustomerFormsSectionProps) {
  const submissionsHook = useFormSubmissions(restaurantId)
  const [showCreate,   setShowCreate]   = useState(false)
  const [viewSub,      setViewSub]      = useState<FormSubmission | null>(null)

  useEffect(() => {
    submissionsHook.fetchByCustomer(customerId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, restaurantId])

  const handleCreated = () => {
    setShowCreate(false)
    submissionsHook.fetchByCustomer(customerId)
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-white">Formularios</h2>
          {submissionsHook.submissions.length > 0 && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(59,130,246,0.12)', color: '#3B82F6' }}
            >
              {submissionsHook.submissions.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
          style={{ background: '#F4705A', color: '#fff' }}
        >
          <Plus className="w-3.5 h-3.5" />
          Completar
        </button>
      </div>

      <div className="p-4 space-y-2">
        {submissionsHook.loading ? (
          <div className="flex justify-center py-8">
            <div
              className="w-5 h-5 border-2 rounded-full animate-spin"
              style={{ borderColor: 'rgba(255,255,255,0.08)', borderTopColor: '#F4705A' }}
            />
          </div>
        ) : submissionsHook.submissions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Sin formularios completados</p>
            <button
              onClick={() => setShowCreate(true)}
              className="text-xs font-semibold mt-2"
              style={{ color: '#F4705A' }}
            >
              + Completar formulario
            </button>
          </div>
        ) : (
          submissionsHook.submissions.map(sub => (
            <button
              key={sub.id}
              onClick={() => setViewSub(sub)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:opacity-80 transition-opacity"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: '#22C55E' }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">
                  {sub.template?.name ?? 'Formulario'}
                </p>
                <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Completado ·{' '}
                  {new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
                    .format(new Date(sub.submitted_at))}
                </p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.2)' }} />
            </button>
          ))
        )}
      </div>

      <CreateSubmissionDrawer
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleCreated}
        customerId={customerId}
        restaurantId={restaurantId}
      />

      {viewSub && (
        <SubmissionViewer
          submission={viewSub}
          restaurantId={restaurantId}
          onClose={() => setViewSub(null)}
        />
      )}
    </div>
  )
}
