import type { HubC } from '@/modules/hub/lib/themeConfig'

interface StatsItem {
  value: string
  label: string
  icon?: string
}

interface StatsBlockProps {
  config: {
    items?: StatsItem[]
  }
  C: HubC
}

export function StatsBlock({ config, C }: StatsBlockProps) {
  const items = config.items ?? []
  if (items.length === 0) return null

  const gridTemplateColumns =
    items.length === 1 ? '1fr' :
    items.length === 2 ? '1fr 1fr' :
    items.length === 3 ? '1fr 1fr 1fr' :
    '1fr 1fr'

  return (
    <section style={{ width: '100%', padding: '0 20px', paddingTop: 32 }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns,
        gap: 12,
      }}>
        {items.map((item, idx) => (
          <div
            key={idx}
            style={{
              textAlign: 'center',
              padding: '20px 12px',
              borderRadius: 20,
              background: C.sur,
              border: `1px solid ${C.bdr}`,
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          >
            <p style={{
              fontFamily: "'Syne',sans-serif",
              fontSize: 32,
              fontWeight: 800,
              color: C.acc,
              margin: '0 0 4px',
              lineHeight: 1,
            }}>
              {item.value}
            </p>
            <p style={{
              fontFamily: "'DM Sans',sans-serif",
              fontSize: 12,
              color: C.t3,
              margin: 0,
              lineHeight: 1.4,
            }}>
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
