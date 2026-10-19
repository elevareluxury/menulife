import { useMemo } from 'react'
import { ACCENT_COLORS, SECONDARY_COLORS } from '@/design/themes'
import { brandMarkSvg } from '@/lib/brandMark'
import './huella-mark.css'

/**
 * La huella de Mycen (la del ícono de la app) como marca. `animated`: las órbitas giran despacio y el brillo respira
 * (quieto con "reducir movimiento"). SVG propio, generado con la semilla fija de la marca (no lleva texto de nadie).
 * `id` distinto por lugar: dos copias en la misma página no pueden compartir el id del degradé.
 */
export function HuellaMark({ id, size, animated = false, className = '' }: {
  id: string
  size: number
  animated?: boolean
  className?: string
}) {
  const svg = useMemo(() => brandMarkSvg(ACCENT_COLORS.plasma.universo.accent, SECONDARY_COLORS.universo, `-${id}`), [id])
  return (
    <span aria-hidden="true" className={`huella-mark${animated ? ' is-animated' : ''} ${className}`.trim()}
      style={{ width: size, height: size }}>
      <span className="huella-mark-svg" dangerouslySetInnerHTML={{ __html: svg }} />
    </span>
  )
}
