import { colors, font } from '../tokens'

interface LifeMetricProps {
  value: string | number
  label: string
  prefix?: string
  suffix?: string
  color?: string
  size?: 'sm' | 'md' | 'lg'
  align?: 'left' | 'center'
}

const sizeMap = {
  lg: { value: '42px', label: '11px' },
  md: { value: '28px', label: '11px' },
  sm: { value: '20px', label: '11px' },
} as const

export function LifeMetric({
  value,
  label,
  prefix,
  suffix,
  color = colors.text.primary,
  size = 'md',
  align = 'left',
}: LifeMetricProps) {
  const sz = sizeMap[size]
  return (
    <div style={{ textAlign: align }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: '2px',
        justifyContent: align === 'center' ? 'center' : 'flex-start',
      }}>
        {prefix && (
          <span style={{ fontFamily: font, fontSize: '14px', fontWeight: 700, color, opacity: 0.7 }}>
            {prefix}
          </span>
        )}
        <span style={{
          fontFamily: font, fontSize: sz.value, fontWeight: 800,
          color, lineHeight: 1, letterSpacing: '-0.02em',
        }}>
          {value}
        </span>
        {suffix && (
          <span style={{ fontFamily: font, fontSize: '13px', fontWeight: 700, color, opacity: 0.6 }}>
            {suffix}
          </span>
        )}
      </div>
      <p style={{
        fontFamily: font, fontSize: sz.label, fontWeight: 600,
        color: colors.text.tertiary, margin: '3px 0 0',
        textAlign: align,
      }}>
        {label}
      </p>
    </div>
  )
}
