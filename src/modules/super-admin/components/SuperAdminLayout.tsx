import { type ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Store, ClipboardList, BarChart3, LogOut, Zap, DollarSign, Activity, ToggleLeft, Globe, FlaskConical } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

const BG         = '#0F1115'
const SIDEBAR_BG = '#0A0D12'
const BORDER     = 'rgba(255,255,255,0.06)'
const TEXT       = '#F5F7FA'
const TEXT_MUTED = '#98A2B3'
const ACCENT     = '#FF6B7A'

const navItems = [
  { label: 'Overview',      icon: LayoutDashboard, to: '/super-admin',                    end: true  },
  { label: 'Solicitudes',   icon: ClipboardList,   to: '/super-admin/solicitudes',         end: false },
  { label: 'Negocios',      icon: Store,           to: '/super-admin/negocios',            end: false },
  { label: 'Métricas',      icon: BarChart3,       to: '/super-admin/metricas',            end: false },
  { label: 'Planes',        icon: DollarSign,      to: '/super-admin/planes',              end: false },
  { label: 'Sistema',       icon: Activity,        to: '/super-admin/sistema',             end: false },
  { label: 'Feature Flags', icon: ToggleLeft,      to: '/super-admin/feature-flags',       end: false },
  { label: 'Landing Config', icon: Globe,          to: '/super-admin/landing',             end: false },
  { label: 'Tester',         icon: FlaskConical,   to: '/super-admin/tester',              end: false },
]

export function SuperAdminLayout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuthStore()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: BG, color: TEXT }}>
      {/* ── Sidebar (desktop) ─────────────────────────────────────── */}
      <aside
        className="hidden lg:flex h-screen w-56 flex-col flex-shrink-0"
        style={{ backgroundColor: SIDEBAR_BG, borderRight: `1px solid ${BORDER}` }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${ACCENT}, #FF8E53)` }}
          >
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold" style={{ color: TEXT }}>MenuLife</div>
            <div className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: ACCENT }}>
              Admin
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ label, icon: Icon, to, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                borderRadius: '10px',
                padding: '10px 12px',
                fontSize: '13.5px',
                fontWeight: 500,
                transition: 'all 0.15s',
                backgroundColor: isActive ? `${ACCENT}18` : 'transparent',
                color: isActive ? ACCENT : TEXT_MUTED,
              })}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User + signout */}
        <div className="px-2 pb-4 pt-3 space-y-0.5" style={{ borderTop: `1px solid ${BORDER}` }}>
          <p className="px-3 py-1 text-[11px] truncate" style={{ color: TEXT_MUTED }}>
            {user?.email}
          </p>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all"
            style={{ color: TEXT_MUTED }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = TEXT }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = TEXT_MUTED }}
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── Content ────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile top bar */}
        <div
          className="lg:hidden sticky top-0 z-10 flex items-center justify-between px-4 h-12"
          style={{ backgroundColor: SIDEBAR_BG, borderBottom: `1px solid ${BORDER}` }}
        >
          <span className="text-sm font-bold" style={{ color: TEXT }}>MenuLife Admin</span>
          <button onClick={handleSignOut} style={{ color: TEXT_MUTED }}>
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
