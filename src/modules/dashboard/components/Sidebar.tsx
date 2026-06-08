import { NavLink } from 'react-router-dom'
import {
  Home, ShoppingBag, LayoutGrid, UtensilsCrossed,
  QrCode, Users, ChefHat, LogOut, Truck, ContactRound,
  BarChart2, Settings, Banknote, Receipt, TrendingDown,
  Globe, Warehouse,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/authStore'
import { useRestaurantStore } from '@/store/restaurantStore'
import { cn } from '@/lib/utils'

interface NavItemDef {
  to: string
  icon: LucideIcon
  labelKey: string
  exact?: boolean
}

interface NavGroup {
  section: string | null
  items: NavItemDef[]
  showKitchen?: boolean
}

/* ── Nav configs ─────────────────────────────────────────────────────────── */

const GASTRONOMY_NAV: NavGroup[] = [
  {
    section: 'Operaciones',
    items: [
      { to: '/dashboard',              icon: Home,            labelKey: 'dashboard.nav_home',   exact: true },
      { to: '/dashboard/caja',         icon: Banknote,        labelKey: 'dashboard.nav_pos'     },
      { to: '/dashboard/orders',       icon: ShoppingBag,     labelKey: 'dashboard.nav_orders'  },
      { to: '/dashboard/tables',       icon: LayoutGrid,      labelKey: 'dashboard.nav_tables'  },
      { to: '/dashboard/menu',         icon: UtensilsCrossed, labelKey: 'dashboard.nav_menu'    },
      { to: '/dashboard/qr',           icon: QrCode,          labelKey: 'dashboard.nav_qr'      },
      { to: '/dashboard/waiters',      icon: Users,           labelKey: 'dashboard.nav_waiters' },
      { to: '/dashboard/repartidores', icon: Truck,           labelKey: 'dashboard.nav_drivers' },
      { to: '/dashboard/clientes',     icon: ContactRound,    labelKey: 'dashboard.nav_clients' },
    ],
  },
  {
    section: 'Pantallas',
    items: [],
    showKitchen: true,
  },
  {
    section: 'Finanzas',
    items: [
      { to: '/dashboard/caja',         icon: Banknote,    labelKey: 'dashboard.nav_caja'         },
      { to: '/dashboard/tickets',      icon: Receipt,     labelKey: 'dashboard.nav_tickets'      },
      { to: '/dashboard/gastos',       icon: TrendingDown,labelKey: 'dashboard.nav_gastos'       },
      { to: '/dashboard/estadisticas', icon: BarChart2,   labelKey: 'dashboard.nav_estadisticas' },
    ],
  },
  {
    section: null,
    items: [
      { to: '/dashboard/hub', icon: Globe, labelKey: 'dashboard.nav_hub' },
    ],
  },
]

const RETAIL_NAV: NavGroup[] = [
  {
    section: 'Operaciones',
    items: [
      { to: '/dashboard',              icon: Home,         labelKey: 'dashboard.nav_home',     exact: true },
      { to: '/dashboard/caja',         icon: Banknote,     labelKey: 'dashboard.nav_pos'       },
      { to: '/dashboard/orders',       icon: ShoppingBag,  labelKey: 'dashboard.nav_orders'    },
      { to: '/dashboard/catalogo',     icon: ShoppingBag,  labelKey: 'dashboard.nav_catalogo'  },
      { to: '/dashboard/inventario',   icon: Warehouse,    labelKey: 'dashboard.nav_inventario'},
      { to: '/dashboard/clientes',     icon: ContactRound, labelKey: 'dashboard.nav_clients'   },
    ],
  },
  {
    section: 'Finanzas',
    items: [
      { to: '/dashboard/caja',         icon: Banknote,    labelKey: 'dashboard.nav_caja'         },
      { to: '/dashboard/tickets',      icon: Receipt,     labelKey: 'dashboard.nav_tickets'      },
      { to: '/dashboard/gastos',       icon: TrendingDown,labelKey: 'dashboard.nav_gastos'       },
      { to: '/dashboard/estadisticas', icon: BarChart2,   labelKey: 'dashboard.nav_estadisticas' },
    ],
  },
  {
    section: null,
    items: [
      { to: '/dashboard/hub', icon: Globe, labelKey: 'dashboard.nav_hub' },
    ],
  },
]

/* ── Shared NavLink renderer ─────────────────────────────────────────────── */

function NavItem({ to, icon: Icon, labelKey, exact }: NavItemDef) {
  const { t } = useTranslation()
  return (
    <NavLink
      to={to}
      end={exact}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors duration-150',
          isActive ? 'bg-brand-dim text-brand' : 'text-ink-3 hover:text-ink-1 hover:bg-surface-3',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            className={cn('w-[17px] h-[17px] flex-shrink-0', isActive ? 'text-brand' : 'text-ink-3')}
            strokeWidth={isActive ? 2.2 : 2}
          />
          {t(labelKey)}
        </>
      )}
    </NavLink>
  )
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="px-3 pt-5 pb-1.5 text-[10px] font-semibold text-ink-4 uppercase tracking-widest">
      {label}
    </p>
  )
}

/* ── Sidebar ─────────────────────────────────────────────────────────────── */

interface SidebarProps {
  restaurantSlug?: string
}

export function Sidebar({ restaurantSlug }: SidebarProps) {
  const { signOut } = useAuthStore()
  const { t }       = useTranslation()
  const businessType = useRestaurantStore(s => s.businessType)

  const navConfig = businessType === 'retail' ? RETAIL_NAV : GASTRONOMY_NAV

  return (
    <aside
      className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-60 flex-col"
      style={{ background: '#13161C', borderRight: '1px solid var(--border-subtle)' }}
    >
      {/* Logo */}
      <div className="px-5 py-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <img src="/logo.png" alt="MenuLife" className="h-8 w-auto" />
        <p className="text-[10px] text-ink-3 mt-1 font-medium uppercase tracking-widest">
          {t('dashboard.nav_panel')}
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
        {navConfig.map((group, gi) => {
          const hasContent = group.items.length > 0 || (group.showKitchen && !!restaurantSlug)
          if (!hasContent) return null

          return (
            <div key={gi}>
              {group.section ? (
                <SectionLabel label={group.section} />
              ) : (
                <div className="border-t my-3" style={{ borderColor: 'var(--border-subtle)' }} />
              )}

              {group.items.map((item) => <NavItem key={item.to} {...item} />)}

              {group.showKitchen && restaurantSlug && (
                <a
                  href={`/kitchen/${restaurantSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-ink-3 hover:text-ink-1 hover:bg-surface-3 transition-colors duration-150"
                >
                  <ChefHat className="w-[17px] h-[17px] flex-shrink-0" strokeWidth={2} />
                  {t('dashboard.nav_kitchen')}
                </a>
              )}
            </div>
          )
        })}
      </nav>

      {/* Bottom — Config + Logout */}
      <div className="px-3 py-3 space-y-0.5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <NavLink
          to="/dashboard/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors duration-150',
              isActive ? 'bg-brand-dim text-brand' : 'text-ink-3 hover:text-ink-1 hover:bg-surface-3',
            )
          }
        >
          {({ isActive }) => (
            <>
              <Settings
                className={cn('w-[17px] h-[17px] flex-shrink-0', isActive ? 'text-brand' : 'text-ink-3')}
                strokeWidth={isActive ? 2.2 : 2}
              />
              {t('dashboard.nav_settings')}
            </>
          )}
        </NavLink>

        <button
          onClick={() => signOut()}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-[13px] font-medium text-ink-3 hover:text-danger hover:bg-danger-dim transition-colors duration-150"
        >
          <LogOut className="w-[17px] h-[17px] flex-shrink-0" strokeWidth={2} />
          {t('dashboard.nav_logout')}
        </button>
      </div>
    </aside>
  )
}
