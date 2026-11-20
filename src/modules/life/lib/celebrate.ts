// Celebración breve al completar algo (V1 · etapa 12): una vibración cortita (en la app, la nativa del celular;
// en la web, donde exista). La animación es la clase .life-pop de life.css (sólo sin "reducir movimiento"), que se
// pone en el tilde que aparece.
import { haptic } from '@/lib/haptics'

export function celebrate() {
  haptic('success')
}
