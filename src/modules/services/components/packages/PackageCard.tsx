import { useState } from 'react'
import { ChevronDown, ChevronUp, MoreVertical, XCircle, Clock } from 'lucide-react'
import type { Package, PackageStatus, PackageItemSummary } from '../../packages/packageTypes'
import { PACKAGE_STATUS_CONFIG } from '../../packages/packageTypes'
import { PackageItemBar } from './PackageItemBar'

interface PackageCardProps {
  pkg:            Package
  summaries?:     PackageItemSummary[]
  onChangeStatus?: (id: string, status: PackageStatus) => void
}

export function PackageCard({ pkg, summaries, onChangeStatus }: PackageCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const template = pkg.template
  const cfg      = PACKAGE_STATUS_CONFIG[pkg.status]
  const color    = template?.color ?? '#F4705A'

  const expiryLabel = pkg.expires_at
    ? new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
        .format(new Date(pkg.expires_at))
    : null

  const isExpiredDate = pkg.expires_at ? new Date(pkg.expires_at) < new Date() : false

  const actions: Array<{ label: string; icon: React.ReactNode; status: PackageStatus; show: boolean; danger?: boolean }> = (
    [
      {
        label:  'Cancelar',
        icon:   <XCircle className="w-3.5 h-3.5" />,
        status: 'cancelled' as PackageStatus,
        show:   pkg.status !== 'cancelled',
        danger: true,
      },
      {
        label:  'Marcar vencido',
        icon:   <Clock className="w-3.5 h-3.5" />,
        status: 'expired' as PackageStatus,
        show:   pkg.status === 'active',
      },
    ] as Array<{ label: string; icon: React.ReactNode; status: PackageStatus; show: boolean; danger?: boolean }>
  ).filter(a => a.show)

  const hasItems = summaries && summaries.length > 0

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: `1px solid ${color}28` }}
    >
      {/* Header */}
      <div className="px-4 py-3 flex items-start gap-3" style={{ background: `${color}0D` }}>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
          style={{ background: `${color}1A` }}
        >
          {template?.icon ?? '📦'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-sm font-bold text-white leading-tight">{template?.name ?? 'Paquete'}</p>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: cfg.bg, color: cfg.color }}
              >
                {cfg.label}
              </span>

              {onChangeStatus && actions.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setMenuOpen(v => !v)}
                    className="p-0.5 rounded-lg hover:bg-white/10 transition-colors"
                    style={{ color: 'rgba(255,255,255,0.35)' }}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {menuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                      <div
                        className="absolute right-0 top-7 z-20 rounded-xl py-1 min-w-[152px]"
                        style={{ background: '#1C2028', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}
                      >
                        {actions.map(a => (
                          <button
                            key={a.label}
                            onClick={() => { onChangeStatus(pkg.id, a.status); setMenuOpen(false) }}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-left hover:bg-white/5 transition-colors"
                            style={{ color: a.danger ? '#EF4444' : 'rgba(255,255,255,0.7)' }}
                          >
                            {a.icon}
                            {a.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-sm font-bold" style={{ color }}>
              {template?.currency ?? 'ARS'} {(template?.price ?? 0).toLocaleString('es-AR')}
            </span>
            {expiryLabel && (
              <span
                className="text-[11px]"
                style={{ color: isExpiredDate ? '#EF4444' : 'rgba(255,255,255,0.4)' }}
              >
                Vence {expiryLabel}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Items expand */}
      {hasItems && (
        <div style={{ background: '#13161C' }}>
          <button
            onClick={() => setExpanded(v => !v)}
            className="w-full flex items-center justify-between px-4 py-2 text-left"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
          >
            <span className="text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {summaries!.length} ítem{summaries!.length !== 1 ? 's' : ''}
            </span>
            {expanded
              ? <ChevronUp   className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.25)' }} />
              : <ChevronDown className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.25)' }} />
            }
          </button>

          {expanded && (
            <div
              className="px-4 pb-4 space-y-3 pt-3"
              style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
            >
              {summaries!.map(s => (
                <PackageItemBar key={s.item.key} summary={s} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
