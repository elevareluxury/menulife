import { memo, useId, useMemo } from 'react'
import type { CSSProperties } from 'react'
import { generateHuella } from '@/lib/huella'
import type { HuellaVariant } from '@/lib/huella'

export interface HuellaProps {
  /** Semilla estable: usar `huellaSeed(profile)` */
  seed: string
  variant?: HuellaVariant
  /** Lado en px (o cualquier largo CSS). Por defecto ocupa el ancho de su contenedor. */
  size?: number | string
  /** Colores del degradé. Por defecto el acento y el segundo color del tema. */
  colorA?: string
  colorB?: string
  /** Gira muy despacio (una vuelta en 120 s) */
  spin?: boolean
  /** Se dibuja en 600 ms (entrada del perfil y onboarding) */
  draw?: boolean
  className?: string
  style?: CSSProperties
}

/**
 * La huella Mycen (sistema de diseño §8). Es decorativa: `aria-hidden`. Los trazos son punteados (efecto partículas),
 * así que el dibujo no anima los trazos sino una máscara de trazos lisos que se van completando. Con "reducir
 * movimiento" no gira ni se dibuja: aparece entera y quieta.
 */
function HuellaBase({ seed, variant = 'orbitas', size = '100%', colorA, colorB, spin, draw, className, style }: HuellaProps) {
  const huella = useMemo(() => generateHuella(seed, variant), [seed, variant])
  // Ids únicos por instancia: puede haber varias huellas en la misma página
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const gradient = `huella-g-${uid}`
  const mask = `huella-m-${uid}`
  const stopA: CSSProperties = { stopColor: colorA ?? 'var(--my-accent)' }
  const stopB: CSSProperties = { stopColor: colorB ?? 'var(--my-secondary)' }

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={[spin && 'my-spin', className].filter(Boolean).join(' ') || undefined}
      style={{ display: 'block', overflow: 'visible', ...style }}
    >
      <defs>
        <linearGradient id={gradient} gradientUnits="userSpaceOnUse" x1="20" y1="185" x2="185" y2="15">
          <stop offset="0" style={stopA} />
          <stop offset="1" style={stopB} />
        </linearGradient>
        {draw && (
          <mask id={mask} maskUnits="userSpaceOnUse" x="-20" y="-20" width="240" height="240">
            {huella.strokes.map((s, i) => (
              <path key={i} d={s.d} fill="none" stroke="#fff" strokeWidth={s.width + 6} strokeLinecap="round"
                pathLength={1} strokeDasharray="1 1" className="my-draw" />
            ))}
          </mask>
        )}
      </defs>
      <g mask={draw ? `url(#${mask})` : undefined}>
        {huella.strokes.map((s, i) => (
          <path key={i} d={s.d} fill="none" stroke={`url(#${gradient})`} strokeWidth={s.width}
            strokeDasharray={s.dash} strokeLinecap="round" strokeOpacity={s.opacity} />
        ))}
      </g>
    </svg>
  )
}

export const Huella = memo(HuellaBase)
