import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Currency, Language } from '@/types'

interface MenuPreferences {
  currency: Currency
  language: Language
  setCurrency: (currency: Currency) => void
  setLanguage: (language: Language) => void
}

export const useMenuStore = create<MenuPreferences>()(
  persist(
    (set) => ({
      currency: 'ARS',
      language: 'ES',
      setCurrency: (currency) => set({ currency }),
      setLanguage: (language) => set({ language }),
    }),
    { name: 'menu-preferences' }
  )
)
