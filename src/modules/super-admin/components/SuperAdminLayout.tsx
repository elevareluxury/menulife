import { useId, useMemo, useState, type ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Store, ClipboardList, BarChart3, LogOut, DollarSign, Activity, ToggleLeft, Globe, FlaskConical, MessageSquareQuote, MoreHorizontal, X, Flag, Bug, TrendingUp, BadgeCheck, Users, History, ChevronDown, HeartPulse, Rocket } from 'lucide-react'
import { brandMarkSvg } from '@/lib/brandMark'
import { useSiteFlags } from '@/lib/siteFlags'
import { usePendingCounts, type PendingCounts } from '../lib/adminRpc'
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

type NavItem = { label: (t: AdminDict) => string; icon: typeof Store; to: string; end: boolean; badge?: keyof PendingCounts }

// Mycen primero; las pantallas de Business van en su propio grupo (abierto si Business está prendido)
const mycenItems: NavItem[] = [
  { label: t => t.nav.overview,      icon: LayoutDashboard,    to: '/super-admin',                end: true  },
  { label: t => t.nav.status,        icon: HeartPulse,         to: '/super-admin/estado',         end: false },
  { label: t => t.nav.growth,        icon: Rocket,             to: '/super-admin/crecimiento',    end: false },
  { label: t => t.shell.people,      icon: Users,              to: '/super-admin/personas',       end: false },
  { label: t => t.nav.reports,       icon: Flag,               to: '/super-admin/denuncias',      end: false, badge: 'reports' },
  { label: t => t.nav.verifications, icon: BadgeCheck,         to: '/super-admin/verificaciones', end: false, badge: 'verifications' },
  { label: t => t.nav.errors,        icon: Bug,                to: '/super-admin/errores',        end: false, badge: 'errors' },
  { label: t => t.nav.product,       icon: TrendingUp,         to: '/super-admin/producto',       end: false },
  { label: t => t.shell.activity,    icon: History,            to: '/super-admin/actividad',      end: false },
  { label: t => t.nav.landing,       icon: Globe,              to: '/super-admin/landing',        end: false },
  { label: t => t.nav.testimonials,  icon: MessageSquareQuote, to: '/super-admin/testimonios',    end: false },
]
const businessItems: NavItem[] = [
  { label: t => t.nav.businesses, icon: Store,         to: '/super-admin/negocios',      end: false },
  { label: t => t.nav.requests,   icon: ClipboardList, to: '/super-admin/solicitudes',   end: false },
  { label: t => t.nav.metrics,    icon: BarChart3,     to: '/super-admin/metricas',      end: false },
  { label: t => t.nav.plans,      icon: DollarSign,    to: '/super-admin/planes',        end: false },
  { label: t => t.nav.system,     icon: Activity,      to: '/super-admin/sistema',       end: false },
  { label: t => t.nav.flags,      icon: ToggleLeft,    to: '/super-admin/feature-flags', end: false },
  { label: t => t.nav.tester,     icon: FlaskConical,  to: '/super-admin/tester',        end: false },
]
// Barra de abajo en el celular: lo de todos los días + "Más" (todo el menú)
const barItems = mycenItems.filter(i => ['/super-admin', '/super-admin/estado', '/super-admin/denuncias', '/super-admin/errores'].includes(i.to))


// Botones de íconos de la barra del celular: 44 px de área táctil (guía del proyecto)
const ICON_BTN: React.CSSProperties = {
  color: TEXT_MUTED, minWidth: 44, minHeight: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 10,
}

function Brand({ t }: { t: AdminDict }) {
  // La huella de la marca (la misma del ícono de la app). Un id de degradé por copia: la del menú de escritorio queda
  // oculta en el celular y, si compartieran id, las demás se verían vacías.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const mark = useMemo(() => brandMarkSvg('#FF7A59', '#7DD3FC', `-admin${uid}`), [uid])
  return (
    <div className="flex items-center gap-2.5">
      <span aria-hidden="true" className="auth-brand-mark" style={{ display: 'block', width: 30, height: 30 }}
        dangerouslySetInnerHTML={{ __html: mark }} />
      <div>
        <div className="text-sm font-bold" style={{ color: TEXT }}>{t.layout.brand}</div>
        <div className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: ACCENT }}>{t.layout.admin}</div>
      </div>
    </div>
  )
}

function Badge({ n, t }: { n: number; t: AdminDict }) {
  if (!n) return null
  return (
    <span aria-label={t.shell.pending(n)} style={{
      marginInlineStart: 'auto', minWidth: 20, height: 20, padding: '0 6px', borderRadius: 999, background: ACCENT, color: '#fff',
      fontSize: 11.5, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    }}>{n > 99 ? '99+' : n}</span>
  )
}

function NavItems({ items, t, counts, onNavigate }: { items: NavItem[]; t: AdminDict; counts: PendingCounts | null; onNavigate?: () => void }) {
  return (
    <>
      {items.map(({ label, icon: Icon, to, end, badge }) => (
        <NavLink key={to} to={to} end={end} onClick={onNavigate}
          style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: '10px', borderRadius: '10px', padding: '10px 12px', minHeight: 44,
            fontSize: '13.5px', fontWeight: 500, transition: 'all 0.15s',
            backgroundColor: isActive ? `${ACCENT}18` : 'transparent',
            color: isActive ? ACCENT : TEXT_MUTED,
          })}>
          <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          {label(t)}
          {badge && counts && <Badge n={counts[badge]} t={t} />}
        </NavLink>
      ))}
    </>
  )
}

function NavList({ t, counts, onNavigate }: { t: AdminDict; counts: PendingCounts | null; onNavigate?: () => void }) {
  const { business } = useSiteFlags()
  const { pathname } = useLocation()
  const inBusiness = businessItems.some(i => pathname.startsWith(i.to))
  const [open, setOpen] = useState<boolean | null>(null)
  const showBusiness = open ?? (business || inBusiness)
  const head = (text: string) => (
    <p className="px-3 pt-3 pb-1 text-[11px] font-semibold tracking-widest uppercase" style={{ color: TEXT_MUTED }}>{text}</p>
  )
  return (
    <nav aria-label={t.layout.nav} className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
      {head(t.shell.groupMycen)}
      <NavItems items={mycenItems} t={t} counts={counts} onNavigate={onNavigate} />
      <button type="button" aria-expanded={showBusiness} onClick={() => setOpen(!showBusiness)}
        className="w-full flex items-center justify-between px-3 pt-4 pb-1 text-[11px] font-semibold tracking-widest uppercase"
        style={{ color: TEXT_MUTED, minHeight: 44, background: 'transparent', border: 'none', cursor: 'pointer' }}>
        <span>{t.shell.groupBusiness}</span>
        <span className="sr-only">{showBusiness ? t.shell.hideBusiness : t.shell.showBusiness}</span>
        <ChevronDown className="w-4 h-4" aria-hidden="true" style={{ transform: showBusiness ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>
      {showBusiness && <NavItems items={businessItems} t={t} counts={counts} onNavigate={onNavigate} />}
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
  const { pathname } = useLocation()
  const counts = usePendingCounts(pathname)

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
        <NavList t={t} counts={counts} />
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
        <NavList t={t} counts={counts} onNavigate={() => setMobileOpen(false)} />
        {footer}
      </aside>

      {/* ── Content ────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        {/* Celular: marca arriba (sin menú hamburguesa) y barra de abajo con lo de todos los días + "Más" */}
        <div className="lg:hidden sticky top-0 z-10 flex items-center px-4 h-12"
          style={{ backgroundColor: SIDEBAR_BG, borderBottom: `1px solid ${BORDER}` }}>
          <Brand t={t} />
        </div>
        <div className="p-4 pb-24 sm:p-6 sm:pb-24 lg:p-8">
          {children}
        </div>
      </main>

      <nav aria-label={t.layout.nav} className="lg:hidden fixed bottom-0 inset-x-0 z-30 flex"
        style={{ backgroundColor: SIDEBAR_BG, borderTop: `1px solid ${BORDER}`, paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {barItems.map(({ label, icon: Icon, to, end, badge }) => (
          <NavLink key={to} to={to} end={end}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold"
            style={({ isActive }) => ({ minHeight: 56, color: isActive ? ACCENT : TEXT_MUTED, position: 'relative' })}>
            <Icon className="w-5 h-5" aria-hidden="true" />
            <span className="truncate max-w-full px-1">{label(t)}</span>
            {badge && counts && counts[badge] > 0 && (
              <span aria-label={t.shell.pending(counts[badge])} style={{
                position: 'absolute', top: 6, insetInlineStart: '55%', minWidth: 16, height: 16, borderRadius: 999, background: ACCENT,
                color: '#fff', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
              }}>{counts[badge] > 99 ? '99+' : counts[badge]}</span>
            )}
          </NavLink>
        ))}
        <button type="button" onClick={() => setMobileOpen(true)} aria-expanded={mobileOpen}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold"
          style={{ minHeight: 56, color: TEXT_MUTED, background: 'transparent', border: 'none' }}>
          <MoreHorizontal className="w-5 h-5" aria-hidden="true" />
          {t.shell.more}
        </button>
      </nav>
    </div>
  )
}
