import { useState } from 'react'
import { Minus, Plus, Trash2, ShoppingCart } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { useCartStore } from '@/store/cartStore'
import { useMenuStore } from '@/store/menuStore'
import { formatPrice } from '@/lib/utils'

interface CartSheetProps {
  isOpen: boolean
  onClose: () => void
  onCheckout: () => void
}

export function CartSheet({ isOpen, onClose, onCheckout }: CartSheetProps) {
  const { items, updateQuantity, updateNotes, removeItem, getTotal } = useCartStore()
  const { currency, language } = useMenuStore()
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set())

  const toggleNotes = (id: string) => {
    setExpandedNotes(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const title = language === 'ES' ? 'Carrito' : 'Cart'

  if (items.length === 0) {
    return (
      <BottomSheet isOpen={isOpen} onClose={onClose} title={title}>
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <ShoppingCart className="w-16 h-16 text-gray-300 mb-4" />
          <p className="text-gray-600 text-center">
            {language === 'ES' ? 'Tu carrito está vacío' : 'Your cart is empty'}
          </p>
        </div>
      </BottomSheet>
    )
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={title}>
      <div className="divide-y">
        {items.map((item) => (
          <div key={item.id} className="p-4">
            <div className="flex gap-3">
              <img
                src={item.image_url}
                alt={item.name}
                className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
              />

              <div className="flex-1 min-w-0">
                <h4 className="font-semibold truncate">
                  {language === 'EN' && item.name_en ? item.name_en : item.name}
                </h4>
                <p className="text-sm text-gray-600">
                  {formatPrice(
                    currency === 'ARS' ? item.price_ars : item.price_usd,
                    currency
                  )}
                </p>

                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center font-medium">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-1 hover:bg-red-100 rounded ml-auto"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>

                {expandedNotes.has(item.id) ? (
                  <Textarea
                    placeholder={language === 'ES' ? 'Ej: sin cebolla' : 'E.g: no onions'}
                    value={item.notes}
                    onChange={(e) => updateNotes(item.id, e.target.value)}
                    className="mt-2 text-sm"
                    rows={2}
                  />
                ) : (
                  <button
                    onClick={() => toggleNotes(item.id)}
                    className="text-sm text-primary hover:underline mt-1"
                  >
                    {item.notes
                      ? (language === 'ES' ? 'Editar nota' : 'Edit note')
                      : (language === 'ES' ? '+ Agregar nota' : '+ Add note')
                    }
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t bg-gray-50 sticky bottom-0">
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold">Total</span>
          <span className="text-xl font-bold text-primary">
            {formatPrice(getTotal(currency), currency)}
          </span>
        </div>
        <Button onClick={onCheckout} className="w-full" size="lg">
          {language === 'ES' ? 'Confirmar Pedido' : 'Confirm Order'}
        </Button>
      </div>
    </BottomSheet>
  )
}
