import { useEffect, useState } from 'react'
import { FileText, ClipboardList, ReceiptText, Check, X, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { usePortalCtx } from '../PortalApp'
import { apiGetDocuments, apiGetForms, apiGetQuotes, apiRespondQuote, apiLogEvent } from '../portalAPI'
import type { PortalDocument, PortalForm, PortalQuote } from '../portalTypes'
import {
  fmtDate, fmtShortDate, fmtCurrency,
  QUOTE_STATUS_LABEL, QUOTE_STATUS_COLOR,
} from '../portalTypes'

type Tab = 'quotes' | 'documents' | 'forms'

const TABS: { key: Tab; label: string; icon: React.FC<{ className?: string; style?: React.CSSProperties }> }[] = [
  { key: 'quotes',    label: 'Presupuestos', icon: ReceiptText  },
  { key: 'documents', label: 'Documentos',   icon: FileText     },
  { key: 'forms',     label: 'Formularios',  icon: ClipboardList },
]

// ─── Quote card ────────────────────────────────────────────────────────────────
function QuoteCard({ q, token, onRespond }: {
  q:         PortalQuote
  token:     string
  onRespond: (id: string, newStatus: string) => void
}) {
  const [expanded,   setExpanded]   = useState(false)
  const [responding, setResponding] = useState(false)
  const color = QUOTE_STATUS_COLOR[q.status] ?? 'rgba(255,255,255,0.25)'
  const label = QUOTE_STATUS_LABEL[q.status] ?? q.status
  const isPending = ['sent', 'viewed'].includes(q.status)

  const respond = async (action: 'accept' | 'reject') => {
    if (action === 'reject' && !window.confirm('¿Rechazar este presupuesto?')) return
    setResponding(true)
    const result = await apiRespondQuote(token, q.id, action)
    setResponding(false)
    if (result.success) {
      apiLogEvent(token, action === 'accept' ? 'quote_accept' : 'quote_reject', 'quote', q.id)
      toast.success(action === 'accept' ? 'Presupuesto aceptado' : 'Presupuesto rechazado')
      onRespond(q.id, result.new_status ?? (action === 'accept' ? 'accepted' : 'rejected'))
    } else {
      toast.error('No se pudo procesar la respuesta')
    }
  }

  return (
    <div
      className="rounded-2xl p-4 mb-3"
      style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <p className="text-sm font-bold text-white leading-tight">
            {q.title ?? q.quote_number ?? 'Presupuesto'}
          </p>
          {q.quote_number && q.title && (
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
              #{q.quote_number}
            </p>
          )}
        </div>
        <span
          className="text-[10px] font-bold px-2.5 py-1 rounded-full ml-2 flex-shrink-0"
          style={{ background: `${color}18`, color }}
        >
          {label}
        </span>
      </div>

      <div className="flex items-center justify-between mb-3">
        <p className="text-lg font-bold text-white">
          {fmtCurrency(q.total, q.currency)}
        </p>
        {q.expires_at && (
          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Vence {fmtShortDate(q.expires_at)}
          </p>
        )}
      </div>

      {/* Items toggle */}
      {(q.items?.length ?? 0) > 0 && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-1.5 text-xs mb-3"
          style={{ color: 'rgba(255,255,255,0.4)' }}
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {q.items!.length} {q.items!.length === 1 ? 'ítem' : 'ítems'}
        </button>
      )}

      {expanded && q.items && (
        <div
          className="rounded-xl p-3 mb-3 space-y-2"
          style={{ background: 'rgba(255,255,255,0.03)' }}
        >
          {q.items.map((item, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
                {item.name}
                {item.quantity > 1 && (
                  <span style={{ color: 'rgba(255,255,255,0.3)' }}> × {item.quantity}</span>
                )}
              </span>
              <span className="text-xs font-semibold text-white">
                {fmtCurrency(item.total, q.currency)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {isPending && (
        <div className="flex gap-2">
          <button
            onClick={() => respond('reject')}
            disabled={responding}
            className="flex-1 h-10 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-opacity"
            style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.15)', opacity: responding ? 0.5 : 1 }}
          >
            <X className="w-3.5 h-3.5" />
            Rechazar
          </button>
          <button
            onClick={() => respond('accept')}
            disabled={responding}
            className="flex-1 h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-opacity"
            style={{ background: '#22C55E', color: '#fff', opacity: responding ? 0.5 : 1 }}
          >
            <Check className="w-3.5 h-3.5" />
            Aceptar
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Document card ─────────────────────────────────────────────────────────────
function DocumentCard({ d }: { d: PortalDocument }) {
  return (
    <div
      className="rounded-2xl p-4 mb-3 flex items-center gap-3"
      style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(59,130,246,0.1)' }}
      >
        <FileText className="w-5 h-5" style={{ color: '#3B82F6' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{d.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {d.file_extension && (
            <span className="text-[10px] font-bold uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {d.file_extension}
            </span>
          )}
          <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
            {fmtDate(d.created_at, { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </div>
      {d.status === 'pending' && (
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}
        >
          Pendiente
        </span>
      )}
    </div>
  )
}

// ─── Form card ─────────────────────────────────────────────────────────────────
function FormCard({ f }: { f: PortalForm }) {
  return (
    <div
      className="rounded-2xl p-4 mb-3 flex items-center gap-3"
      style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(139,92,246,0.1)' }}
      >
        <ClipboardList className="w-5 h-5" style={{ color: '#8B5CF6' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{f.form_name}</p>
        <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
          {f.submitted_at
            ? `Enviado el ${fmtDate(f.submitted_at, { day: 'numeric', month: 'short', year: 'numeric' })}`
            : 'Pendiente'}
        </p>
      </div>
      <span
        className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
        style={{
          background: f.submitted_at ? 'rgba(34,197,94,0.1)'  : 'rgba(245,158,11,0.1)',
          color:      f.submitted_at ? '#22C55E'               : '#F59E0B',
        }}
      >
        {f.submitted_at ? 'Enviado' : 'Pendiente'}
      </span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export function PortalDocuments() {
  const { session } = usePortalCtx()
  const [tab,       setTab]       = useState<Tab>('quotes')
  const [quotes,    setQuotes]    = useState<PortalQuote[]>([])
  const [documents, setDocuments] = useState<PortalDocument[]>([])
  const [forms,     setForms]     = useState<PortalForm[]>([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      apiGetQuotes(session.token),
      apiGetDocuments(session.token),
      apiGetForms(session.token),
    ]).then(([q, d, f]) => {
      setQuotes(q)
      setDocuments(d)
      setForms(f)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [session.token])

  const handleQuoteRespond = (id: string, newStatus: string) =>
    setQuotes(prev => prev.map(q => q.id === id ? { ...q, status: newStatus } : q))

  return (
    <div>
      {/* Tab bar */}
      <div
        className="flex gap-1 p-1 rounded-2xl mb-5"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
            style={{
              background: tab === key ? '#F4705A' : 'transparent',
              color:      tab === key ? '#fff'    : 'rgba(255,255,255,0.4)',
            }}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-5 h-5 border-2 rounded-full animate-spin"
            style={{ borderColor: 'rgba(255,255,255,0.08)', borderTopColor: '#F4705A' }} />
        </div>
      ) : (
        <>
          {tab === 'quotes' && (
            quotes.length === 0 ? (
              <EmptyState icon={ReceiptText} text="Sin presupuestos" />
            ) : (
              quotes.map(q => (
                <QuoteCard key={q.id} q={q} token={session.token} onRespond={handleQuoteRespond} />
              ))
            )
          )}

          {tab === 'documents' && (
            documents.length === 0 ? (
              <EmptyState icon={FileText} text="Sin documentos" />
            ) : (
              documents.map(d => <DocumentCard key={d.id} d={d} />)
            )
          )}

          {tab === 'forms' && (
            forms.length === 0 ? (
              <EmptyState icon={ClipboardList} text="Sin formularios" />
            ) : (
              forms.map(f => <FormCard key={f.id} f={f} />)
            )
          )}
        </>
      )}
    </div>
  )
}

function EmptyState({ icon: Icon, text }: {
  icon: React.FC<{ className?: string; style?: React.CSSProperties }>
  text: string
}) {
  return (
    <div
      className="rounded-2xl p-10 flex flex-col items-center text-center"
      style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <Icon className="w-8 h-8 mb-3" style={{ color: 'rgba(255,255,255,0.12)' }} />
      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{text}</p>
    </div>
  )
}
