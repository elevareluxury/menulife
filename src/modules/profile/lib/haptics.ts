/** Vibración corta al confirmar algo (copiar, votar, enviar). Sólo donde el navegador la tiene (Android); si no, nada. */
export function haptic(ms = 12): void {
  try { navigator.vibrate?.(ms) } catch { /* sin vibración */ }
}
