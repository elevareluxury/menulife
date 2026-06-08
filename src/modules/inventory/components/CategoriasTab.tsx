import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, Check, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

interface Category {
  id: string
  restaurant_id: string
  name: string
  name_en: string | null
  description: string | null
  sort_order: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

interface Props {
  restaurantId: string
}

interface FormData {
  name: string
  name_en: string
  description: string
}

const EMPTY_FORM: FormData = { name: '', name_en: '', description: '' }

const CARD  = '#1a1a1a'
const BDR   = '1px solid rgba(255,255,255,0.08)'
const TEXT  = '#F5F7FA'
const MUTED = 'rgba(255,255,255,0.45)'

export function CategoriasTab({ restaurantId }: Props) {
  const [categories, setCategories] = useState<Category[]>([])
  const [productCounts, setProductCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createForm, setCreateForm] = useState<FormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<FormData>(EMPTY_FORM)

  const fetchCategories = useCallback(async () => {
    try {
      const { data, error } = await db
        .from('product_categories')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })

      if (error) throw error
      setCategories(data ?? [])
    } catch (err: unknown) {
      toast.error('Error al cargar categorías')
      console.error(err)
    }
  }, [restaurantId])

  const fetchProductCounts = useCallback(async () => {
    try {
      const { data, error } = await db
        .from('products')
        .select('category_id')
        .eq('restaurant_id', restaurantId)
        .is('deleted_at', null)

      if (error) throw error
      const counts: Record<string, number> = {}
      ;(data ?? []).forEach((p: { category_id: string | null }) => {
        if (p.category_id) {
          counts[p.category_id] = (counts[p.category_id] ?? 0) + 1
        }
      })
      setProductCounts(counts)
    } catch (err) {
      console.error('Error loading product counts', err)
    }
  }, [restaurantId])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchCategories(), fetchProductCounts()]).finally(() => setLoading(false))
  }, [fetchCategories, fetchProductCounts])

  async function handleCreate() {
    if (!createForm.name.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }
    setSaving(true)
    try {
      const maxOrder = categories.length > 0
        ? Math.max(...categories.map(c => c.sort_order ?? 0)) + 1
        : 0
      const { error } = await db.from('product_categories').insert({
        restaurant_id: restaurantId,
        name: createForm.name.trim(),
        name_en: createForm.name_en.trim() || null,
        description: createForm.description.trim() || null,
        sort_order: maxOrder,
      })
      if (error) throw error
      toast.success('Categoría creada')
      setCreateForm(EMPTY_FORM)
      setShowCreateForm(false)
      await fetchCategories()
    } catch (err: unknown) {
      toast.error('Error al crear categoría')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveEdit(catId: string) {
    if (!editForm.name.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }
    setSaving(true)
    try {
      const { error } = await db
        .from('product_categories')
        .update({
          name: editForm.name.trim(),
          name_en: editForm.name_en.trim() || null,
          description: editForm.description.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', catId)
      if (error) throw error
      toast.success('Categoría actualizada')
      setEditingId(null)
      await fetchCategories()
    } catch (err: unknown) {
      toast.error('Error al actualizar categoría')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(catId: string, catName: string) {
    const count = productCounts[catId] ?? 0
    const msg = count > 0
      ? `¿Eliminar la categoría "${catName}"? Los ${count} productos no tendrán categoría.`
      : `¿Eliminar la categoría "${catName}"?`
    if (!confirm(msg)) return
    try {
      const { error } = await db
        .from('product_categories')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', catId)
      if (error) throw error
      toast.success('Categoría eliminada')
      await fetchCategories()
    } catch (err: unknown) {
      toast.error('Error al eliminar categoría')
      console.error(err)
    }
  }

  async function handleMove(index: number, direction: 'up' | 'down') {
    const newCats = [...categories]
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= newCats.length) return

    const a = newCats[index]
    const b = newCats[swapIndex]
    const orderA = a.sort_order
    const orderB = b.sort_order

    // Swap in local state immediately
    newCats[index] = { ...a, sort_order: orderB }
    newCats[swapIndex] = { ...b, sort_order: orderA }
    newCats.sort((x, y) => x.sort_order - y.sort_order)
    setCategories(newCats)

    try {
      await Promise.all([
        db.from('product_categories').update({ sort_order: orderB }).eq('id', a.id),
        db.from('product_categories').update({ sort_order: orderA }).eq('id', b.id),
      ])
    } catch (err: unknown) {
      toast.error('Error al reordenar')
      console.error(err)
      await fetchCategories()
    }
  }

  function startEdit(cat: Category) {
    setEditingId(cat.id)
    setEditForm({ name: cat.name, name_en: cat.name_en ?? '', description: cat.description ?? '' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#F4705A] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex justify-between items-center mb-4">
        <p style={{ color: MUTED, fontSize: 14 }}>{categories.length} categorías</p>
        <button
          onClick={() => { setShowCreateForm(true); setEditingId(null) }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-80"
          style={{ background: '#F4705A' }}
        >
          <Plus className="w-4 h-4" />
          Nueva categoría
        </button>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <div className="mb-4 rounded-xl p-4" style={{ background: CARD, border: BDR }}>
          <p className="text-white font-medium mb-3">Nueva categoría</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: MUTED }}>Nombre *</label>
              <input
                type="text"
                value={createForm.name}
                onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ej: Bebidas"
                className="w-full px-3 py-2 rounded-lg text-sm text-white bg-[#0F1115] border border-gray-700 focus:outline-none focus:border-[#F4705A]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: MUTED }}>Nombre en inglés</label>
              <input
                type="text"
                value={createForm.name_en}
                onChange={e => setCreateForm(f => ({ ...f, name_en: e.target.value }))}
                placeholder="Ej: Beverages"
                className="w-full px-3 py-2 rounded-lg text-sm text-white bg-[#0F1115] border border-gray-700 focus:outline-none focus:border-[#F4705A]"
              />
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-xs font-medium mb-1" style={{ color: MUTED }}>Descripción</label>
            <input
              type="text"
              value={createForm.description}
              onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Descripción opcional"
              className="w-full px-3 py-2 rounded-lg text-sm text-white bg-[#0F1115] border border-gray-700 focus:outline-none focus:border-[#F4705A]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setShowCreateForm(false); setCreateForm(EMPTY_FORM) }}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-white/50 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium text-white disabled:opacity-50"
              style={{ background: '#F4705A' }}
            >
              {saving ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Crear
            </button>
          </div>
        </div>
      )}

      {/* Category list */}
      <div className="space-y-2">
        {categories.length === 0 && (
          <div className="text-center py-16" style={{ color: MUTED }}>
            <p>No hay categorías aún. Crea la primera.</p>
          </div>
        )}

        {categories.map((cat, index) => (
          <div
            key={cat.id}
            className="rounded-xl p-4"
            style={{ background: CARD, border: BDR }}
          >
            {editingId === cat.id ? (
              /* Edit inline */
              <div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: MUTED }}>Nombre *</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg text-sm text-white bg-[#0F1115] border border-gray-700 focus:outline-none focus:border-[#F4705A]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: MUTED }}>Nombre en inglés</label>
                    <input
                      type="text"
                      value={editForm.name_en}
                      onChange={e => setEditForm(f => ({ ...f, name_en: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg text-sm text-white bg-[#0F1115] border border-gray-700 focus:outline-none focus:border-[#F4705A]"
                    />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="block text-xs font-medium mb-1" style={{ color: MUTED }}>Descripción</label>
                  <input
                    type="text"
                    value={editForm.description}
                    onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm text-white bg-[#0F1115] border border-gray-700 focus:outline-none focus:border-[#F4705A]"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium text-white/50 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleSaveEdit(cat.id)}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                    style={{ background: '#F4705A' }}
                  >
                    {saving
                      ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <Check className="w-3.5 h-3.5" />
                    }
                    Guardar
                  </button>
                </div>
              </div>
            ) : (
              /* Display row */
              <div className="flex items-center gap-3">
                {/* Reorder buttons */}
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button
                    onClick={() => handleMove(index, 'up')}
                    disabled={index === 0}
                    className="p-0.5 rounded hover:bg-white/10 disabled:opacity-20 transition-colors"
                  >
                    <ChevronUp className="w-3.5 h-3.5 text-white/50" />
                  </button>
                  <button
                    onClick={() => handleMove(index, 'down')}
                    disabled={index === categories.length - 1}
                    className="p-0.5 rounded hover:bg-white/10 disabled:opacity-20 transition-colors"
                  >
                    <ChevronDown className="w-3.5 h-3.5 text-white/50" />
                  </button>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm" style={{ color: TEXT }}>{cat.name}</span>
                    {cat.name_en && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.07]" style={{ color: MUTED }}>{cat.name_en}</span>
                    )}
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(244,112,90,0.15)', color: '#F4705A' }}>
                      {productCounts[cat.id] ?? 0} productos
                    </span>
                  </div>
                  {cat.description && (
                    <p className="text-xs mt-0.5 truncate" style={{ color: MUTED }}>{cat.description}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => startEdit(cat)}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <Pencil className="w-4 h-4 text-white/50" />
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id, cat.name)}
                    className="p-1.5 rounded-lg hover:bg-red-500/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
