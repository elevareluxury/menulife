import { useState } from 'react'
import { motion } from 'framer-motion'
import { Minus, Plus, Trash2, ShoppingCart } from 'lucide-react'
import { DarkSheet } from './DarkSheet'
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

  const toggleNotes = (id: string) =>
    setExpandedNotes(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const title = language === 'ES' ? 'Tu pedido' : 'Your order'
  const total = getTotal(currency)

  if (items.length === 0) {
    return (
      <DarkSheet isOpen={isOpen} onClose={onClose} title={title}>
        <div className="flex flex-col items-center justify-center py-16 px-6 gap-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--menu-card-elevated, #1A1A1A)' }}
          >
            <ShoppingCart className="w-7 h-7" style={{ color: 'var(--menu-text-muted, #555555)' }} />
          </div>
          <p className="text-center text-sm" style={{ color: 'var(--menu-text-secondary, #888888)' }}>
            {language === 'ES' ? 'Tu carrito está vacío' : 'Your cart is empty'}
          </p>
        </div>
      </DarkSheet>
    )
  }

  return (
    <DarkSheet isOpen={isOpen} onClose={onClose} title={title}>
      {/* Items */}
      <div className="px-4 py-2">
        {items.map((item) => {
          const itemName = language === 'EN' && item.name_en ? item.name_en : item.name
          const itemPrice = currency === 'ARS' ? item.price_ars : item.price_usd

          return (
            <div
              key={item.id}
              className="flex gap-3 py-4"
              style={{ borderBottom: '1px solid var(--menu-border, rgba(255,255,255,0.06))' }}
            >
              {/* Thumbnail */}
              <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                {item.image_url ? (
                  <img src={item.image_url} alt={itemName} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{ backgroundColor: 'var(--menu-card-elevated, #1A1A1A)' }}
                  >
                    <span style={{ opacity: 0.3 }}>🍽️</span>
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p
                    className="text-sm font-semibold leading-tight truncate"
                    style={{ color: 'var(--menu-text-primary, #F5F5F5)' }}
                  >
                    {itemName}
                  </p>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-1 rounded-lg flex-shrink-0 transition-opacity hover:opacity-60 active:opacity-40"
                    style={{ color: 'var(--menu-text-muted, #555555)' }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p
                  className="text-sm font-bold mt-0.5"
                  style={{ color: 'var(--menu-accent, #FF6B6B)' }}
                >
                  {formatPrice(itemPrice, currency)}
                </p>

                {/* Qty controls */}
                <div className="flex items-center gap-2 mt-2">
                  <div
                    className="flex items-center gap-2 px-2 py-1 rounded-xl"
                    style={{ backgroundColor: 'var(--menu-card-elevated, #1A1A1A)' }}
                  >
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-6 h-6 flex items-center justify-center rounded-lg transition-opacity active:opacity-60"
                      style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'var(--menu-text-primary, #F5F5F5)' }}
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span
                      className="w-5 text-center text-sm font-bold"
                      style={{ color: 'var(--menu-text-primary, #F5F5F5)' }}
                    >
                      {item.quantity}
                    </span>
                    <motion.button
                      whileTap={{ scale: 0.82 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 12 }}
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-6 h-6 flex items-center justify-center rounded-lg text-white"
                      style={{ background: 'var(--menu-accent-gradient, linear-gradient(135deg,#FF6B6B,#FF8E53))' }}
                    >
                      <Plus className="w-3 h-3" />
                    </motion.button>
                  </div>

                  <p
                    className="text-xs ml-1"
                    style={{ color: 'var(--menu-text-muted, #555555)' }}
                  >
                    = {formatPrice(itemPrice * item.quantity, currency)}
                  </p>
                </div>

                {/* Notes toggle */}
                {expandedNotes.has(item.id) ? (
                  <textarea
                    placeholder={language === 'ES' ? 'Ej: sin cebolla' : 'E.g: no onions'}
                    value={item.notes}
                    onChange={(e) => updateNotes(item.id, e.target.value)}
                    rows={2}
                    className="mt-2 w-full px-3 py-2 text-sm rounded-xl resize-none outline-none"
                    style={{
                      backgroundColor: 'var(--menu-card-elevated, #1A1A1A)',
                      border: '1px solid var(--menu-border, rgba(255,255,255,0.06))',
                      color: 'var(--menu-text-primary, #F5F5F5)',
                    }}
                  />
                ) : (
                  <button
                    onClick={() => toggleNotes(item.id)}
                    className="text-xs mt-1.5 transition-opacity hover:opacity-70"
                    style={{ color: 'var(--menu-accent, #FF6B6B)' }}
                  >
                    {item.notes
                      ? (language === 'ES' ? 'Editar nota' : 'Edit note')
                      : (language === 'ES' ? '+ Agregar nota' : '+ Add note')
                    }
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div
        className="sticky bottom-0 px-4 py-4 mt-2"
        style={{
          backgroundColor: 'var(--menu-card, #111111)',
          borderTop: '1px solid var(--menu-border, rgba(255,255,255,0.06))',
          paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium" style={{ color: 'var(--menu-text-secondary, #888888)' }}>
            Total
          </span>
          <span className="text-xl font-bold" style={{ color: 'var(--menu-text-primary, #F5F5F5)' }}>
            {formatPrice(total, currency)}
          </span>
        </div>

        <button
          onClick={onCheckout}
          className="w-full py-4 rounded-2xl font-semibold text-white text-base active:opacity-80 transition-opacity"
          style={{
            background: 'var(--menu-accent-gradient, linear-gradient(135deg,#FF6B6B,#FF8E53))',
            boxShadow: '0 8px 24px rgba(255,107,107,0.35)',
          }}
        >
          {language === 'ES' ? 'Confirmar pedido' : 'Confirm order'}
        </button>
      </div>
    </DarkSheet>
  )
}
