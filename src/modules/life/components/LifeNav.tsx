import { createPortal } from 'react-dom'
import { useLocation, Link } from 'react-router-dom'
import { Sun, Wallet, Target, Flame, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useLifeT, type LifeDict } from '@/i18n/app/life'
import { useAppLang } from '@/i18n/app/store'
import { langDir } from '@/i18n/app/languages'
import { tint, colors, shadow } from '../design-system'

interface Tab {
  to: string
  label: keyof LifeDict['nav']
  icon: LucideIcon
}

const TABS: Tab[] = [
  { to: '/life',         label: 'life',   icon: Sun    },
  { to: '/life/money',   label: 'money',  icon: Wallet },
  { to: '/life/goals',   label: 'goals',  icon: Target },
  { to: '/life/habits',  label: 'habits', icon: Flame  },
  { to: '/life/brain',   label: 'brain',  icon: Zap    },
]

export function LifeNav() {
  const { pathname } = useLocation()
  const t = useLifeT()
  const dir = langDir(useAppLang(s => s.lang))

  const isActive = (to: string) =>
    to === '/life' ? pathname === '/life' : pathname.startsWith(to)

  // Portal a <body>: ningún contenedor puede alterar su position: fixed
  return createPortal(
    <nav aria-label="Life OS" dir={dir} style={{
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
      background: colors.surface.elevated,
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      border: `1px solid ${colors.border.glass}`,
      borderRadius: '9999px',
      boxShadow: shadow.elevated,
      zIndex: 50,
      userSelect: 'none',
    }}>
      {TABS.map(({ to, label: key, icon: Icon }) => {
        const active = isActive(to)
        const label = t.nav[key]
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
              background: active ? tint(colors.accent.default, 13) : 'transparent',
              transition: 'background 0.18s ease',
              minWidth: '48px',
              minHeight: '44px',
            }}
          >
            <Icon
              aria-hidden="true"
              size={20}
              style={{
                color: active ? colors.accent.ink : colors.text.secondary,
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
