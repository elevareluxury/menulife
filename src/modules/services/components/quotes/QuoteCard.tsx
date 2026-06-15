import { useState } from 'react'
import { ChevronDown, ChevronUp, MoreVertical, Send, CheckCircle2, XCircle, Clock, RefreshCw } from 'lucide-react'
import type { Quote, QuoteStatus } from '../../quotes/quoteTypes'
import { QUOTE_STATUS_CONFIG } from '../../quotes/quoteTypes'
import { formatCurrency, isQuoteExpired, isQuoteDueSoon } from '../../quotes/quoteUtils'

interface QuoteCardProps {
  quote:          Quote
  onChangeStatus: (id: string, status: QuoteStatus) => void
}

export function QuoteCard({ quote, onChangeStatus }: QuoteCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const cfg      = QUOTE_STATUS_CONFIG[quote.status]
  const color    = quote.template?.color ?? '#F4705A'
  const expired  = isQuoteExpired(quote.expires_at)
  const dueSoon  = isQuoteDueSoon(quote.expires_at)
  const hasItems = (quote.items?.length ?? 0) > 0

  type Action = { label: string; icon: React.ReactNode; status: QuoteStatus; show: boolean; danger?: boolean }

  const actions: Action[] = ([
    {
      label:  'Marcar enviado',
      icon:   <Send className="w-3.5 h-3.5" />,
      status: 'sent' as QuoteStatus,
      show:   quote.status === 'draft',
    },
    {
      label:  'Marcar aceptado',
      icon:   <CheckCircle2 className="w-3.5 h-3.5" />,
      status: 'accepted' as QuoteStatus,
      show:   ['sent', 'viewed'].includes(quote.status),
    },
    {
      label:  'Marcar rechazado',
      icon:   <XCircle className="w-3.5 h-3.5" />,
      status: 'rejected' as QuoteStatus,
      show:   ['sent', 'viewed'].includes(quote.status),
      danger: true,
    },
    {
      label:  'Convertido',
      icon:   <RefreshCw className="w-3.5 h-3.5" />,
      status: 'converted' as QuoteStatus,
      show:   quote.status === 'accepted',
    },
    {
      label:  'Marcar vencido',
      icon:   <Clock className="w-3.5 h-3.5" />,
      status: 'expired' as QuoteStatus,
      show:   ['draft', 'sent', 'viewed'].includes(quote.status),
    },
    {
      label:  'Cancelar',
      icon:   <XCircle className="w-3.5 h-3.5" />,
      status: 'cancelled' as QuoteStatus,
      show:   !['cancelled', 'converted', 'accepted'].includes(quote.status),
      danger: true,
    },
  ] as Action[]).filter(a => a.show)

  const expiryLabel = quote.expires_at
    ? new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
        .format(new Date(quote.expires_at))
    : null

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: `1px solid ${color}28` }}
    >
      {/* Header */}
      <div className="px-4 py-3 flex items-start gap-3" style={{ background: `${color}0D` }}>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 mt-0.5"
          style={{ background: `${color}1A` }}
        >
          {quote.template?.icon ?? '📋'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="min-w-0">
              <p className="text-sm font-bold text-white leading-tight">{quote.title}</p>
              <p className="text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.3)' }}>{quote.quote_number}</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: cfg.bg, color: cfg.color }}
              >
                {cfg.label}
              </span>
              {actions.length > 0 && (
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
                        className="absolute right-0 top-7 z-20 rounded-xl py-1 min-w-[172px]"
                        style={{ background: '#1C2028', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}
                      >
                        {actions.map(a => (
                          <button
                            key={a.label}
                            onClick={() => { onChangeStatus(quote.id, a.status); setMenuOpen(false) }}
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
              {formatCurrency(quote.total_amount, quote.currency)}
            </span>
            {expiryLabel && (
              <span
                className="text-[11px]"
                style={{ color: expired ? '#EF4444' : dueSoon ? '#F59E0B' : 'rgba(255,255,255,0.4)' }}
              >
                {expired ? 'Venció ' : 'Vence '}{expiryLabel}
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
              {quote.items!.length} ítem{quote.items!.length !== 1 ? 's' : ''}
            </span>
            {expanded
              ? <ChevronUp   className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.25)' }} />
              : <ChevronDown className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.25)' }} />
            }
          </button>

          {expanded && (
            <div className="px-4 pb-4 space-y-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              {quote.items!.map(item => (
                <div key={item.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white truncate">{item.name}</p>
                    {item.description && (
                      <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>{item.description}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-xs font-semibold text-white">
                      {formatCurrency(item.total, quote.currency)}
                    </p>
                    <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {item.quantity} × {formatCurrency(item.unit_price, quote.currency)}
                      {item.discount > 0 ? ` − ${formatCurrency(item.discount, quote.currency)}` : ''}
                    </p>
                  </div>
                </div>
              ))}
              {(quote.tax_amount > 0 || quote.subtotal !== quote.total_amount) && (
                <div
                  className="pt-2 mt-1 space-y-1"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                >
                  {quote.subtotal !== quote.total_amount && (
                    <div className="flex justify-between text-[11px]">
                      <span style={{ color: 'rgba(255,255,255,0.4)' }}>Subtotal</span>
                      <span style={{ color: 'rgba(255,255,255,0.6)' }}>{formatCurrency(quote.subtotal, quote.currency)}</span>
                    </div>
                  )}
                  {quote.tax_amount > 0 && (
                    <div className="flex justify-between text-[11px]">
                      <span style={{ color: 'rgba(255,255,255,0.4)' }}>Impuestos</span>
                      <span style={{ color: 'rgba(255,255,255,0.6)' }}>{formatCurrency(quote.tax_amount, quote.currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-white">Total</span>
                    <span style={{ color }}>{formatCurrency(quote.total_amount, quote.currency)}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
