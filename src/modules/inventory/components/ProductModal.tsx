import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Upload, Tag, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useImageUpload } from '@/modules/menu/hooks/useImageUpload'
import { formatPrice } from '@/lib/utils'
import toast from 'react-hot-toast'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

interface Category {
  id: string
  name: string
}

export interface Product {
  id: string
  restaurant_id: string
  category_id: string | null
  name: string
  name_en: string | null
  description: string | null
  description_en: string | null
  sku: string | null
  barcode: string | null
  brand: string | null
  image_url: string | null
  price_sale: number
  cost: number
  margin_pct: number | null
  stock_current: number
  stock_min: number
  tags: string[]
  is_active: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

interface Props {
  isOpen: boolean
  onClose: () => void
  restaurantId: string
  product: Product | null
  categories: Category[]
  onSaved: () => void
}

const MUTED = 'rgba(255,255,255,0.45)'
const TEXT  = '#F5F7FA'

function computeMargin(priceSale: number, cost: number): string {
  if (priceSale <= 0) return '0.0'
  const m = ((priceSale - cost) / priceSale) * 100
  return isFinite(m) ? m.toFixed(1) : '0.0'
}

export function ProductModal({ isOpen, onClose, restaurantId, product, categories, onSaved }: Props) {
  const { uploadImage, uploading } = useImageUpload()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    name: '',
    name_en: '',
    description: '',
    description_en: '',
    sku: '',
    barcode: '',
    brand: '',
    category_id: '',
    price_sale: '',
    cost: '',
    stock_current: '',
    stock_min: '5',
    is_active: true,
  })
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    if (product) {
      setForm({
        name: product.name,
        name_en: product.name_en ?? '',
        description: product.description ?? '',
        description_en: product.description_en ?? '',
        sku: product.sku ?? '',
        barcode: product.barcode ?? '',
        brand: product.brand ?? '',
        category_id: product.category_id ?? '',
        price_sale: String(product.price_sale),
        cost: String(product.cost),
        stock_current: String(product.stock_current),
        stock_min: String(product.stock_min),
        is_active: product.is_active,
      })
      setTags(product.tags ?? [])
      setImageUrl(product.image_url)
    } else {
      setForm({
        name: '', name_en: '', description: '', description_en: '',
        sku: '', barcode: '', brand: '', category_id: '',
        price_sale: '', cost: '', stock_current: '0', stock_min: '5', is_active: true,
      })
      setTags([])
      setImageUrl(null)
    }
    setTagInput('')
  }, [isOpen, product])

  const priceSaleNum = parseFloat(form.price_sale) || 0
  const costNum = parseFloat(form.cost) || 0
  const marginDisplay = computeMargin(priceSaleNum, costNum)

  const handleImageFile = useCallback(async (file: File) => {
    const result = await uploadImage(file, 'product-images')
    if (result.success) {
      setImageUrl(result.url)
    }
  }, [uploadImage])

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) handleImageFile(file)
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const tag = tagInput.trim().toLowerCase()
      if (tag && !tags.includes(tag)) setTags(prev => [...prev, tag])
      setTagInput('')
    }
  }

  function removeTag(tag: string) {
    setTags(prev => prev.filter(t => t !== tag))
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }

    const priceSale = parseFloat(form.price_sale) || 0
    const cost = parseFloat(form.cost) || 0
    const stockCurrent = parseInt(form.stock_current) || 0
    const stockMin = parseInt(form.stock_min) || 5

    setSaving(true)
    try {
      if (product) {
        // Update
        const oldStock = product.stock_current
        const newStock = stockCurrent

        const updatePayload = {
          name: form.name.trim(),
          name_en: form.name_en.trim() || null,
          description: form.description.trim() || null,
          description_en: form.description_en.trim() || null,
          sku: form.sku.trim() || null,
          barcode: form.barcode.trim() || null,
          brand: form.brand.trim() || null,
          category_id: form.category_id || null,
          price_sale: priceSale,
          cost: cost,
          stock_current: newStock,
          stock_min: stockMin,
          image_url: imageUrl,
          tags,
          is_active: form.is_active,
          updated_at: new Date().toISOString(),
        }

        const { error: updateErr } = await db
          .from('products')
          .update(updatePayload)
          .eq('id', product.id)
        if (updateErr) throw updateErr

        // Record stock adjustment if changed
        if (newStock !== oldStock) {
          await db.from('inventory_movements').insert({
            restaurant_id: restaurantId,
            product_id: product.id,
            type: 'adjustment',
            quantity: newStock - oldStock,
            previous_stock: oldStock,
            new_stock: newStock,
            reason: 'Ajuste manual desde producto',
          })
        }

        toast.success('Producto actualizado')
      } else {
        // Insert
        const { error: insertErr } = await db.from('products').insert({
          restaurant_id: restaurantId,
          name: form.name.trim(),
          name_en: form.name_en.trim() || null,
          description: form.description.trim() || null,
          description_en: form.description_en.trim() || null,
          sku: form.sku.trim() || null,
          barcode: form.barcode.trim() || null,
          brand: form.brand.trim() || null,
          category_id: form.category_id || null,
          price_sale: priceSale,
          cost: cost,
          stock_current: stockCurrent,
          stock_min: stockMin,
          image_url: imageUrl,
          tags,
          is_active: form.is_active,
        })
        if (insertErr) throw insertErr
        toast.success('Producto creado')
      }

      onSaved()
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar'
      toast.error(msg)
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-2xl bg-[#16181F] border border-white/[0.08] rounded-xl shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] shrink-0">
          <h2 className="text-lg font-semibold" style={{ color: TEXT }}>
            {product ? 'Editar producto' : 'Nuevo producto'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <X className="h-5 w-5 text-white/50" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-6 pb-8 space-y-5">
          {/* Image */}
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: MUTED }}>Imagen</label>
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="relative cursor-pointer rounded-xl border-2 border-dashed border-gray-700 hover:border-[#F4705A] transition-colors flex items-center gap-4 p-4"
            >
              {imageUrl ? (
                <>
                  <img src={imageUrl} alt="preview" className="w-16 h-16 rounded-lg object-cover shrink-0" />
                  <div>
                    <p className="text-sm text-white/70">Imagen cargada</p>
                    <p className="text-xs mt-0.5" style={{ color: MUTED }}>Clic para cambiar</p>
                  </div>
                </>
              ) : (
                <>
                  {uploading
                    ? <Loader2 className="w-8 h-8 animate-spin text-white/30" />
                    : <Upload className="w-8 h-8 text-white/20" />
                  }
                  <div>
                    <p className="text-sm text-white/50">Arrastrá o hacé clic para subir</p>
                    <p className="text-xs mt-0.5" style={{ color: MUTED }}>PNG, JPG, WebP</p>
                  </div>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f) }}
            />
          </div>

          {/* Name row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: MUTED }}>Nombre *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Nombre del producto"
                className="w-full px-3 py-2 rounded-lg text-sm text-white bg-[#0F1115] border border-gray-700 focus:outline-none focus:border-[#F4705A]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: MUTED }}>Nombre en inglés</label>
              <input
                type="text"
                value={form.name_en}
                onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))}
                placeholder="Product name"
                className="w-full px-3 py-2 rounded-lg text-sm text-white bg-[#0F1115] border border-gray-700 focus:outline-none focus:border-[#F4705A]"
              />
            </div>
          </div>

          {/* Description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: MUTED }}>Descripción</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
                placeholder="Descripción del producto"
                className="w-full px-3 py-2 rounded-lg text-sm text-white bg-[#0F1115] border border-gray-700 focus:outline-none focus:border-[#F4705A] resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: MUTED }}>Descripción en inglés</label>
              <textarea
                value={form.description_en}
                onChange={e => setForm(f => ({ ...f, description_en: e.target.value }))}
                rows={2}
                placeholder="Product description"
                className="w-full px-3 py-2 rounded-lg text-sm text-white bg-[#0F1115] border border-gray-700 focus:outline-none focus:border-[#F4705A] resize-none"
              />
            </div>
          </div>

          {/* SKU / Barcode / Brand / Category */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: MUTED }}>SKU</label>
              <input
                type="text"
                value={form.sku}
                onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
                placeholder="SKU-001"
                className="w-full px-3 py-2 rounded-lg text-sm text-white bg-[#0F1115] border border-gray-700 focus:outline-none focus:border-[#F4705A]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: MUTED }}>Código de barras</label>
              <input
                type="text"
                value={form.barcode}
                onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))}
                placeholder="7790001..."
                className="w-full px-3 py-2 rounded-lg text-sm text-white bg-[#0F1115] border border-gray-700 focus:outline-none focus:border-[#F4705A]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: MUTED }}>Marca</label>
              <input
                type="text"
                value={form.brand}
                onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                placeholder="Marca"
                className="w-full px-3 py-2 rounded-lg text-sm text-white bg-[#0F1115] border border-gray-700 focus:outline-none focus:border-[#F4705A]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: MUTED }}>Categoría</label>
              <select
                value={form.category_id}
                onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm text-white bg-[#0F1115] border border-gray-700 focus:outline-none focus:border-[#F4705A]"
              >
                <option value="">Sin categoría</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Price / Cost / Margin */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: MUTED }}>Precio de venta</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price_sale}
                onChange={e => setForm(f => ({ ...f, price_sale: e.target.value }))}
                placeholder="0"
                className="w-full px-3 py-2 rounded-lg text-sm text-white bg-[#0F1115] border border-gray-700 focus:outline-none focus:border-[#F4705A]"
              />
              {priceSaleNum > 0 && (
                <p className="text-xs mt-1 text-white/40">{formatPrice(priceSaleNum, 'ARS')}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: MUTED }}>Costo</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.cost}
                onChange={e => setForm(f => ({ ...f, cost: e.target.value }))}
                placeholder="0"
                className="w-full px-3 py-2 rounded-lg text-sm text-white bg-[#0F1115] border border-gray-700 focus:outline-none focus:border-[#F4705A]"
              />
              {costNum > 0 && (
                <p className="text-xs mt-1 text-white/40">{formatPrice(costNum, 'ARS')}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: MUTED }}>Margen</label>
              <div className="px-3 py-2 rounded-lg text-sm bg-[#0F1115] border border-gray-700 flex items-center">
                <span
                  className="font-semibold"
                  style={{ color: parseFloat(marginDisplay) >= 30 ? '#22c55e' : parseFloat(marginDisplay) >= 10 ? '#f59e0b' : '#ef4444' }}
                >
                  {marginDisplay}%
                </span>
              </div>
            </div>
          </div>

          {/* Stock */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: MUTED }}>Stock actual</label>
              <input
                type="number"
                min="0"
                step="1"
                value={form.stock_current}
                onChange={e => setForm(f => ({ ...f, stock_current: e.target.value }))}
                placeholder="0"
                className="w-full px-3 py-2 rounded-lg text-sm text-white bg-[#0F1115] border border-gray-700 focus:outline-none focus:border-[#F4705A]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: MUTED }}>Stock mínimo</label>
              <input
                type="number"
                min="0"
                step="1"
                value={form.stock_min}
                onChange={e => setForm(f => ({ ...f, stock_min: e.target.value }))}
                placeholder="5"
                className="w-full px-3 py-2 rounded-lg text-sm text-white bg-[#0F1115] border border-gray-700 focus:outline-none focus:border-[#F4705A]"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: MUTED }}>Etiquetas</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map(tag => (
                <span
                  key={tag}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-white/[0.07] text-white/70"
                >
                  <Tag className="w-2.5 h-2.5" />
                  {tag}
                  <button onClick={() => removeTag(tag)} className="ml-0.5 text-white/30 hover:text-white">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="Escribí una etiqueta y presioná Enter"
              className="w-full px-3 py-2 rounded-lg text-sm text-white bg-[#0F1115] border border-gray-700 focus:outline-none focus:border-[#F4705A]"
            />
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium" style={{ color: TEXT }}>Producto activo</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={form.is_active}
                onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
              />
              <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:bg-[#F4705A] transition-colors" />
              <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/[0.08] shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-white/50 hover:text-white transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || uploading}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
            style={{ background: '#F4705A' }}
          >
            {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {product ? 'Guardar cambios' : 'Crear producto'}
          </button>
        </div>
      </div>
    </div>
  )
}
