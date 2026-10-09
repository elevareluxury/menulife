// Celebración breve al completar algo (V1 · etapa 12): una vibración cortita donde exista. La animación es la clase
// .life-pop de life.css (sólo sin "reducir movimiento"), que se pone en el tilde que aparece.

export function celebrate() {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(15)
  } catch { /* algunos navegadores lo bloquean sin interacción: no pasa nada */ }
}
