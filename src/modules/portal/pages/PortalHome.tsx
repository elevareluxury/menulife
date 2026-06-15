import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calendar, Star, Package, FileText, AlertCircle, ChevronRight, Clock,
} from 'lucide-react'
import { usePortalCtx } from '../PortalApp'
import { apiGetHome } from '../portalAPI'
import type { PortalHome as HomeData } from '../portalTypes'
import { fmtDate, fmtTime, BOOKING_STATUS_COLOR } from '../portalTypes'

function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="w-6 h-6 border-2 rounded-full animate-spin"
        style={{ borderColor: 'rgba(255,255,255,0.08)', borderTopColor: '#F4705A' }} />
    </div>
  )
}

function getFirstName(name: string): string {
  return name.split(' ')[0] ?? name
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

function getTodayLabel(): string {
  return new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function PortalHome() {
  const { session, restaurantId } = usePortalCtx()
  const navigate = useNavigate()
  const [home, setHome]     = useState<HomeData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiGetHome(session.token).then(data => {
      setHome(data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [session.token])

  if (loading) return <Spinner />

  const base = `/portal/${restaurantId}`
  const nb   = home?.next_booking
  const mem  = home?.membership

  return (
    <div>
      {/* Greeting */}
      <div className="mb-6">
        <p className="text-xs font-semibold mb-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {getTodayLabel()}
        </p>
        <h1 className="text-2xl font-bold text-white leading-tight">
          {getGreeting()},{' '}
          <span style={{ color: '#F4705A' }}>
            {getFirstName(home?.customer.full_name ?? session.customer_name)}
          </span>
        </h1>
      </div>

      {/* Next booking card */}
      {nb ? (
        <div
          className="rounded-3xl p-5 mb-4 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #1C1F28 0%, #252932 100%)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {/* Accent dot */}
          <div
            className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10"
            style={{ background: '#F4705A', transform: 'translate(40%, -40%)' }}
          />
          <div
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 mb-3 text-[10px] font-bold uppercase tracking-wider"
            style={{ background: 'rgba(244,112,90,0.12)', color: '#F4705A' }}
          >
            <Calendar className="w-3 h-3" />
            Próxima cita
          </div>

          <div className="mb-4">
            <p className="text-lg font-bold text-white leading-snug mb-1">
              {nb.service_name ?? nb.title ?? 'Reserva'}
            </p>
            <div className="flex items-center gap-3" style={{ color: 'rgba(255,255,255,0.55)' }}>
              <span className="flex items-center gap-1.5 text-sm">
                <Clock className="w-3.5 h-3.5" />
                {fmtDate(nb.starts_at, { weekday: 'short', day: 'numeric', month: 'short' })}
                {' · '}
                {fmtTime(nb.starts_at)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold"
              style={{
                background: `${BOOKING_STATUS_COLOR[nb.status] ?? 'rgba(255,255,255,0.1)'}22`,
                color: BOOKING_STATUS_COLOR[nb.status] ?? 'rgba(255,255,255,0.5)',
              }}
            >
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'currentColor' }} />
              {nb.status === 'confirmed' ? 'Confirmada' : nb.status === 'pending' ? 'Pendiente' : 'En espera'}
            </div>
            <button
              onClick={() => navigate(`${base}/reservas`)}
              className="flex items-center gap-1 text-xs font-semibold"
              style={{ color: '#F4705A' }}
            >
              Ver todas
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div
          className="rounded-3xl p-5 mb-4 flex items-center gap-4"
          style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            <Calendar className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.2)' }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Sin próximas citas</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Cuando tengas una reserva, aparecerá aquí
            </p>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { icon: Calendar, label: 'Reservas', value: home?.packages_active !== undefined ? '—' : '—', onPress: () => navigate(`${base}/reservas`) },
          { icon: Star,     label: 'Membresía', value: mem ? '1' : '—',       onPress: () => navigate(`${base}/membresias`) },
          { icon: Package,  label: 'Paquetes',  value: String(home?.packages_active ?? 0), onPress: () => navigate(`${base}/membresias`) },
          { icon: FileText, label: 'Pendiente', value: String(home?.pending_quotes ?? 0),  onPress: () => navigate(`${base}/documentos`) },
        ].map(({ icon: Icon, label, value, onPress }) => (
          <button
            key={label}
            onClick={onPress}
            className="rounded-2xl p-3 flex flex-col items-center gap-1.5"
            style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <Icon className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.35)' }} />
            <span className="text-base font-bold text-white leading-none">{value}</span>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-center leading-tight"
              style={{ color: 'rgba(255,255,255,0.3)' }}>{label}</span>
          </button>
        ))}
      </div>

      {/* Membership card */}
      {mem && (
        <button
          onClick={() => navigate(`${base}/membresias`)}
          className="w-full rounded-3xl p-5 mb-4 text-left"
          style={{
            background: `linear-gradient(135deg, ${mem.color ?? '#8B5CF6'}18 0%, ${mem.color ?? '#8B5CF6'}08 100%)`,
            border: `1px solid ${mem.color ?? '#8B5CF6'}30`,
          }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1"
                style={{ color: mem.color ?? '#8B5CF6' }}>
                Membresía activa
              </p>
              <p className="text-xl font-bold text-white">{mem.name}</p>
              {mem.ends_at && (
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Vence el {fmtDate(mem.ends_at, { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              )}
            </div>
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: `${mem.color ?? '#8B5CF6'}20` }}
            >
              <Star className="w-5 h-5" style={{ color: mem.color ?? '#8B5CF6' }} />
            </div>
          </div>
        </button>
      )}

      {/* Alerts */}
      {(home?.pending_quotes ?? 0) > 0 && (
        <button
          onClick={() => navigate(`${base}/documentos`)}
          className="w-full rounded-2xl px-4 py-3 mb-3 flex items-center gap-3"
          style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#F59E0B' }} />
          <span className="text-sm font-semibold flex-1 text-left" style={{ color: '#F59E0B' }}>
            {home!.pending_quotes === 1
              ? 'Tenés 1 presupuesto pendiente'
              : `Tenés ${home!.pending_quotes} presupuestos pendientes`}
          </span>
          <ChevronRight className="w-4 h-4" style={{ color: '#F59E0B' }} />
        </button>
      )}

      {(home?.pending_docs ?? 0) > 0 && (
        <button
          onClick={() => navigate(`${base}/documentos`)}
          className="w-full rounded-2xl px-4 py-3 flex items-center gap-3"
          style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}
        >
          <FileText className="w-4 h-4 flex-shrink-0" style={{ color: '#3B82F6' }} />
          <span className="text-sm font-semibold flex-1 text-left" style={{ color: '#3B82F6' }}>
            {home!.pending_docs === 1
              ? 'Tenés 1 documento pendiente'
              : `Tenés ${home!.pending_docs} documentos pendientes`}
          </span>
          <ChevronRight className="w-4 h-4" style={{ color: '#3B82F6' }} />
        </button>
      )}

      {/* Padding spacer so last card is not hidden behind nav */}
      <div className="h-4" />
    </div>
  )
}
