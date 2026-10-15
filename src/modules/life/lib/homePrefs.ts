import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Preferencias de "Mi día" que se guardan en el dispositivo (Life OS → Ajustes).
interface HomePrefs {
  /** Tarjeta "Mi identidad" arriba de Mi día (por defecto, sí) */
  showIdentity: boolean
  setShowIdentity: (v: boolean) => void
}

export const useHomePrefs = create<HomePrefs>()(
  persist(
    set => ({
      showIdentity: true,
      setShowIdentity: v => set({ showIdentity: v }),
    }),
    { name: 'mycen_life_home' },
  ),
)
