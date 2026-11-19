import { isNativeApp } from './platform'

// Vibración corta al confirmar algo (copiar, votar, enviar, tildar, publicar).
// En la app de iOS/Android, la vibración nativa (@capacitor/haptics: en iPhone, el "toquecito" del sistema; la web
// no puede vibrar en Safari). En la web, `navigator.vibrate` donde exista (Android). Si nada anda, no pasa nada.
// El plugin se importa sólo en la app: la web no lo baja.

export type HapticKind = 'tap' | 'success'

export function haptic(kind: HapticKind = 'tap'): void {
  if (isNativeApp()) {
    void import('@capacitor/haptics')
      .then(({ Haptics, ImpactStyle, NotificationType }) => (kind === 'success'
        ? Haptics.notification({ type: NotificationType.Success })
        : Haptics.impact({ style: ImpactStyle.Light })))
      .catch(() => undefined)
    return
  }
  try { navigator.vibrate?.(kind === 'success' ? 20 : 12) } catch { /* sin vibración */ }
}
