import { useState, useEffect } from 'react'
import { Plus, ClipboardList, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useRestaurant } from '@/modules/menu/hooks/useRestaurant'
import { useFormTemplates } from '../hooks/useFormTemplates'
import { useFormFields } from '../hooks/useFormFields'
import { FormTemplateCard } from '../components/forms/FormTemplateCard'
import { FormPreview } from '../components/forms/FormPreview'
import type { FormTemplate } from '../forms/formTypes'

function CreateFormModal({
  open, onClose, onCreate,
}: { open: boolean; onClose: () => void; onCreate: (name: string, description: string) => Promise<void> }) {
  const [name,        setName]        = useState('')
  const [description, setDescription] = useState('')
  const [saving,      setSaving]      = useState(false)

  useEffect(() => { if (open) { setName(''); setDescription('') } }, [open])

  if (!open) return null

  const handleCreate = async () => {
    if (!name.trim()) return
    setSaving(true)
    await onCreate(name.trim(), description.trim())
    setSaving(false)
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl lg:inset-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-[400px] lg:rounded-3xl"
        style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex justify-center pt-3 pb-1 lg:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
        </div>
        <div className="px-5 pt-2 pb-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-white">Nuevo formulario</h2>
            <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.4)' }}>
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Nombre <span style={{ color: '#F4705A' }}>*</span>
              </label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                autoFocus
                placeholder="Ej: Ficha de cliente, Historia clínica..."
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none placeholder:text-white/25"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Descripción (opcional)
              </label>
              <input
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Para qué sirve este formulario..."
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none placeholder:text-white/25"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={!name.trim() || saving}
              className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-50 transition-opacity"
              style={{ background: '#F4705A', color: '#fff' }}
            >
              {saving ? 'Creando...' : 'Crear y abrir constructor'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export function ServicesFormsPage() {
  const { restaurant }   = useRestaurant()
  const navigate         = useNavigate()
  const templateHook     = useFormTemplates(restaurant?.id)
  const fieldsHook       = useFormFields(restaurant?.id)

  const [showCreate,   setShowCreate]   = useState(false)
  const [previewTpl,   setPreviewTpl]   = useState<FormTemplate | null>(null)
  const [previewFields, setPreviewFields] = useState<ReturnType<typeof fieldsHook.fields.slice>>([])

  useEffect(() => {
    templateHook.fetch()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant?.id])

  const handleCreate = async (name: string, description: string) => {
    const tpl = await templateHook.create({ name, description: description || null })
    if (tpl) {
      setShowCreate(false)
      navigate(`/dashboard/services/forms/${tpl.id}/builder`)
    }
  }

  const handlePreview = async (template: FormTemplate) => {
    setPreviewTpl(template)
    await fieldsHook.fetchByTemplate(template.id)
    setPreviewFields([...fieldsHook.fields])
  }

  // After fetch, sync preview fields
  useEffect(() => {
    if (previewTpl) setPreviewFields([...fieldsHook.fields])
  }, [fieldsHook.fields, previewTpl])

  return (
    <div className="max-w-2xl mx-auto pb-16">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-white">Formularios</h1>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Fichas, registros, encuestas y cualquier estructura de información
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
          style={{ background: '#F4705A', color: '#fff' }}
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nuevo</span>
        </button>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Activos',     value: String(templateHook.templates.filter(t => t.status === 'active').length || '—') },
          { label: 'Borradores',  value: String(templateHook.templates.filter(t => t.status === 'draft').length  || '—') },
          { label: 'Respuestas',  value: '—' },
        ].map(m => (
          <div
            key={m.label}
            className="rounded-2xl p-4"
            style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <p className="text-lg font-bold text-white mb-0.5">{m.value}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {m.label}
            </p>
          </div>
        ))}
      </div>

      {/* List */}
      {templateHook.loading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 rounded-full animate-spin"
            style={{ borderColor: 'rgba(255,255,255,0.08)', borderTopColor: '#F4705A' }} />
        </div>
      ) : templateHook.templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div
            className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4"
            style={{ background: 'rgba(244,112,90,0.08)', border: '1px solid rgba(244,112,90,0.15)' }}
          >
            <ClipboardList className="w-7 h-7" style={{ color: 'rgba(244,112,90,0.5)' }} />
          </div>
          <p className="text-sm font-semibold text-white mb-1">Sin formularios creados</p>
          <p className="text-xs mb-5 max-w-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Creá fichas, historias clínicas, encuestas, briefs o cualquier estructura de información para tus clientes.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: '#F4705A', color: '#fff' }}
          >
            Crear primer formulario
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {templateHook.templates.map(t => (
            <FormTemplateCard
              key={t.id}
              template={t}
              onArchive={id => templateHook.archive(id)}
              onPreview={handlePreview}
            />
          ))}
        </div>
      )}

      <CreateFormModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
      />

      {previewTpl && (
        <FormPreview
          open={!!previewTpl}
          onClose={() => setPreviewTpl(null)}
          template={previewTpl}
          fields={previewFields}
        />
      )}
    </div>
  )
}
