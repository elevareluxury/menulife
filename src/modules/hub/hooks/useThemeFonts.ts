import { useEffect } from 'react'
import type { HubTheme } from '../lib/themeConfig'

// Fonts already loaded globally via index.html:
//   Syne, DM Sans, DM Mono, Playfair Display, Space Grotesk, Bebas Neue, Inter
// Only Source Sans 3 (warm body font) needs dynamic loading.
const DYNAMIC_FONT_URLS: Partial<Record<HubTheme, string>> = {
  warm: 'https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600&display=swap',
}

export function useThemeFonts(theme: HubTheme | null | undefined) {
  useEffect(() => {
    if (!theme) return
    const url = DYNAMIC_FONT_URLS[theme]
    if (!url) return

    const id = `hub-font-${theme}`
    if (document.getElementById(id)) return

    const link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    link.href = url
    document.head.appendChild(link)
    // Intentionally not removing on cleanup — font stays cached once loaded
  }, [theme])
}
