import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Eye, Layers } from 'lucide-react'
import { useRestaurant } from '@/modules/menu/hooks/useRestaurant'
import { useFormTemplates } from '../hooks/useFormTemplates'
import { useFormFields } from '../hooks/useFormFields'
import { FieldTypePalette } from '../components/forms/FieldTypePalette'
import { BuilderFieldItem } from '../components/forms/BuilderFieldItem'
import { FieldConfigPanel } from '../components/forms/FieldConfigPanel'
import { FormPreview } from '../components/forms/FormPreview'
import type { FormTemplate, FieldType } from '../forms/formTypes'
import { FIELD_TYPE_CONFIG, FORM_STATUS_CONFIG } from '../forms/formTypes'

type MobileTab = 'palette' | 'canvas' | 'config'

export function FormBuilderPage() {
  const { id }         = useParams<{ id: string }>()
  const navigate       = useNavigate()
  const { restaurant } = useRestaurant()

  const templateHook = useFormTemplates(restaurant?.id)
  const fieldsHook   = useFormFields(restaurant?.id)

  const [template,       setTemplate]       = useState<FormTemplate | null>(null)
  const [loading,        setLoading]        = useState(true)
  const [nameEdit,       setNameEdit]       = useState('')
  const [editingName,    setEditingName]    = useState(false)
  const [selectedFieldId,setSelectedFieldId]= useState<string | null>(null)
  const [showPreview,    setShowPreview]    = useState(false)
  const [mobileTab,      setMobileTab]      = useState<MobileTab>('canvas')

  useEffect(() => {
    if (!id || !restaurant?.id) return
    setLoading(true)
    templateHook.fetchOne(id).then(data => {
      setTemplate(data)
      setNameEdit(data?.name ?? '')
      setLoading(false)
    })
    fieldsHook.fetchByTemplate(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, restaurant?.id])

  const selectedField = fieldsHook.fields.find(f => f.id === selectedFieldId) ?? null

  const handleAddField = async (type: FieldType) => {
    if (!id || !restaurant?.id) return
    const cfg      = FIELD_TYPE_CONFIG[type]
    const newField = await fieldsHook.create({
      template_id:            id,
      restaurant_id:          restaurant.id,
      type,
      label:                  cfg.label,
      placeholder:            null,
      help_text:              null,
      required:               false,
      sort_order:             fieldsHook.fields.length,
      settings_json:          cfg.defaultSettings,
      field_visibility_rules: {},
    })
    if (newField) { setSelectedFieldId(newField.id); setMobileTab('config') }
  }

  const handleMoveUp = (fieldId: string) => {
    const idx = fieldsHook.fields.findIndex(f => f.id === fieldId)
    if (idx <= 0) return
    const reordered = [...fieldsHook.fields]
    ;[reordered[idx - 1], reordered[idx]] = [reordered[idx], reordered[idx - 1]]
    fieldsHook.reorder(reordered)
  }

  const handleMoveDown = (fieldId: string) => {
    const idx = fieldsHook.fields.findIndex(f => f.id === fieldId)
    if (idx >= fieldsHook.fields.length - 1) return
    const reordered = [...fieldsHook.fields]
    ;[reordered[idx], reordered[idx + 1]] = [reordered[idx + 1], reordered[idx]]
    fieldsHook.reorder(reordered)
  }

  const handleSaveName = () => {
    if (!template || nameEdit.trim() === template.name) { setEditingName(false); return }
    const trimmed = nameEdit.trim() || template.name
    templateHook.update(template.id, { name: trimmed })
    setTemplate(prev => prev ? { ...prev, name: trimmed } : prev)
    setEditingName(false)
  }

  const cycleStatus = () => {
    if (!template) return
    const next = template.status === 'draft' ? 'active' : template.status === 'active' ? 'archived' : 'draft'
    templateHook.update(template.id, { status: next })
    setTemplate(prev => prev ? { ...prev, status: next } : prev)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 rounded-full animate-spin"
          style={{ borderColor: 'rgba(255,255,255,0.08)', borderTopColor: '#F4705A' }} />
      </div>
    )
  }

  if (!template) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm font-semibold text-white mb-2">Formulario no encontrado</p>
        <button onClick={() => navigate('/dashboard/services/forms')}
          className="text-sm font-semibold" style={{ color: '#F4705A' }}>← Volver</button>
      </div>
    )
  }

  const statusCfg = FORM_STATUS_CONFIG[template.status]

  const panelBorder = '1px solid rgba(255,255,255,0.06)'

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 0px)' }}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: panelBorder, background: '#0F1115' }}
      >
        <button
          onClick={() => navigate('/dashboard/services/forms')}
          className="p-2 rounded-xl hover:bg-white/6 transition-colors flex-shrink-0"
          style={{ color: 'rgba(255,255,255,0.4)' }}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Editable name */}
        {editingName ? (
          <input
            value={nameEdit}
            onChange={e => setNameEdit(e.target.value)}
            onBlur={handleSaveName}
            onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false) }}
            autoFocus
            className="flex-1 bg-transparent text-sm font-bold text-white outline-none border-b"
            style={{ borderColor: '#F4705A' }}
          />
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className="flex-1 text-left text-sm font-bold text-white hover:opacity-70 transition-opacity truncate"
          >
            {template.name}
          </button>
        )}

        {/* Status */}
        <button
          onClick={cycleStatus}
          className="text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 transition-colors"
          style={{ background: statusCfg.bg, color: statusCfg.color }}
          title="Clic para cambiar estado"
        >
          {statusCfg.label}
        </button>

        {/* Preview */}
        <button
          onClick={() => setShowPreview(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold flex-shrink-0 hover:opacity-90 transition-opacity"
          style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)' }}
        >
          <Eye className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Vista previa</span>
        </button>
      </div>

      {/* ── Mobile tab bar ──────────────────────────────────────────── */}
      <div
        className="flex lg:hidden border-b flex-shrink-0"
        style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#0F1115' }}
      >
        {(['palette', 'canvas', 'config'] as MobileTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setMobileTab(tab)}
            className="flex-1 py-2.5 text-xs font-semibold transition-colors"
            style={{
              color:       mobileTab === tab ? '#F4705A' : 'rgba(255,255,255,0.4)',
              borderBottom: mobileTab === tab ? '2px solid #F4705A' : '2px solid transparent',
            }}
          >
            {tab === 'palette' ? 'Campos' : tab === 'canvas' ? 'Constructor' : 'Configurar'}
          </button>
        ))}
      </div>

      {/* ── 3-col layout ────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left — Field type palette */}
        <div
          className={`flex-shrink-0 overflow-y-auto ${mobileTab === 'palette' ? 'flex' : 'hidden'} lg:flex flex-col`}
          style={{ width: '200px', borderRight: panelBorder, background: '#0F1115' }}
        >
          <p
            className="text-[10px] font-bold uppercase tracking-wider px-4 pt-4 pb-2"
            style={{ color: 'rgba(255,255,255,0.25)' }}
          >
            Tipos de campo
          </p>
          <FieldTypePalette onAdd={type => { handleAddField(type); setMobileTab('canvas') }} />
        </div>

        {/* Center — Canvas */}
        <div
          className={`flex-1 overflow-y-auto ${mobileTab === 'canvas' ? 'flex' : 'hidden'} lg:flex flex-col`}
          style={{ background: '#0A0C10' }}
        >
          <div className="p-4 space-y-2 max-w-xl mx-auto w-full">
            {/* Canvas header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
                <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {fieldsHook.fields.length} campo{fieldsHook.fields.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {fieldsHook.loading ? (
              <div className="flex justify-center py-16">
                <div className="w-5 h-5 border-2 rounded-full animate-spin"
                  style={{ borderColor: 'rgba(255,255,255,0.08)', borderTopColor: '#F4705A' }} />
              </div>
            ) : fieldsHook.fields.length === 0 ? (
              <div
                className="rounded-2xl py-16 text-center"
                style={{ border: '1px dashed rgba(255,255,255,0.08)' }}
              >
                <p className="text-sm font-semibold text-white mb-1">Constructor vacío</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Seleccioná un tipo de campo de la izquierda para comenzar.
                </p>
              </div>
            ) : (
              fieldsHook.fields.map((field, idx) => (
                <BuilderFieldItem
                  key={field.id}
                  field={field}
                  isSelected={field.id === selectedFieldId}
                  isFirst={idx === 0}
                  isLast={idx === fieldsHook.fields.length - 1}
                  onSelect={() => { setSelectedFieldId(field.id); setMobileTab('config') }}
                  onMoveUp={() => handleMoveUp(field.id)}
                  onMoveDown={() => handleMoveDown(field.id)}
                  onDelete={() => {
                    if (selectedFieldId === field.id) setSelectedFieldId(null)
                    fieldsHook.remove(field.id)
                  }}
                />
              ))
            )}
          </div>
        </div>

        {/* Right — Config panel */}
        <div
          className={`flex-shrink-0 overflow-y-auto ${mobileTab === 'config' ? 'flex' : 'hidden'} lg:flex flex-col`}
          style={{ width: '260px', borderLeft: panelBorder, background: '#0F1115' }}
        >
          <FieldConfigPanel
            field={selectedField}
            onUpdate={(fid, patch) => fieldsHook.update(fid, patch)}
          />
        </div>
      </div>

      <FormPreview
        open={showPreview}
        onClose={() => setShowPreview(false)}
        template={template}
        fields={fieldsHook.fields}
      />
    </div>
  )
}
