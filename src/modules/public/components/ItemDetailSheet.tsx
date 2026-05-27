import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Minus, Plus } from 'lucide-react'
import { DarkSheet } from './DarkSheet'
import { useCartStore } from '@/store/cartStore'
import { useMenuStore } from '@/store/menuStore'
import { formatPrice } from '@/lib/utils'
import type { MenuItem } from '@/types'

interface ItemDetailSheetProps {
  item: MenuItem | null
  isOpen: boolean
  onClose: () => void
}

const TAG_LABELS: Record<string, string> = {
  vegano: '🌱 Vegano',
  vegetariano: '🥗 Vegetariano',
  sin_tacc: '🌾 Sin TACC',
  picante: '🌶️ Picante',
  recomendado: '⭐ Recomendado',
  nuevo: '✨ Nuevo',
}

export function ItemDetailSheet({ item, isOpen, onClose }: ItemDetailSheetProps) {
  const { currency, language } = useMenuStore()
  const { addItem, items: cartItems } = useCartStore()
  const [qty, setQty] = useState(1)

  // Reset qty when item changes
  useEffect(() => { setQty(1) }, [item?.id])

  if (!item) return null

  const cartQty = cartItems.find(i => i.id === item.id)?.quantity ?? 0
  const name  = language === 'EN' && item.name_en        ? item.name_en        : item.name
  const desc  = language === 'EN' && item.description_en ? item.description_en : item.description
  const price = currency === 'ARS' ? item.price_ars : item.price_usd

  const handleAdd = () => {
    for (let i = 0; i < qty; i++) {
      addItem({
        id:        item.id,
        name:      item.name,
        name_en:   item.name_en,
        price_ars: item.price_ars,
        price_usd: item.price_usd,
        image_url: item.image_url,
      })
    }
    onClose()
  }

  return (
    <DarkSheet isOpen={isOpen} onClose={onClose} maxHeight="88vh">
      {/* Hero image */}
      {item.image_url ? (
        <div className="relative h-56 flex-shrink-0 overflow-hidden">
          <img src={item.image_url} alt={name} className="w-full h-full object-cover" loading="lazy" />
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to top, #111111 0%, transparent 55%)' }}
          />
        </div>
      ) : (
        <div
          className="h-40 flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'var(--menu-card-elevated, #1A1A1A)' }}
        >
          <span className="text-7xl" style={{ filter: 'grayscale(1)', opacity: 0.2 }}>🍽️</span>
        </div>
      )}

      {/* Content */}
      <div className="px-5 pb-6 pt-4 space-y-4">
        {/* Tags */}
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {item.tags.map(tag => (
              <span
                key={tag}
                className="px-2.5 py-1 rounded-full text-xs font-medium"
                style={{ backgroundColor: 'rgba(255,107,107,0.12)', color: 'var(--menu-accent, #FF6B6B)' }}
              >
                {TAG_LABELS[tag] ?? tag}
              </span>
            ))}
          </div>
        )}

        {/* Name + price */}
        <div>
          <h2
            className="text-2xl leading-tight mb-1"
            style={{ fontWeight: 800, color: 'var(--menu-text-primary, #F5F5F5)' }}
          >
            {name}
          </h2>
          <p
            className="text-xl font-bold"
            style={{ color: 'var(--menu-accent, #FF6B6B)' }}
          >
            {formatPrice(price, currency)}
          </p>
        </div>

        {/* Description */}
        {desc && (
          <p
            className="text-sm leading-relaxed"
            style={{ color: 'var(--menu-text-secondary, #888888)' }}
          >
            {desc}
          </p>
        )}

        {/* Cart status */}
        {cartQty > 0 && (
          <p className="text-xs" style={{ color: 'var(--menu-text-muted, #555555)' }}>
            {cartQty} {language === 'ES' ? `ya en el pedido` : `already in order`}
          </p>
        )}

        {/* Quantity + Add */}
        <div className="flex items-center gap-3 pt-1">
          {/* Qty control */}
          <div
            className="flex items-center gap-3 px-3 py-2.5 rounded-2xl flex-shrink-0"
            style={{ backgroundColor: 'var(--menu-card-elevated, #1A1A1A)' }}
          >
            <button
              onClick={() => setQty(q => Math.max(1, q - 1))}
              className="w-7 h-7 flex items-center justify-center rounded-full transition-opacity active:opacity-60"
              style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'var(--menu-text-primary, #F5F5F5)' }}
            >
              <Minus className="w-3 h-3" />
            </button>
            <span
              className="w-5 text-center text-base font-bold"
              style={{ color: 'var(--menu-text-primary, #F5F5F5)' }}
            >
              {qty}
            </span>
            <motion.button
              whileTap={{ scale: 0.85 }}
              transition={{ type: 'spring', stiffness: 500, damping: 12 }}
              onClick={() => setQty(q => q + 1)}
              className="w-7 h-7 flex items-center justify-center rounded-full text-white"
              style={{ background: 'var(--menu-accent-gradient, linear-gradient(135deg,#FF6B6B,#FF8E53))' }}
            >
              <Plus className="w-3 h-3" />
            </motion.button>
          </div>

          {/* Add to cart */}
          <button
            onClick={handleAdd}
            className="flex-1 py-3.5 rounded-2xl font-semibold text-white text-base active:opacity-80 transition-opacity"
            style={{
              background: 'var(--menu-accent-gradient, linear-gradient(135deg,#FF6B6B,#FF8E53))',
              boxShadow: '0 4px 20px rgba(255,107,107,0.3)',
            }}
          >
            {language === 'ES' ? 'Agregar' : 'Add'} · {formatPrice(price * qty, currency)}
          </button>
        </div>
      </div>
    </DarkSheet>
  )
}
