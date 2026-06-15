import { useEffect, useState } from 'react'
import { Star, Package, RefreshCw, Calendar } from 'lucide-react'
import { usePortalCtx } from '../PortalApp'
import { apiGetMemberships, apiGetPackages } from '../portalAPI'
import type { PortalMembership, PortalPackage } from '../portalTypes'
import {
  fmtDate, fmtCurrency,
  MEMBERSHIP_STATUS_LABEL, MEMBERSHIP_STATUS_COLOR,
} from '../portalTypes'

// ─── Membership card ─────────────────────────────────────────────────────────
function MembershipCard({ m }: { m: PortalMembership }) {
  const color  = m.plan_color ?? '#8B5CF6'
  const status = MEMBERSHIP_STATUS_COLOR[m.status] ?? 'rgba(255,255,255,0.25)'
  const label  = MEMBERSHIP_STATUS_LABEL[m.status] ?? m.status
  const isActive = m.status === 'active'

  return (
    <div
      className="rounded-3xl p-5 mb-4"
      style={{
        background: isActive
          ? `linear-gradient(135deg, ${color}18 0%, ${color}06 100%)`
          : '#13161C',
        border: isActive
          ? `1px solid ${color}30`
          : '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{ background: `${color}20` }}
        >
          <Star className="w-5 h-5" style={{ color }} />
        </div>
        <span
          className="text-[10px] font-bold px-2.5 py-1 rounded-full"
          style={{ background: `${status}18`, color: status }}
        >
          {label}
        </span>
      </div>

      <p className="text-xl font-bold text-white mb-1">{m.plan_name}</p>

      {m.plan_description && (
        <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {m.plan_description}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        {m.starts_at && (
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.3)' }} />
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Desde {fmtDate(m.starts_at, { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
        )}
        {m.ends_at && (
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.3)' }} />
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Vence el {fmtDate(m.ends_at, { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
        )}
        {m.auto_renew && (
          <div className="flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.3)' }} />
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Renovación automática
            </span>
          </div>
        )}
      </div>

      <div
        className="mt-4 pt-4"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Valor</p>
        <p className="text-base font-bold text-white">
          {fmtCurrency(m.price, m.currency)}
          {m.currency ? ` ${m.currency}` : ''}
        </p>
      </div>
    </div>
  )
}

// ─── Package card ─────────────────────────────────────────────────────────────
function PackageCard({ p }: { p: PortalPackage }) {
  const color = p.template_color ?? '#F4705A'
  const isActive = p.status === 'active'

  // Compute totals from template_items
  const totalSessions = p.template_items?.reduce((s, i) => s + i.quantity, 0) ?? 0
  const usedSessions  = Object.values(p.consumption ?? {}).reduce((s, v) => s + v, 0)
  const remaining     = Math.max(0, totalSessions - usedSessions)
  const pct           = totalSessions > 0 ? Math.round((usedSessions / totalSessions) * 100) : 0

  return (
    <div
      className="rounded-3xl p-5 mb-4"
      style={{
        background: '#13161C',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{ background: `${color}18` }}
        >
          <Package className="w-5 h-5" style={{ color }} />
        </div>
        <span
          className="text-[10px] font-bold px-2.5 py-1 rounded-full"
          style={{
            background: isActive ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.06)',
            color:      isActive ? '#22C55E'              : 'rgba(255,255,255,0.3)',
          }}
        >
          {isActive ? 'Activo' : p.status === 'expired' ? 'Vencido' : 'Consumido'}
        </span>
      </div>

      <p className="text-xl font-bold text-white mb-4">{p.template_name}</p>

      {totalSessions > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Sesiones utilizadas
            </span>
            <span className="text-xs font-bold text-white">
              {usedSessions} / {totalSessions}
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, background: pct >= 80 ? '#EF4444' : color }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {remaining} restantes
            </span>
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {pct}% usado
            </span>
          </div>
        </div>
      )}

      {p.expires_at && (
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.3)' }} />
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Vence el {fmtDate(p.expires_at, { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export function PortalMemberships() {
  const { session } = usePortalCtx()
  const [memberships, setMemberships] = useState<PortalMembership[]>([])
  const [packages,    setPackages]    = useState<PortalPackage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      apiGetMemberships(session.token),
      apiGetPackages(session.token),
    ]).then(([m, p]) => {
      setMemberships(m)
      setPackages(p)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [session.token])

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-5 h-5 border-2 rounded-full animate-spin"
        style={{ borderColor: 'rgba(255,255,255,0.08)', borderTopColor: '#F4705A' }} />
    </div>
  )

  const hasMemberships = memberships.length > 0
  const hasPackages    = packages.length > 0

  return (
    <div>
      {/* Memberships */}
      <div className="mb-2">
        <p className="text-[10px] font-bold uppercase tracking-widest mb-3"
          style={{ color: 'rgba(255,255,255,0.3)' }}>
          Membresías
        </p>
        {hasMemberships ? (
          memberships.map(m => <MembershipCard key={m.id} m={m} />)
        ) : (
          <div
            className="rounded-2xl p-8 text-center mb-4"
            style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <Star className="w-7 h-7 mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.12)' }} />
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Sin membresías activas
            </p>
          </div>
        )}
      </div>

      {/* Packages */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest mb-3"
          style={{ color: 'rgba(255,255,255,0.3)' }}>
          Paquetes
        </p>
        {hasPackages ? (
          packages.map(p => <PackageCard key={p.id} p={p} />)
        ) : (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <Package className="w-7 h-7 mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.12)' }} />
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Sin paquetes activos
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
