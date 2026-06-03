import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Home, ShoppingBag, LayoutGrid, UtensilsCrossed, MoreHorizontal,
  QrCode, Users, ChefHat, Settings, Truck, type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface MainTab {
  to: string
  icon: LucideIcon
  labelKey: string
  exact?: boolean
}

interface MoreItem {
  icon: LucideIcon
  labelKey: string
  to?: string
  href?: string
  external?: boolean
}

const MAIN_TABS: MainTab[] = [
  { to: '/dashboard',        icon: Home,            labelKey: 'dashboard.nav_home',   exact: true },
  { to: '/dashboard/orders', icon: ShoppingBag,     labelKey: 'dashboard.nav_orders' },
  { to: '/dashboard/tables', icon: LayoutGrid,      labelKey: 'dashboard.nav_tables' },
  { to: '/dashboard/menu',   icon: UtensilsCrossed, labelKey: 'dashboard.nav_menu' },
]

function useIsActive(path: string, exact?: boolean) {
  const { pathname } = useLocation()
  return exact
    ? pathname === path
    : pathname === path || pathname.startsWith(path + '/')
}

function TabItem({
  tab,
  onClick,
}: {
  tab: MainTab
  onClick: () => void
}) {
  const active = useIsActive(tab.to, tab.exact)
  const Icon = tab.icon
  const { t } = useTranslation()

  return (
    <Link
      to={tab.to}
      onClick={onClick}
      className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 relative"
    >
      {/* Indicador superior con glow */}
      <motion.span
        className="absolute top-0 left-1/2 -translate-x-1/2 h-[3px] rounded-b-full"
        animate={{
          width: active ? 22 : 0,
          opacity: active ? 1 : 0,
        }}
        transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
        style={{
          background: '#FF6B7A',
          boxShadow: active ? '0 2px 10px rgba(255, 107, 122, 0.55)' : 'none',
        }}
      />

      <Icon
        className={cn('w-[22px] h-[22px] transition-colors duration-150', active ? 'text-brand' : 'text-ink-3')}
        strokeWidth={active ? 2.2 : 2}
      />
      <span
        className={cn('text-[10px] font-medium transition-colors duration-150', active ? 'text-brand' : 'text-ink-3')}
      >
        {t(tab.labelKey)}
      </span>
    </Link>
  )
}

export function BottomNav({ restaurantSlug }: { restaurantSlug?: string }) {
  const [showMore, setShowMore] = useState(false)
  const { t } = useTranslation()

  const moreItems: MoreItem[] = [
    { icon: QrCode,   labelKey: 'dashboard.nav_qr',      to: '/dashboard/qr' },
    { icon: Users,    labelKey: 'dashboard.nav_waiters',  to: '/dashboard/waiters' },
    { icon: Truck,    labelKey: 'dashboard.nav_drivers',  to: '/dashboard/repartidores' },
    {
      icon: ChefHat,
      labelKey: 'dashboard.nav_kitchen',
      href: restaurantSlug ? `/kitchen/${restaurantSlug}` : undefined,
      external: true,
    },
    { icon: Settings, labelKey: 'dashboard.nav_settings', to: '/dashboard/settings' },
  ]

  const close = () => setShowMore(false)

  return (
    <>
      {/* Backdrop del sheet */}
      <AnimatePresence>
        {showMore && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-30 lg:hidden"
            style={{ background: 'rgba(0,0,0,0.4)' }}
            onClick={close}
          />
        )}
      </AnimatePresence>

      {/* Sheet "Más" */}
      <AnimatePresence>
        {showMore && (
          <motion.div
            key="sheet"
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.34, 1.1, 0.64, 1] }}
            className="fixed z-40 lg:hidden"
            style={{
              bottom: 'calc(68px + env(safe-area-inset-bottom))',
              left: 12,
              right: 12,
            }}
          >
            <div
              className="overflow-hidden rounded-2xl"
              style={{
                background: '#13161C',
                border: '1px solid var(--border-default)',
                boxShadow: 'var(--shadow-lg)',
              }}
            >
              {moreItems.map(({ icon: Icon, labelKey, to, href, external }, idx) => {
                const itemCls =
                  'flex items-center gap-3.5 px-5 py-3.5 text-[13px] font-medium text-ink-2 hover:text-ink-1 hover:bg-surface-3 transition-colors cursor-pointer'
                const divider = idx < moreItems.length - 1 && (
                  <div style={{ height: 1, background: 'var(--border-subtle)', margin: '0 16px' }} />
                )

                const label = t(labelKey)
                const inner = (
                  <>
                    <Icon className="w-4 h-4 text-ink-3 flex-shrink-0" strokeWidth={2} />
                    {label}
                  </>
                )

                if (href) {
                  return (
                    <div key={labelKey}>
                      <a href={href} target={external ? '_blank' : undefined} rel="noopener noreferrer" className={itemCls} onClick={close}>
                        {inner}
                      </a>
                      {divider}
                    </div>
                  )
                }
                return (
                  <div key={labelKey}>
                    <Link to={to!} className={itemCls} onClick={close}>
                      {inner}
                    </Link>
                    {divider}
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Barra de navegación */}
      <nav
        className="fixed bottom-0 inset-x-0 z-50 lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div
          className="h-[60px] flex items-stretch"
          style={{
            background: 'rgba(15, 17, 21, 0.88)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          {MAIN_TABS.map((tab) => (
            <TabItem key={tab.to} tab={tab} onClick={close} />
          ))}

          {/* Botón "Más" */}
          <button
            onClick={() => setShowMore((v) => !v)}
            className={cn(
              'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors duration-150',
              showMore ? 'text-brand' : 'text-ink-3'
            )}
          >
            <MoreHorizontal className="w-[22px] h-[22px]" strokeWidth={2} />
            <span className="text-[10px] font-medium">{t('dashboard.nav_more')}</span>
          </button>
        </div>
      </nav>
    </>
  )
}
