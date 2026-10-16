import { useState, type ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Store, ClipboardList, BarChart3, LogOut, Zap, DollarSign, Activity, ToggleLeft, Globe, FlaskConical, MessageSquareQuote, Menu, X, Flag, Bug, TrendingUp, BadgeCheck } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useAdminT, type AdminDict } from '@/i18n/app/admin'
import { useAppLang } from '@/i18n/app/store'
import { langDir } from '@/i18n/app/languages'
import { useLangDir } from '@/i18n/app/useLangDir'

const BG         = '#0F1115'
const SIDEBAR_BG = '#0A0D12'
const BORDER     = 'rgba(255,255,255,0.06)'
const TEXT       = '#F5F7FA'
const TEXT_MUTED = '#98A2B3'
const ACCENT     = '#FF6B7A'

const navItems: Array<{ key: keyof AdminDict['nav']; icon: typeof Store; to: string; end: boolean }> = [
  { key: 'overview',      icon: LayoutDashboard,    to: '/super-admin',               end: true  },
  { key: 'requests',      icon: ClipboardList,      to: '/super-admin/solicitudes',   end: false },
  { key: 'reports',       icon: Flag,               to: '/super-admin/denuncias',     end: false },
  { key: 'verifications', icon: BadgeCheck,         to: '/super-admin/verificaciones', end: false },
  { key: 'errors',        icon: Bug,                to: '/super-admin/errores',       end: false },
  { key: 'product',       icon: TrendingUp,         to: '/super-admin/producto',      end: false },
  { key: 'businesses',    icon: Store,              to: '/super-admin/negocios',      end: false },
  { key: 'metrics',       icon: BarChart3,          to: '/super-admin/metricas',      end: false },
  { key: 'plans',         icon: DollarSign,         to: '/super-admin/planes',        end: false },
  { key: 'system',        icon: Activity,           to: '/super-admin/sistema',       end: false },
  { key: 'flags',         icon: ToggleLeft,         to: '/super-admin/feature-flags', end: false },
  { key: 'landing',       icon: Globe,              to: '/super-admin/landing',       end: false },
  { key: 'testimonials',  icon: MessageSquareQuote, to: '/super-admin/testimonios',   end: false },
  { key: 'tester',        icon: FlaskConical,       to: '/super-admin/tester',        end: false },
]

// Botones de íconos de la barra del celular: 44 px de área táctil (guía del proyecto)
const ICON_BTN: React.CSSProperties = {
  color: TEXT_MUTED, minWidth: 44, minHeight: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 10,
}

function Brand({ t }: { t: AdminDict }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${ACCENT}, #FF8E53)` }}>
        <Zap className="w-3.5 h-3.5 text-white" aria-hidden="true" />
      </div>
      <div>
        <div className="text-sm font-bold" style={{ color: TEXT }}>{t.layout.brand}</div>
        <div className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: ACCENT }}>{t.layout.admin}</div>
      </div>
    </div>
  )
}

function NavList({ t, onNavigate }: { t: AdminDict; onNavigate?: () => void }) {
  return (
    <nav aria-label={t.layout.nav} className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
      {navItems.map(({ key, icon: Icon, to, end }) => (
        <NavLink key={to} to={to} end={end} onClick={onNavigate}
          style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: '10px', borderRadius: '10px', padding: '10px 12px', minHeight: 44,
            fontSize: '13.5px', fontWeight: 500, transition: 'all 0.15s',
            backgroundColor: isActive ? `${ACCENT}18` : 'transparent',
            color: isActive ? ACCENT : TEXT_MUTED,
          })}>
          <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          {t.nav[key]}
        </NavLink>
      ))}
    </nav>
  )
}

export function SuperAdminLayout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuthStore()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const t = useAdminT()
  const rtl = langDir(useAppLang(s => s.lang)) === 'rtl'
  useLangDir()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const footer = (
    <div className="px-2 pb-4 pt-3 space-y-0.5" style={{ borderTop: `1px solid ${BORDER}` }}>
      <p className="px-3 py-1 text-[12px] truncate" style={{ color: TEXT_MUTED }}>{user?.email}</p>
      <button type="button" onClick={handleSignOut}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all"
        style={{ color: TEXT_MUTED, minHeight: 44 }}>
        <LogOut className="w-4 h-4" aria-hidden="true" />
        {t.layout.signOut}
      </button>
    </div>
  )

  return (
    <div className="my-tap-root flex h-screen overflow-hidden" style={{ backgroundColor: BG, color: TEXT }}>
      {/* ── Sidebar (desktop) ─────────────────────────────────────── */}
      <aside className="hidden lg:flex h-screen w-56 flex-col flex-shrink-0" style={{ backgroundColor: SIDEBAR_BG, borderInlineEnd: `1px solid ${BORDER}` }}>
        <div className="px-5 py-5" style={{ borderBottom: `1px solid ${BORDER}` }}><Brand t={t} /></div>
        <NavList t={t} />
        {footer}
      </aside>

      {/* ── Mobile drawer overlay ─────────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}
          onClick={() => setMobileOpen(false)} />
      )}

      {/* ── Mobile drawer ─────────────────────────────────────────── */}
      <aside className="fixed inset-y-0 z-50 w-56 flex flex-col lg:hidden transition-transform duration-200"
        aria-hidden={!mobileOpen} inert={!mobileOpen}
        style={{
          insetInlineStart: 0, backgroundColor: SIDEBAR_BG, borderInlineEnd: `1px solid ${BORDER}`,
          transform: mobileOpen ? 'translateX(0)' : `translateX(${rtl ? '' : '-'}100%)`,
        }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <Brand t={t} />
          <button type="button" aria-label={t.layout.closeMenu} onClick={() => setMobileOpen(false)} style={ICON_BTN}>
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
        <NavList t={t} onNavigate={() => setMobileOpen(false)} />
        {footer}
      </aside>

      {/* ── Content ────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-10 flex items-center justify-between px-2 h-12"
          style={{ backgroundColor: SIDEBAR_BG, borderBottom: `1px solid ${BORDER}` }}>
          <button type="button" aria-label={t.layout.openMenu} onClick={() => setMobileOpen(true)} style={ICON_BTN}>
            <Menu className="w-5 h-5" aria-hidden="true" />
          </button>
          <span className="text-sm font-bold" style={{ color: TEXT }}>{t.layout.brand} {t.layout.admin}</span>
          <div style={{ width: 44 }} />
        </div>

        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
