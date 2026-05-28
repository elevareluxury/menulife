import type { Waiter } from '@/types'

const AVATAR_COLORS = [
  '#F4705A', // salmon
  '#6C63FF', // purple
  '#22C55E', // green
  '#3B82F6', // blue
  '#F59E0B', // amber
  '#EC4899', // pink
  '#14B8A6', // teal
  '#8B5CF6', // violet
]

function avatarColor(id: string) {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) & 0xff
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

function SkeletonCard() {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', borderRadius: '16px',
      padding: '20px 16px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
      border: '1px solid rgba(255,255,255,0.06)',
      animation: 'pulse 1.5s ease-in-out infinite',
    }}>
      <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
      <div style={{ height: '12px', width: '72px', borderRadius: '6px', background: 'rgba(255,255,255,0.08)' }} />
    </div>
  )
}

interface Props {
  waiters: Waiter[]
  loading: boolean
  lastWaiterId: string | null
  onSelect: (waiter: Waiter) => void
}

export function WaiterSelector({ waiters, loading, lastWaiterId, onSelect }: Props) {
  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', width: '100%' }}>
        {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
      </div>
    )
  }

  if (waiters.length === 0) {
    return (
      <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '32px 0', fontFamily: 'var(--font-jakarta)', fontSize: '14px' }}>
        No hay mozos activos registrados
      </p>
    )
  }

  const sorted = [...waiters].sort((a, b) => {
    if (a.id === lastWaiterId) return -1
    if (b.id === lastWaiterId) return 1
    return 0
  })

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%', maxHeight: '280px', overflowY: 'auto' }}>
      {sorted.map((waiter) => {
        const initials = `${waiter.first_name[0]}${waiter.last_name[0]}`.toUpperCase()
        const isLast = waiter.id === lastWaiterId
        const color = avatarColor(waiter.id)
        return (
          <button
            key={waiter.id}
            onClick={() => onSelect(waiter)}
            style={{
              background: isLast ? `${color}18` : 'rgba(255,255,255,0.04)',
              border: `1px solid ${isLast ? `${color}60` : 'rgba(255,255,255,0.07)'}`,
              borderRadius: '14px',
              padding: '18px 12px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = `${color}20`
              e.currentTarget.style.borderColor = `${color}80`
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = isLast ? `${color}18` : 'rgba(255,255,255,0.04)'
              e.currentTarget.style.borderColor = isLast ? `${color}60` : 'rgba(255,255,255,0.07)'
              e.currentTarget.style.transform = ''
            }}
          >
            <div style={{
              width: '52px', height: '52px', borderRadius: '50%',
              background: color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: '18px', fontWeight: 800,
              fontFamily: 'var(--font-syne)',
              flexShrink: 0,
              boxShadow: `0 4px 16px ${color}40`,
            }}>
              {initials}
            </div>
            <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 1.3 }}>
              {waiter.first_name} {waiter.last_name}
            </span>
            {isLast && (
              <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '10px', fontWeight: 600, color, letterSpacing: '0.04em' }}>
                Último
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
