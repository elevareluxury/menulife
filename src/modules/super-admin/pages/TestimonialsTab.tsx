import { useState, useEffect, useRef } from 'react'
import { Plus, Pencil, Trash2, Upload, X, GripVertical, ToggleLeft, ToggleRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

const CARD_BG    = '#171A21'
const BORDER     = 'rgba(255,255,255,0.06)'
const TEXT       = '#F5F7FA'
const TEXT_MUTED = '#98A2B3'
const ACCENT     = '#F4705A'
const INPUT_BG   = '#0F1115'

interface Testimonial {
  id: string
  name: string
  role: string
  business: string
  content: string
  content_en: string | null
  avatar_url: string | null
  sort_order: number
  is_active: boolean
  created_at: string
}

type FormData = Omit<Testimonial, 'id' | 'created_at'>

const EMPTY_FORM: FormData = {
  name: '',
  role: '',
  business: '',
  content: '',
  content_en: '',
  avatar_url: null,
  sort_order: 1,
  is_active: true,
}

export function TestimonialsTab() {
  const [items, setItems] = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('testimonials')
      .select('*')
      .order('sort_order', { ascending: true })
    if (error) toast.error('Error cargando testimonios')
    else setItems((data as Testimonial[]) ?? [])
    setLoading(false)
  }

  function openNew() {
    setEditId(null)
    setForm({ ...EMPTY_FORM, sort_order: (items.length > 0 ? Math.max(...items.map(i => i.sort_order)) + 1 : 1) })
    setShowModal(true)
  }

  function openEdit(t: Testimonial) {
    setEditId(t.id)
    setForm({
      name: t.name,
      role: t.role,
      business: t.business,
      content: t.content,
      content_en: t.content_en ?? '',
      avatar_url: t.avatar_url,
      sort_order: t.sort_order,
      is_active: t.is_active,
    })
    setShowModal(true)
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast.error('Imagen demasiado grande (máx 2 MB)'); return }
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const fileName = `testimonials/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('restaurant-assets')
        .upload(fileName, file, { upsert: true })
      if (upErr) throw upErr
      const url = supabase.storage.from('restaurant-assets').getPublicUrl(fileName).data.publicUrl
      setForm(f => ({ ...f, avatar_url: url }))
      toast.success('Imagen subida')
    } catch {
      toast.error('Error subiendo imagen')
    } finally {
      setUploading(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.role || !form.business || !form.content) {
      toast.error('Completá los campos obligatorios')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        role: form.role.trim(),
        business: form.business.trim(),
        content: form.content.trim(),
        content_en: form.content_en?.trim() || null,
        avatar_url: form.avatar_url,
        sort_order: Number(form.sort_order) || 0,
        is_active: form.is_active,
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any
      if (editId) {
        const { error } = await sb.from('testimonials').update(payload).eq('id', editId)
        if (error) throw error
        toast.success('Testimonio actualizado')
      } else {
        const { error } = await sb.from('testimonials').insert(payload)
        if (error) throw error
        toast.success('Testimonio creado')
      }
      setShowModal(false)
      load()
    } catch {
      toast.error('Error guardando testimonio')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('testimonials').delete().eq('id', id)
    if (error) toast.error('Error eliminando')
    else { toast.success('Eliminado'); setDeleteId(null); load() }
  }

  async function toggleActive(t: Testimonial) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('testimonials')
      .update({ is_active: !t.is_active })
      .eq('id', t.id)
    if (error) toast.error('Error actualizando')
    else setItems(prev => prev.map(i => i.id === t.id ? { ...i, is_active: !t.is_active } : i))
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 12,
    border: `1px solid ${BORDER}`,
    background: INPUT_BG,
    color: TEXT,
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'inherit',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '12px',
    fontWeight: 600,
    color: TEXT_MUTED,
    marginBottom: 6,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: TEXT }}>💬 Testimonios</h1>
          <p className="text-sm mt-0.5" style={{ color: TEXT_MUTED }}>
            {items.length} testimonio{items.length !== 1 ? 's' : ''} · {items.filter(i => i.is_active).length} activos
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95"
          style={{ background: ACCENT, color: '#fff' }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          <Plus size={16} /> Nuevo
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 rounded-2xl animate-pulse"
              style={{ background: CARD_BG, border: `1px solid ${BORDER}` }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl p-12 text-center" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
          <p style={{ color: TEXT_MUTED, fontSize: 14 }}>No hay testimonios. Creá el primero.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="rounded-2xl p-5"
              style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
              <div className="flex items-start gap-4">
                {/* Drag handle visual */}
                <GripVertical size={16} style={{ color: TEXT_MUTED, marginTop: 2, flexShrink: 0 }} />

                {/* Avatar */}
                {item.avatar_url ? (
                  <img src={item.avatar_url} alt={item.name}
                    style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                    background: `${ACCENT}20`, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 15, fontWeight: 700, color: ACCENT,
                  }}>
                    {item.name.charAt(0)}
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-sm" style={{ color: TEXT }}>{item.name}</span>
                    <span className="text-xs" style={{ color: TEXT_MUTED }}>{item.role} · {item.business}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{
                      background: item.is_active ? '#10B98115' : 'rgba(255,255,255,0.04)',
                      color: item.is_active ? '#10B981' : TEXT_MUTED,
                      border: `1px solid ${item.is_active ? '#10B98130' : BORDER}`,
                    }}>
                      {item.is_active ? '● Activo' : '○ Inactivo'}
                    </span>
                    <span className="text-xs" style={{ color: TEXT_MUTED }}>Orden: {item.sort_order}</span>
                  </div>
                  <p className="text-sm line-clamp-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    "{item.content}"
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => toggleActive(item)}
                    title={item.is_active ? 'Desactivar' : 'Activar'}
                    style={{ color: item.is_active ? '#10B981' : TEXT_MUTED }}
                    className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
                  >
                    {item.is_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                  </button>
                  <button
                    onClick={() => openEdit(item)}
                    className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
                    style={{ color: TEXT_MUTED }}
                    title="Editar"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => setDeleteId(item.id)}
                    className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10"
                    style={{ color: '#EF4444' }}
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div
            className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl overflow-y-auto"
            style={{ background: '#12151C', border: `1px solid ${BORDER}`, maxHeight: '90vh' }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
              <h2 className="text-base font-bold" style={{ color: TEXT }}>
                {editId ? 'Editar testimonio' : 'Nuevo testimonio'}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ color: TEXT_MUTED }}
                className="p-1 rounded-lg hover:bg-white/5 transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              {/* Avatar */}
              <div>
                <label style={labelStyle}>Foto (avatar)</label>
                <div className="flex items-center gap-3">
                  {form.avatar_url ? (
                    <img src={form.avatar_url} alt="avatar"
                      style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${BORDER}` }} />
                  ) : (
                    <div style={{
                      width: 52, height: 52, borderRadius: '50%',
                      background: `${ACCENT}20`, display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Upload size={18} style={{ color: ACCENT }} />
                    </div>
                  )}
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all disabled:opacity-50"
                    style={{ background: 'rgba(255,255,255,0.06)', color: TEXT, border: `1px solid ${BORDER}` }}>
                    <Upload size={14} />
                    {uploading ? 'Subiendo...' : form.avatar_url ? 'Cambiar' : 'Subir foto'}
                  </button>
                  {form.avatar_url && (
                    <button type="button" onClick={() => setForm(f => ({ ...f, avatar_url: null }))}
                      className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" style={{ color: '#EF4444' }}>
                      <X size={14} />
                    </button>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*"
                    onChange={handleAvatarUpload} className="hidden" />
                </div>
              </div>

              {/* Nombre + Rol en fila */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={labelStyle}>Nombre *</label>
                  <input
                    style={inputStyle} required value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Valeria Moreno"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Rol/Cargo *</label>
                  <input
                    style={inputStyle} required value={form.role}
                    onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                    placeholder="Dueña"
                  />
                </div>
              </div>

              {/* Negocio */}
              <div>
                <label style={labelStyle}>Negocio *</label>
                <input
                  style={inputStyle} required value={form.business}
                  onChange={e => setForm(f => ({ ...f, business: e.target.value }))}
                  placeholder="Trattoria Bella, Rosario"
                />
              </div>

              {/* Testimonio ES */}
              <div>
                <label style={labelStyle}>Testimonio (ES) *</label>
                <textarea
                  style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }}
                  required value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="Antes mis clientes me preguntaban..."
                />
              </div>

              {/* Testimonio EN */}
              <div>
                <label style={labelStyle}>Testimonio (EN) <span style={{ fontWeight: 400, textTransform: 'none' }}>— opcional</span></label>
                <textarea
                  style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
                  value={form.content_en ?? ''}
                  onChange={e => setForm(f => ({ ...f, content_en: e.target.value }))}
                  placeholder="Before, my customers would ask..."
                />
              </div>

              {/* Orden + Activo en fila */}
              <div className="flex items-center gap-4">
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Orden</label>
                  <input
                    type="number" min={1} style={{ ...inputStyle, width: 100 }}
                    value={form.sort_order}
                    onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
                  />
                </div>
                <div className="flex items-center gap-3 pt-5">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                    style={{ color: form.is_active ? '#10B981' : TEXT_MUTED }}
                    className="flex items-center gap-2 text-sm font-medium"
                  >
                    {form.is_active ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                    {form.is_active ? 'Activo' : 'Inactivo'}
                  </button>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: 'rgba(255,255,255,0.06)', color: TEXT, border: `1px solid ${BORDER}` }}
                >
                  Cancelar
                </button>
                <button
                  type="submit" disabled={saving}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 active:scale-95"
                  style={{ background: ACCENT, color: '#fff' }}
                >
                  {saving ? 'Guardando...' : editId ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={e => { if (e.target === e.currentTarget) setDeleteId(null) }}
        >
          <div className="w-full max-w-sm rounded-2xl p-6"
            style={{ background: '#12151C', border: `1px solid ${BORDER}` }}>
            <h3 className="text-base font-bold mb-2" style={{ color: TEXT }}>¿Eliminar testimonio?</h3>
            <p className="text-sm mb-5" style={{ color: TEXT_MUTED }}>Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: 'rgba(255,255,255,0.06)', color: TEXT, border: `1px solid ${BORDER}` }}>
                Cancelar
              </button>
              <button onClick={() => handleDelete(deleteId)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: '#EF4444', color: '#fff' }}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
