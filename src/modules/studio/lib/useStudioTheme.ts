import { THEME_BG, type MycenTheme } from '@/design/themes'
import { usePrefersLight } from '@/modules/profile/lib/usePrefersLight'
import { useAppBackground } from '@/lib/useAppBackground'

/** Studio sigue al celular: Amanecer con el modo claro, Universo con el oscuro (V1 · etapa 07). */
export function useStudioTheme(): MycenTheme {
  return usePrefersLight() ? 'amanecer' : 'universo'
}

/** Tema de Studio + html y body pintados con su fondo (sin franjas de otro color al estirar la página) */
export function useStudioSurface(): MycenTheme {
  const theme = useStudioTheme()
  useAppBackground(THEME_BG[theme])
  return theme
}
