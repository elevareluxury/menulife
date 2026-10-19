import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, Link } from 'react-router-dom'
import { Sun, Wallet, Target, Flame, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useLifeT, type LifeDict } from '@/i18n/app/life'
import { useAppLang } from '@/i18n/app/store'
import { langDir } from '@/i18n/app/languages'
import { CaptureButton } from './CaptureButton'

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

/**
 * Barra de abajo de Life OS: las cinco secciones y, al final, el + para anotar algo rápido (CaptureButton). La sección
 * activa la marca la misma cápsula de luz que en Studio: viaja de botón en botón con rastro y barrido (life.css).
 */
export function LifeNav() {
  const { pathname } = useLocation()
  const t = useLifeT()
  const dir = langDir(useAppLang(s => s.lang))
  const nav = useRef<HTMLElement | null>(null)

  const isActive = (to: string) =>
    to === '/life' ? pathname === '/life' : pathname.startsWith(to)

  // Posición de la cápsula en --life-ind-x / --life-ind-w; is-moving dispara el barrido al cambiar de sección
  const place = useCallback((animate: boolean) => {
    const el = nav.current
    if (!el) return
    const active = el.querySelector<HTMLElement>('a[aria-current="page"]')
    el.classList.toggle('has-active', !!active)
    if (!active) return
    el.style.setProperty('--life-ind-x', `${active.offsetLeft}px`)
    el.style.setProperty('--life-ind-w', `${active.offsetWidth}px`)
    if (!animate) return
    el.classList.remove('is-moving')
    void el.offsetWidth
    el.classList.add('is-moving')
  }, [])
  const first = useRef(true)
  useLayoutEffect(() => {
    place(!first.current)
    first.current = false
  }, [pathname, place])
  useEffect(() => {
    const onResize = () => place(false)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [place])

  // Portal a <body>: ningún contenedor puede alterar su position: fixed
  return createPortal(
    <nav ref={nav} aria-label="Life OS" dir={dir} className="life-nav">
      <span className="life-nav-indicator" aria-hidden="true" />
      {TABS.map(({ to, label: key, icon: Icon }) => {
        const active = isActive(to)
        const label = t.nav[key]
        return (
          <Link key={to} to={to} aria-label={label} aria-current={active ? 'page' : undefined} title={label} className="life-nav-link">
            <Icon aria-hidden="true" size={20} strokeWidth={active ? 2.2 : 1.8} />
          </Link>
        )
      })}
      <span className="life-nav-sep" aria-hidden="true" />
      <CaptureButton inBar />
    </nav>,
    document.body,
  )
}
