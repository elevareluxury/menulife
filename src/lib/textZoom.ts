// Tamaño de letra del celular en la app (iOS/Android): Mycen usa el que la persona eligió en el sistema, hasta un tope.
// 1,35 = el tamaño más grande "normal" de iPhone (xxxL, 23 pt sobre 17 pt) y por encima del máximo normal de Android
// (1,3): todo eso entra sin que se desarmen las pantallas. Los tamaños de accesibilidad más grandes quedan en el tope
// (para eso está el zoom del sistema). Nunca más chico que 100 %.
export const TEXT_ZOOM_MAX = 1.35

export function textZoomFor(preferred: number): number {
  if (!Number.isFinite(preferred) || preferred <= 1) return 1
  return Math.round(Math.min(preferred, TEXT_ZOOM_MAX) * 100) / 100
}
