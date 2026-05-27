import { useState, useEffect, useCallback } from 'react'
import { Building2, Mail, Phone, MapPin, Clock, CheckCircle2, XCircle, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'

const CARD_BG    = '#171A21'
const BORDER     = 'rgba(255,255,255,0.06)'
const TEXT       = '#F5F7FA'
const TEXT_MUTED = '#98A2B3'
const ACCENT     = '#FF6B7A'

interface AccessRequest {
  id: string
  name: string
  email: string
  business_name: string
  phone: string | null
  city: string | null
  message: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  reviewed_at: string | null
}

type Tab = 'pending' | 'approved' | 'rejected'

const PLAN_OPTIONS = [
  { value: 'menu',  label: 'Menu  — Menú Digital',         sub: 'Trial 14d · $9/mes' },
  { value: 'pro',   label: 'Pro   — Pedidos + KDS',        sub: 'Trial 14d · $19/mes' },
  { value: 'total', label: 'Total — Suite Completa',        sub: 'Trial 14d · $32/mes' },
]

function timeSince(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `Hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `Hace ${hrs}h`
  return `Hace ${Math.floor(hrs / 24)}d`
}

// ── Approve Modal ─────────────────────────────────────────────────────────────

function ApproveModal({
  request,
  onClose,
  onConfirm,
}: {
  request: AccessRequest | null
  onClose: () => void
  onConfirm: (requestId: string, plan: string) => Promise<void>
}) {
  const [plan, setPlan] = useState('menu')
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    if (!request) return
    setLoading(true)
    await onConfirm(request.id, plan)
    setLoading(false)
  }

  return (
    <Modal isOpen={!!request} onClose={onClose} title={`Aprobar acceso a ${request?.business_name ?? ''}`}>
      <div className="space-y-5">
        <div className="rounded-xl p-3 bg-gray-50 border border-gray-100">
          <p className="text-sm text-gray-600">
            Se creará una cuenta para <strong className="text-gray-900">{request?.email}</strong>
            {' '}y se enviará un magic link para que inicie sesión.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Plan inicial</label>
          <div className="space-y-2">
            {PLAN_OPTIONS.map(opt => (
              <label
                key={opt.value}
                className={`flex items-center justify-between gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  plan === opt.value ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="plan"
                    value={opt.value}
                    checked={plan === opt.value}
                    onChange={() => setPlan(opt.value)}
                    className="accent-orange-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{opt.label}</p>
                    <p className="text-xs text-gray-500">{opt.sub}</p>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1" disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} isLoading={loading} className="flex-1">
            <CheckCircle2 className="w-4 h-4 mr-1.5" />
            Confirmar y enviar
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Reject Modal ──────────────────────────────────────────────────────────────

function RejectModal({
  request,
  onClose,
  onConfirm,
}: {
  request: AccessRequest | null
  onClose: () => void
  onConfirm: (reason: string) => Promise<void>
}) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    await onConfirm(reason)
    setLoading(false)
  }

  return (
    <Modal isOpen={!!request} onClose={onClose} title="Rechazar solicitud">
      <div className="space-y-4">
        {request && (
          <p className="text-sm text-gray-600">
            ¿Rechazar la solicitud de <strong>{request.name}</strong> ({request.business_name})?
          </p>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Motivo (opcional)</label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Ej: El negocio no cumple los requisitos actuales..."
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
          />
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button onClick={handleConfirm} isLoading={loading} className="flex-1 !bg-red-600 hover:!bg-red-700">
            Rechazar
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function AccessRequestsTab() {
  const [activeTab, setActiveTab] = useState<Tab>('pending')
  const [requests, setRequests] = useState<AccessRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [approvingRequest, setApprovingRequest] = useState<AccessRequest | null>(null)
  const [rejectingRequest, setRejectingRequest] = useState<AccessRequest | null>(null)
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 })

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('access_requests')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      const all = (data ?? []) as AccessRequest[]
      setRequests(all)
      setCounts({
        pending:  all.filter(r => r.status === 'pending').length,
        approved: all.filter(r => r.status === 'approved').length,
        rejected: all.filter(r => r.status === 'rejected').length,
      })
    } catch (err) {
      toast.error('Error cargando solicitudes')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  const handleApproveConfirm = async (requestId: string, plan: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('approve-access-request', {
        body: { requestId, plan },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)

      const req = requests.find(r => r.id === requestId)
      toast.success(`✅ Cuenta creada. Magic link enviado a ${req?.email}`)
      setApprovingRequest(null)
      await fetchRequests()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al aprobar la solicitud')
    }
  }

  const handleRejectConfirm = async (_reason: string) => {
    if (!rejectingRequest) return
    try {
      const { error } = await supabase
        .from('access_requests')
        .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
        .eq('id', rejectingRequest.id)
      if (error) throw error

      toast.success('Solicitud rechazada')
      setRejectingRequest(null)
      await fetchRequests()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al rechazar')
    }
  }

  const visible = requests.filter(r => r.status === activeTab)

  const tabs: { id: Tab; label: string }[] = [
    { id: 'pending',  label: `Pendientes${counts.pending > 0 ? ` (${counts.pending})` : ''}` },
    { id: 'approved', label: `Aprobadas${counts.approved > 0 ? ` (${counts.approved})` : ''}` },
    { id: 'rejected', label: 'Rechazadas' },
  ]

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: TEXT }}>Solicitudes de acceso</h1>
          <p className="text-sm" style={{ color: TEXT_MUTED }}>Revisá y aprobá nuevos restaurantes</p>
        </div>
        <button
          onClick={fetchRequests}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
          style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}`, color: TEXT_MUTED }}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Actualizar
        </button>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 p-1 rounded-xl w-fit mb-6"
        style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }}
      >
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap"
            style={{
              backgroundColor: activeTab === tab.id ? '#FF6B7A18' : 'transparent',
              color: activeTab === tab.id ? ACCENT : TEXT_MUTED,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl p-5 animate-pulse h-24"
              style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }} />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl p-12 text-center" style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }}>
          <div className="text-4xl mb-3">
            {activeTab === 'pending' ? '🎉' : activeTab === 'approved' ? '✅' : '❌'}
          </div>
          <p className="text-sm" style={{ color: TEXT_MUTED }}>
            {activeTab === 'pending' ? 'Sin solicitudes pendientes' : activeTab === 'approved' ? 'Ninguna aprobada aún' : 'Sin rechazadas'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map(request => (
            <div key={request.id} className="rounded-2xl p-5" style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    <Building2 className="w-5 h-5 flex-shrink-0" style={{ color: ACCENT }} />
                    <h3 className="text-base font-bold" style={{ color: TEXT }}>{request.business_name}</h3>
                    <span className="flex items-center gap-1 text-xs" style={{ color: TEXT_MUTED }}>
                      <Clock className="w-3 h-3" />{timeSince(request.created_at)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm">
                    <span style={{ color: TEXT_MUTED }}>👤 {request.name}</span>
                    <a
                      href={`mailto:${request.email}`}
                      className="flex items-center gap-1.5 hover:underline"
                      style={{ color: TEXT_MUTED }}
                    >
                      <Mail className="w-3.5 h-3.5" />{request.email}
                    </a>
                    {request.phone && (
                      <span className="flex items-center gap-1.5" style={{ color: TEXT_MUTED }}>
                        <Phone className="w-3.5 h-3.5" />{request.phone}
                      </span>
                    )}
                    {request.city && (
                      <span className="flex items-center gap-1.5" style={{ color: TEXT_MUTED }}>
                        <MapPin className="w-3.5 h-3.5" />{request.city}
                      </span>
                    )}
                  </div>

                  {request.message && (
                    <p
                      className="mt-3 text-sm italic rounded-xl px-3 py-2"
                      style={{ color: TEXT_MUTED, backgroundColor: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}` }}
                    >
                      "{request.message}"
                    </p>
                  )}
                </div>

                {/* Actions */}
                {activeTab === 'pending' && (
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => setApprovingRequest(request)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all"
                      style={{ backgroundColor: '#10B98118', color: '#10B981', border: '1px solid #10B98133' }}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Aprobar
                    </button>
                    <button
                      onClick={() => setRejectingRequest(request)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all"
                      style={{ backgroundColor: '#EF444418', color: '#EF4444', border: '1px solid #EF444433' }}
                    >
                      <XCircle className="w-4 h-4" />
                      Rechazar
                    </button>
                  </div>
                )}

                {activeTab !== 'pending' && (
                  <span
                    className="shrink-0 px-3 py-1 rounded-full text-xs font-semibold"
                    style={{
                      backgroundColor: request.status === 'approved' ? '#10B98118' : '#EF444418',
                      color: request.status === 'approved' ? '#10B981' : '#EF4444',
                    }}
                  >
                    {request.status === 'approved' ? 'Aprobada' : 'Rechazada'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ApproveModal
        request={approvingRequest}
        onClose={() => setApprovingRequest(null)}
        onConfirm={handleApproveConfirm}
      />
      <RejectModal
        request={rejectingRequest}
        onClose={() => setRejectingRequest(null)}
        onConfirm={handleRejectConfirm}
      />
    </div>
  )
}
