import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  id: string
  name: string
  name_en: string | null
  price_ars: number
  price_usd: number
  image_url: string
  quantity: number
  notes: string
}

interface CartState {
  items: CartItem[]
  sessionId: string
  addItem: (item: Omit<CartItem, 'quantity' | 'notes'>) => void
  updateQuantity: (id: string, quantity: number) => void
  updateNotes: (id: string, notes: string) => void
  removeItem: (id: string) => void
  clearCart: () => void
  getTotal: (currency: string) => number
  getItemCount: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      sessionId: crypto.randomUUID(),

      addItem: (item) => {
        const items = get().items
        const existing = items.find(i => i.id === item.id)

        if (existing) {
          set({
            items: items.map(i =>
              i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
            ),
          })
        } else {
          set({
            items: [...items, { ...item, quantity: 1, notes: '' }],
          })
        }
      },

      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id)
        } else {
          set({
            items: get().items.map(i =>
              i.id === id ? { ...i, quantity } : i
            ),
          })
        }
      },

      updateNotes: (id, notes) => {
        set({
          items: get().items.map(i =>
            i.id === id ? { ...i, notes } : i
          ),
        })
      },

      removeItem: (id) => {
        set({ items: get().items.filter(i => i.id !== id) })
      },

      clearCart: () => {
        set({ items: [], sessionId: crypto.randomUUID() })
      },

      getTotal: (currency) => {
        return get().items.reduce((sum, item) => {
          const price = currency === 'ARS' ? item.price_ars : item.price_usd
          return sum + price * item.quantity
        }, 0)
      },

      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0)
      },
    }),
    {
      name: 'cart-storage',
    }
  )
)
