import type { ReactNode } from 'react'
import { CalendarDays, Clock } from 'lucide-react'

/**
 * Campo de fecha u hora de Mycen. En el iPhone el dibujo nativo no se achicaba (dos lado a lado se pisaban), así que
 * va sin él (`.my-picker`, index.css); sin el dibujo nativo un campo vacío quedaba en blanco, por eso lleva un ícono
 * de calendario o reloj: se entiende que se toca para elegir. Al tocarlo se abre el selector del sistema.
 */
export function PickerWrap({ kind, children }: { kind: 'date' | 'time'; children: ReactNode }) {
  const Icon = kind === 'time' ? Clock : CalendarDays
  return (
    <span className="my-picker">
      {children}
      <Icon className="my-picker-icon" size={18} aria-hidden="true" />
    </span>
  )
}
