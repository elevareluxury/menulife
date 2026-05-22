import { useState } from 'react'
import { Edit, Trash, Image as ImageIcon } from 'lucide-react'
import { Toggle } from '@/components/ui/Toggle'
import { supabase } from '@/lib/supabase'
import { formatPrice } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { MenuItem } from '@/types'
import { MenuItemModal } from './MenuItemModal'

interface ItemListProps {
  items: MenuItem[]
  restaurantId: string
  sectionId: string
}

export function ItemList({ items, restaurantId, sectionId }: ItemListProps) {
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)

  async function handleToggleAvailable(item: MenuItem) {
    const { error } = await supabase
      .from('menu_items')
      .update({ is_available: !item.is_available })
      .eq('id', item.id)
    if (error) toast.error('Error al actualizar disponibilidad')
  }

  async function handleDelete(itemId: string) {
    if (!confirm('¿Eliminar este plato?')) return
    const { error } = await supabase.from('menu_items').delete().eq('id', itemId)
    if (error) toast.error('Error al eliminar plato')
    else toast.success('Plato eliminado')
  }

  return (
    <>
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:border-emerald-300 transition-colors"
          >
            <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-gray-400" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{item.name}</p>
                  {item.name_en && <p className="text-xs text-gray-400 truncate">{item.name_en}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-semibold text-emerald-600">{formatPrice(item.price_ars, 'ARS')}</p>
                  <p className="text-xs text-gray-400">{formatPrice(item.price_usd, 'USD')}</p>
                </div>
              </div>

              {item.description && (
                <p className="text-sm text-gray-500 line-clamp-1 mb-2">{item.description}</p>
              )}

              {item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {item.tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                <Toggle
                  checked={item.is_available}
                  onChange={() => handleToggleAvailable(item)}
                  label={item.is_available ? 'Disponible' : 'Agotado'}
                />
                <div className="flex gap-1 ml-auto">
                  <button
                    onClick={() => setEditingItem(item)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editingItem && (
        <MenuItemModal
          isOpen
          onClose={() => setEditingItem(null)}
          restaurantId={restaurantId}
          sectionId={sectionId}
          item={editingItem}
        />
      )}
    </>
  )
}
