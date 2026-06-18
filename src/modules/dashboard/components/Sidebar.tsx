import { useState, useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import {
  Home, ShoppingBag, LayoutGrid, UtensilsCrossed,
  QrCode, Users, ChefHat, LogOut, Truck, ContactRound,
  BarChart2, Settings, Banknote, Receipt, TrendingDown,
  Globe, Warehouse, Lock, X, CalendarDays, Layers,
  FolderOpen, TrendingUp, FileText, BadgeCheck, Package2, ClipboardList, ScrollText, Sun,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/authStore'
import { useRestaurantStore } from '@/store/restaurantStore'
import { useTerminology } from '@/modules/services/hooks/useTerminology'
import { LocationSwitcher } from '@/modules/enterprise/components/LocationSwitcher'
import { cn } from '@/lib/utils'

interface NavItemDef {
  to: string
  icon: LucideIcon
  labelKey?: string   // i18n key (gastronomy / retail)
  label?: string      // direct string (services — from naming layer)
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
    section: 'dashboard.section_operations',
    items: [
      { to: '/dashboard',              icon: Home,            labelKey: 'dashboard.nav_home',    exact: true },
      { to: '/dashboard/orders',       icon: ShoppingBag,     labelKey: 'dashboard.nav_orders'   },
      { to: '/dashboard/tables',       icon: LayoutGrid,      labelKey: 'dashboard.nav_tables'   },
      { to: '/dashboard/menu',         icon: UtensilsCrossed, labelKey: 'dashboard.nav_menu'     },
      { to: '/dashboard/qr',           icon: QrCode,          labelKey: 'dashboard.nav_qr'       },
      { to: '/dashboard/waiters',      icon: Users,           labelKey: 'dashboard.nav_waiters'  },
      { to: '/dashboard/repartidores', icon: Truck,           labelKey: 'dashboard.nav_drivers'  },
      { to: '/dashboard/clientes',     icon: ContactRound,    labelKey: 'dashboard.nav_clients'  },
    ],
  },
  {
    section: 'dashboard.section_screens',
    items: [],
    showKitchen: true,
  },
  {
    section: 'dashboard.section_pos',
    items: [
      { to: '/dashboard/caja',    icon: Banknote,    labelKey: 'dashboard.nav_caja'    },
      { to: '/dashboard/tickets', icon: Receipt,     labelKey: 'dashboard.nav_tickets' },
      { to: '/dashboard/gastos',  icon: TrendingDown,labelKey: 'dashboard.nav_gastos'  },
    ],
  },
  {
    section: 'dashboard.section_finance',
    items: [
      { to: '/dashboard/estadisticas', icon: BarChart2, labelKey: 'dashboard.nav_estadisticas' },
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
    section: 'dashboard.section_operations',
    items: [
      { to: '/dashboard',            icon: Home,         labelKey: 'dashboard.nav_home',      exact: true },
      { to: '/dashboard/orders',     icon: ShoppingBag,  labelKey: 'dashboard.nav_orders'     },
      { to: '/dashboard/catalogo',   icon: ShoppingBag,  labelKey: 'dashboard.nav_catalogo'   },
      { to: '/dashboard/inventario', icon: Warehouse,    labelKey: 'dashboard.nav_inventario' },
      { to: '/dashboard/clientes',   icon: ContactRound, labelKey: 'dashboard.nav_clients'    },
    ],
  },
  {
    section: 'dashboard.section_pos',
    items: [
      { to: '/dashboard/caja',    icon: Banknote,    labelKey: 'dashboard.nav_caja'    },
      { to: '/dashboard/tickets', icon: Receipt,     labelKey: 'dashboard.nav_tickets' },
      { to: '/dashboard/gastos',  icon: TrendingDown,labelKey: 'dashboard.nav_gastos'  },
    ],
  },
  {
    section: 'dashboard.section_finance',
    items: [
      { to: '/dashboard/estadisticas', icon: BarChart2, labelKey: 'dashboard.nav_estadisticas' },
    ],
  },
  {
    section: null,
    items: [
      { to: '/dashboard/hub', icon: Globe, labelKey: 'dashboard.nav_hub' },
    ],
  },
]

/* ── Services nav (dynamic via terminology) ──────────────────────────────── */

function useServicesNav(): NavGroup[] {
  const { term } = useTerminology()
  return useMemo(() => [
    {
      section: 'dashboard.section_operations',
      items: [
        { to: '/dashboard',                   icon: Home,         labelKey: 'dashboard.nav_home', exact: true },
        { to: '/dashboard/services/clientes', icon: ContactRound, label: term('customers') },
        { to: '/dashboard/services/agenda',   icon: CalendarDays, labelKey: 'dashboard.nav_agenda' },
      ],
    },
    {
      section: 'dashboard.section_business',
      items: [
        { to: '/dashboard/services/servicios',  icon: Layers,     label: term('services')   },
        { to: '/dashboard/services/recursos',   icon: FolderOpen, label: term('resources')  },
        { to: '/dashboard/services/membresias',   icon: BadgeCheck,    label: term('memberships') },
        { to: '/dashboard/services/paquetes',    icon: Package2,      label: term('packages')    },
        { to: '/dashboard/services/presupuestos',icon: ScrollText,    label: term('quotes')      },
        { to: '/dashboard/services/forms',       icon: ClipboardList, labelKey: 'dashboard.nav_forms' },
      ],
    },
    {
      section: 'dashboard.section_finance',
      items: [
        { to: '/dashboard/services/ventas',   icon: TrendingUp, labelKey: 'dashboard.nav_ventas'   },
        { to: '/dashboard/services/reportes', icon: FileText,   labelKey: 'dashboard.nav_reportes' },
      ],
    },
    {
      section: null,
      items: [{ to: '/dashboard/hub', icon: Globe, labelKey: 'dashboard.nav_hub' }],
    },
  ], [term])
}

/* ── UpgradeModal ────────────────────────────────────────────────────────── */

const WA_NUMBER = '543416962827'

function UpgradeModal({ restaurantName, onClose }: { restaurantName: string; onClose: () => void }) {
  const waText = encodeURIComponent(`Hola! Quiero activar MenuLife OS para ${restaurantName}`)
  const waUrl  = `https://wa.me/${WA_NUMBER}?text=${waText}`

  const features = [
    'Menú digital interactivo con pedidos',
    'Mesa, mozos y cocina en tiempo real',
    'Punto de venta (POS) completo',
    'Estadísticas y reportes',
    'Gestión de delivery y takeaway',
    'CRM de clientes',
    'Pantalla de cocina',
  ]

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: '380px',
          background: '#171A21', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '20px', padding: '32px 28px',
          position: 'relative',
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '16px', right: '16px',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.4)', padding: '4px',
          }}
        >
          <X className="w-4 h-4" />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '12px',
            background: 'rgba(244,112,90,0.12)', border: '1px solid rgba(244,112,90,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <span style={{ fontSize: '22px' }}>🚀</span>
          </div>
          <h2 style={{
            fontFamily: 'var(--font-jakarta)', fontSize: '18px', fontWeight: 700,
            color: '#F5F7FA', margin: '0 0 8px',
          }}>
            Activá MenuLife OS
          </h2>
          <p style={{
            fontFamily: 'var(--font-jakarta)', fontSize: '13px',
            color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.5,
          }}>
            Desde{' '}
            <span style={{ color: '#F4705A', fontWeight: 700 }}>USD 70/mes</span>
            {' '}— todo lo que necesita tu negocio
          </p>
        </div>

        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {features.map(f => (
            <li key={f} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              fontFamily: 'var(--font-jakarta)', fontSize: '13px', color: 'rgba(255,255,255,0.65)',
            }}>
              <span style={{ color: '#10B981', flexShrink: 0, fontSize: '12px' }}>✓</span>
              {f}
            </li>
          ))}
        </ul>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block', textAlign: 'center',
              padding: '13px', borderRadius: '50px', border: 'none',
              background: '#F4705A', color: '#fff',
              fontSize: '14px', fontWeight: 600,
              fontFamily: 'var(--font-jakarta)', textDecoration: 'none',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 20px rgba(244,112,90,0.4)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '' }}
          >
            Quiero activarlo →
          </a>
          <button
            onClick={onClose}
            style={{
              padding: '11px', borderRadius: '50px',
              background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.45)', fontSize: '13px', fontWeight: 500,
              cursor: 'pointer', fontFamily: 'var(--font-jakarta)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)' }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Nav item renderers ──────────────────────────────────────────────────── */

function NavItem({ to, icon: Icon, labelKey, label, exact }: NavItemDef) {
  const { t } = useTranslation()
  const text = label ?? t(labelKey ?? '')
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
          {text}
        </>
      )}
    </NavLink>
  )
}

function LockedNavItem({ icon: Icon, labelKey, label, onUnlock }: { icon: LucideIcon; labelKey?: string; label?: string; onUnlock: () => void }) {
  const { t } = useTranslation()
  const text = label ?? t(labelKey ?? '')
  return (
    <button
      onClick={onUnlock}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium w-full text-left transition-colors duration-150 cursor-pointer"
      style={{ opacity: 0.4 }}
    >
      <Icon className="w-[17px] h-[17px] flex-shrink-0 text-ink-3" strokeWidth={2} />
      <span className="flex-1 text-ink-3">{text}</span>
      <Lock className="w-3 h-3 text-ink-4 flex-shrink-0" strokeWidth={2} />
    </button>
  )
}

function SectionLabel({ label }: { label: string }) {
  const { t } = useTranslation()
  return (
    <p className="px-3 pt-5 pb-1.5 text-[10px] font-semibold text-ink-4 uppercase tracking-widest">
      {t(label)}
    </p>
  )
}

/* ── Sidebar ─────────────────────────────────────────────────────────────── */

interface SidebarProps {
  restaurantSlug?: string
  restaurantName?: string
}

export function Sidebar({ restaurantSlug, restaurantName = '' }: SidebarProps) {
  const { signOut }    = useAuthStore()
  const { t }          = useTranslation()
  const businessType   = useRestaurantStore(s => s.businessType)
  const plan           = useRestaurantStore(s => s.plan)
  const [showUpgrade, setShowUpgrade] = useState(false)

  const servicesNav = useServicesNav()
  const isHubFree   = !plan || plan === 'hub_free'
  const navConfig   = businessType === 'services'
    ? servicesNav
    : businessType === 'retail'
      ? RETAIL_NAV
      : GASTRONOMY_NAV

  return (
    <>
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

        {/* Location Switcher (multi-location only) */}
        <LocationSwitcher />

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
          {isHubFree ? (
            /* hub_free — only Hub item is active, rest are locked */
            <>
              {navConfig.flatMap(g => g.items).filter(item => item.to !== '/dashboard/hub').map(item => (
                <LockedNavItem key={item.to} icon={item.icon} labelKey={item.labelKey} onUnlock={() => setShowUpgrade(true)} />
              ))}
              <div className="border-t my-3" style={{ borderColor: 'var(--border-subtle)' }} />
              <NavItem to="/dashboard/hub" icon={Globe} labelKey="dashboard.nav_hub" />
            </>
          ) : (
            navConfig.map((group, gi) => {
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
            })
          )}
        </nav>

        {/* Life OS shortcut */}
        {!isHubFree && (
          <div className="px-3 py-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <NavLink
              to="/life"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-ink-3 hover:text-ink-1 hover:bg-surface-3 transition-colors duration-150"
            >
              <Sun className="w-[17px] h-[17px] flex-shrink-0 text-ink-3" strokeWidth={2} />
              Life
            </NavLink>
          </div>
        )}

        {/* Bottom — Config + Logout */}
        <div className="px-3 py-3 space-y-0.5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          {isHubFree ? (
            <button
              onClick={() => setShowUpgrade(true)}
              className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-[13px] font-medium transition-colors duration-150"
              style={{ opacity: 0.4 }}
            >
              <Settings className="w-[17px] h-[17px] flex-shrink-0 text-ink-3" strokeWidth={2} />
              <span className="flex-1 text-left text-ink-3">{t('dashboard.nav_settings')}</span>
              <Lock className="w-3 h-3 text-ink-4 flex-shrink-0" strokeWidth={2} />
            </button>
          ) : (
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
          )}

          <button
            onClick={() => signOut()}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-[13px] font-medium text-ink-3 hover:text-danger hover:bg-danger-dim transition-colors duration-150"
          >
            <LogOut className="w-[17px] h-[17px] flex-shrink-0" strokeWidth={2} />
            {t('dashboard.nav_logout')}
          </button>
        </div>
      </aside>

      {showUpgrade && (
        <UpgradeModal
          restaurantName={restaurantName}
          onClose={() => setShowUpgrade(false)}
        />
      )}
    </>
  )
}
