import { useNavigate } from 'react-router-dom'
import { Bell, CalendarDays, Users, Layers, TrendingUp, ChevronRight, CheckCircle2, Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useRestaurant } from '@/modules/menu/hooks/useRestaurant'
import { useTerminology } from '../hooks/useTerminology'

function greetingKey(): 'dashboard.greeting_morning' | 'dashboard.greeting_afternoon' | 'dashboard.greeting_evening' {
  const h = new Date().getHours()
  if (h < 12) return 'dashboard.greeting_morning'
  if (h < 20) return 'dashboard.greeting_afternoon'
  return 'dashboard.greeting_evening'
}

function formatDateLabel(): string {
  const d = new Date()
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`
}

/* ── Quick Access Card ───────────────────────────────────────────────────── */

interface QuickCardProps {
  icon: React.ReactNode
  title: string
  subtitle: string
  to: string
  accent?: boolean
  navigate: (to: string) => void
}

function QuickCard({ icon, title, subtitle, to, accent = false, navigate }: QuickCardProps) {
  return (
    <button
      onClick={() => navigate(to)}
      className="flex items-start justify-between p-4 rounded-2xl text-left transition-all active:scale-[0.98] hover:scale-[1.01]"
      style={{
        backgroundColor: accent ? '#F4705A12' : '#1a1a1a',
        border: `1px solid ${accent ? '#F4705A40' : '#2a2a2a'}`,
      }}
    >
      <div className="flex-1 min-w-0">
        <div className="mb-2">{icon}</div>
        <p className="font-semibold text-white text-sm leading-tight">{title}</p>
        <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.45)' }}>{subtitle}</p>
      </div>
      <ChevronRight className="w-4 h-4 mt-1 flex-shrink-0 ml-2" style={{ color: 'rgba(255,255,255,0.2)' }} />
    </button>
  )
}

/* ── Empty state block ───────────────────────────────────────────────────── */

interface EmptyBlockProps {
  label: string
  icon: React.ReactNode
  title: string
  description: string
  ctaLabel: string
  ctaTo: string
  navigate: (to: string) => void
}

function EmptyBlock({ label, icon, title, description, ctaLabel, ctaTo, navigate }: EmptyBlockProps) {
  return (
    <div>
      <p
        className="text-[10px] font-bold uppercase tracking-widest mb-2"
        style={{ color: 'rgba(255,255,255,0.35)' }}
      >
        {label}
      </p>
      <div
        className="rounded-2xl p-5"
        style={{ backgroundColor: '#1c1f26', border: '1px solid #2a2d35' }}
      >
        <div className="flex flex-col items-center text-center py-2">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
            style={{ backgroundColor: 'rgba(244,112,90,0.08)', border: '1px solid rgba(244,112,90,0.15)' }}
          >
            {icon}
          </div>
          <p className="text-sm font-semibold text-white mb-1">{title}</p>
          <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>{description}</p>
          <button
            onClick={() => navigate(ctaTo)}
            className="px-4 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{ backgroundColor: '#F4705A', color: '#fff' }}
          >
            {ctaLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Main ────────────────────────────────────────────────────────────────── */

export function ServicesDashboard() {
  const { restaurant } = useRestaurant()
  const navigate = useNavigate()
  const { term } = useTerminology()
  const { t } = useTranslation()
  const initial = (restaurant?.name ?? 'S').charAt(0).toUpperCase()

  return (
    <div className="space-y-5 pb-8 max-w-xl mx-auto lg:max-w-none">

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-3 min-w-0">
          {restaurant?.logo_url ? (
            <img
              src={restaurant.logo_url}
              alt={restaurant.name}
              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
              style={{ backgroundColor: '#F4705A' }}
            >
              {initial}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>{t(greetingKey())}</p>
            <h1 className="text-xl font-bold text-white leading-tight truncate">{restaurant?.name ?? 'MenuLife'}</h1>
          </div>
        </div>
        <button
          onClick={() => navigate('/dashboard/notificaciones')}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
          style={{ backgroundColor: '#1c1f26', border: '1px solid #2a2d35' }}
        >
          <Bell className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.5)' }} />
        </button>
      </div>

      {/* ── HOY ────────────────────────────────────────────────── */}
      <EmptyBlock
        label={`HOY — ${formatDateLabel()}`}
        icon={<CalendarDays className="w-5 h-5" style={{ color: '#F4705A' }} />}
        title="Sin turnos para hoy"
        description="Tu agenda está tranquila. Configurá horarios y empezá a recibir turnos."
        ctaLabel="Ir a Agenda →"
        ctaTo="/dashboard/services/agenda"
        navigate={navigate}
      />

      {/* ── PRÓXIMO ────────────────────────────────────────────── */}
      <EmptyBlock
        label="PRÓXIMO TURNO"
        icon={<Clock className="w-5 h-5" style={{ color: '#F4705A' }} />}
        title="No hay turnos próximos"
        description="Tus próximos turnos aparecerán aquí para que siempre estés preparado."
        ctaLabel="Configurar agenda →"
        ctaTo="/dashboard/services/agenda"
        navigate={navigate}
      />

      {/* ── ATENCIÓN ───────────────────────────────────────────── */}
      <div>
        <p
          className="text-[10px] font-bold uppercase tracking-widest mb-2"
          style={{ color: 'rgba(255,255,255,0.35)' }}
        >
          ATENCIÓN
        </p>
        <div
          className="rounded-2xl px-5 py-4 flex items-center gap-3"
          style={{ backgroundColor: '#0d1a12', border: '1px solid #1a3024' }}
        >
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: '#22c55e' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: '#86efac' }}>Todo en orden</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(134,239,172,0.6)' }}>No hay acciones pendientes en este momento</p>
          </div>
        </div>
      </div>

      {/* ── ACCESO RÁPIDO ──────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-bold text-white mb-2">Acceso rápido</h2>
        <div className="grid grid-cols-2 gap-3">
          <QuickCard
            icon={<Users className="w-6 h-6" style={{ color: 'rgba(255,255,255,0.4)' }} />}
            title={term('customers')}
            subtitle="0 registrados"
            to="/dashboard/services/clientes"
            navigate={navigate}
          />
          <QuickCard
            icon={<Layers className="w-6 h-6" style={{ color: 'rgba(255,255,255,0.4)' }} />}
            title={term('services')}
            subtitle="Configurá tu oferta"
            to="/dashboard/services/servicios"
            navigate={navigate}
          />
          <QuickCard
            icon={<TrendingUp className="w-6 h-6" style={{ color: 'rgba(255,255,255,0.4)' }} />}
            title="Ventas"
            subtitle="Ver historial"
            to="/dashboard/services/ventas"
            navigate={navigate}
          />
          <QuickCard
            icon={<CalendarDays className="w-6 h-6" style={{ color: 'rgba(255,255,255,0.4)' }} />}
            title="Agenda"
            subtitle="Gestión de turnos"
            to="/dashboard/services/agenda"
            navigate={navigate}
          />
        </div>
      </div>

    </div>
  )
}
