import { useLocation, Link } from 'react-router-dom'
import { Sun, Wallet, Target, Flame, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface Tab {
  to: string
  label: string
  icon: LucideIcon
}

const TABS: Tab[] = [
  { to: '/life',         label: 'Life',   icon: Sun    },
  { to: '/life/money',   label: 'Money',  icon: Wallet },
  { to: '/life/goals',   label: 'Goals',  icon: Target },
  { to: '/life/habits',  label: 'Habits', icon: Flame  },
  { to: '/life/brain',   label: 'Brain',  icon: Zap    },
]

export function LifeNav() {
  const { pathname } = useLocation()

  const isActive = (to: string) =>
    to === '/life' ? pathname === '/life' : pathname.startsWith(to)

  return (
    <nav style={{
      position: 'fixed',
      bottom: 'calc(16px + env(safe-area-inset-bottom))',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      alignItems: 'center',
      gap: '2px',
      padding: '6px 8px',
      background: 'rgba(13,15,20,0.88)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '9999px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
      zIndex: 50,
      userSelect: 'none',
    }}>
      {TABS.map(({ to, label, icon: Icon }) => {
        const active = isActive(to)
        return (
          <Link
            key={to}
            to={to}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              padding: '7px 13px',
              borderRadius: '9999px',
              textDecoration: 'none',
              background: active ? 'rgba(244,112,90,0.13)' : 'transparent',
              transition: 'background 0.18s ease',
              minWidth: '52px',
            }}
          >
            <Icon
              size={18}
              style={{
                color: active ? '#F4705A' : 'rgba(255,255,255,0.32)',
                transition: 'color 0.18s',
                strokeWidth: active ? 2.2 : 1.8,
              }}
            />
            <span style={{
              fontSize: '10px',
              fontWeight: active ? 700 : 500,
              letterSpacing: '0.01em',
              color: active ? '#F4705A' : 'rgba(255,255,255,0.28)',
              transition: 'color 0.18s, font-weight 0.18s',
              fontFamily: 'var(--font-jakarta)',
              lineHeight: 1,
            }}>
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
