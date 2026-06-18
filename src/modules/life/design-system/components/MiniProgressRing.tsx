import { useRef, useEffect } from 'react'
import { colors, font } from '../tokens'

interface MiniProgressRingProps {
  progress: number  // 0-100
  color: string
  size?: number
  showLabel?: boolean
}

/** Small circular progress ring — same DNA as LifeScoreRing, reusable in Goals, Widgets, etc. */
export function MiniProgressRing({ progress, color, size = 44, showLabel = true }: MiniProgressRingProps) {
  const sw = 4  // stroke width
  const r = (size - sw * 2) / 2
  const circ = 2 * Math.PI * r
  const arcRef = useRef<SVGCircleElement>(null)
  const clamped = Math.max(0, Math.min(100, progress))

  useEffect(() => {
    const el = arcRef.current
    if (!el) return
    el.style.transition = 'none'
    el.style.strokeDashoffset = String(circ)
    const raf = requestAnimationFrame(() => {
      el.style.transition = 'stroke-dashoffset 0.55s cubic-bezier(0.16,1,0.3,1)'
      el.style.strokeDashoffset = String(circ * (1 - clamped / 100))
    })
    return () => cancelAnimationFrame(raf)
  }, [clamped, circ])

  const center = size / 2

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={center} cy={center} r={r}
          fill="none" stroke={colors.border.subtle} strokeWidth={sw} />
        <circle
          ref={arcRef}
          cx={center} cy={center} r={r}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={`${circ} ${circ}`}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </svg>
      {showLabel && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{
            fontFamily: font, fontSize: size >= 56 ? '13px' : '9px', fontWeight: 800,
            color: clamped === 100 ? color : colors.text.secondary,
            lineHeight: 1,
          }}>
            {clamped}
          </span>
        </div>
      )}
    </div>
  )
}
