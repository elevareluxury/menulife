import { createPortal } from 'react-dom'
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

  // Portal a <body>: ningún contenedor puede alterar su position: fixed
  return createPortal(
    <nav aria-label="Life OS" style={{
      // Fija al pie sin transform (con transform algunos navegadores la desplazan al hacer scroll)
      position: 'fixed',
      bottom: 'calc(16px + env(safe-area-inset-bottom))',
      left: 0,
      right: 0,
      marginInline: 'auto',
      width: 'fit-content',
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
            aria-label={label}
            aria-current={active ? 'page' : undefined}
            title={label}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '11px 14px',
              borderRadius: '9999px',
              textDecoration: 'none',
              background: active ? 'rgba(244,112,90,0.13)' : 'transparent',
              transition: 'background 0.18s ease',
              minWidth: '48px',
              minHeight: '44px',
            }}
          >
            <Icon
              aria-hidden="true"
              size={20}
              style={{
                color: active ? '#F4705A' : 'rgba(255,255,255,0.32)',
                transition: 'color 0.18s',
                strokeWidth: active ? 2.2 : 1.8,
              }}
            />
          </Link>
        )
      })}
    </nav>,
    document.body,
  )
}
