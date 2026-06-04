import { useState, useEffect, useCallback } from 'react'
import { Building2, Mail, Phone, MapPin, Clock, CheckCircle2, XCircle, RefreshCw, Link2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'
import { PLAN_FEATURES, FEATURE_LABELS, ALL_FEATURES, logAdminAction } from '../lib/adminActions'

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

type Tab = 'pending' | 'approved' | 'rejected' | 'all'

const PLAN_OPTIONS = [
  { value: 'menu',  label: 'Menu  — Menú Digital',   sub: 'Trial 14d · $9/mes'  },
  { value: 'pro',   label: 'Pro   — Pedidos + KDS',   sub: 'Trial 14d · $19/mes' },
  { value: 'total', label: 'Total — Suite Completa',  sub: 'Trial 14d · $32/mes' },
]

function timeSince(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `Hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `Hace ${hrs}h`
  return `Hace ${Math.floor(hrs / 24)}d`
}

// ── Approve Modal ──────────────────────────────────────────────────────────────

function ApproveModal({
  request,
  onClose,
  onConfirm,
}: {
  request: AccessRequest | null
  onClose: () => void
  onConfirm: (requestId: string, plan: string, features: Record<string, boolean>, note: string) => Promise<void>
}) {
  const [plan, setPlan] = useState('menu')
  const [features, setFeatures] = useState<Record<string, boolean>>(PLAN_FEATURES['menu'])
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  // Update features when plan changes
  const handlePlanChange = (p: string) => {
    setPlan(p)
    setFeatures({ ...PLAN_FEATURES[p] })
  }

  const toggleFeature = (f: string) => {
    setFeatures(prev => ({ ...prev, [f]: !prev[f] }))
  }

  const handleConfirm = async () => {
    if (!request) return
    setLoading(true)
    await onConfirm(request.id, plan, features, note)
    setLoading(false)
  }

  return (
    <Modal isOpen={!!request} onClose={onClose} title={`Aprobar: ${request?.business_name ?? ''}`}>
      <div className="space-y-5">
        {/* Info */}
        <div className="rounded-xl p-3" style={{ backgroundColor: '#10B98110', border: '1px solid #10B98130' }}>
          <p className="text-sm" style={{ color: '#10B981' }}>
            Se creará una cuenta para <strong>{request?.email}</strong> y se enviará un magic link.
          </p>
        </div>

        {/* Plan */}
        <div>
          <label className="block text-xs font-medium mb-2" style={{ color: TEXT_MUTED }}>Plan inicial</label>
          <div className="space-y-2">
            {PLAN_OPTIONS.map(opt => (
              <label
                key={opt.value}
                className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
                style={{
                  border: `2px solid ${plan === opt.value ? ACCENT : BORDER}`,
                  backgroundColor: plan === opt.value ? `${ACCENT}10` : 'rgba(255,255,255,0.02)',
                }}
              >
                <input
                  type="radio"
                  name="plan"
                  value={opt.value}
                  checked={plan === opt.value}
                  onChange={() => handlePlanChange(opt.value)}
                  className="accent-orange-400"
                />
                <div>
                  <p className="text-sm font-medium" style={{ color: TEXT }}>{opt.label}</p>
                  <p className="text-xs" style={{ color: TEXT_MUTED }}>{opt.sub}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Features */}
        <div>
          <label className="block text-xs font-medium mb-2" style={{ color: TEXT_MUTED }}>Features a activar</label>
          <div className="space-y-1.5">
            {ALL_FEATURES.map(f => (
              <label key={f} className="flex items-center gap-2.5 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={features[f] ?? false}
                  onChange={() => toggleFeature(f)}
                  className="accent-orange-400 w-3.5 h-3.5"
                />
                <span className="text-sm" style={{ color: features[f] ? TEXT : TEXT_MUTED }}>
                  {FEATURE_LABELS[f]}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Internal note */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: TEXT_MUTED }}>
            Nota interna (opcional)
          </label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Ej: Cliente referido por un socio, contactar en 3 días..."
            rows={2}
            className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
            style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, color: TEXT }}
          />
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1" disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} isLoading={loading} className="flex-1">
            <CheckCircle2 className="w-4 h-4 mr-1.5" />
            Aprobar y enviar
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
          <p className="text-sm" style={{ color: TEXT_MUTED }}>
            ¿Rechazar la solicitud de <strong style={{ color: TEXT }}>{request.name}</strong> ({request.business_name})?
          </p>
        )}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: TEXT_MUTED }}>
            Motivo (opcional)
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Ej: El negocio no cumple los requisitos actuales..."
            rows={3}
            className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
            style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, color: TEXT }}
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
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        toast.error('Sesión no activa. Recargá la página.')
        return
      }

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
      console.error('[AccessRequests] fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  const handleApproveConfirm = async (
    requestId: string,
    plan: string,
    features: Record<string, boolean>,
    note: string
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke('approve-access-request', {
        body: { requestId, plan, features },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)

      const req = requests.find(r => r.id === requestId)

      // Get the created restaurant to log properly
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('id')
        .eq('email', req?.email ?? '')
        .maybeSingle()

      // Log the action
      await logAdminAction('approve_request', 'access_request', requestId, {
        plan,
        features,
        restaurant_id: restaurant?.id,
      })

      // Save internal note if provided
      if (note.trim() && restaurant?.id) {
        await supabase.from('admin_notes').insert({
          restaurant_id: restaurant.id,
          content: note.trim(),
        })
      }

      toast.success(`✅ Cuenta creada. Magic link enviado a ${req?.email}`)
      setApprovingRequest(null)
      await fetchRequests()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al aprobar la solicitud')
    }
  }

  const handleRejectConfirm = async (reason: string) => {
    if (!rejectingRequest) return
    try {
      const { data: { session } } = await supabase.auth.getSession()

      const { error } = await supabase
        .from('access_requests')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: session?.user?.id,
        })
        .eq('id', rejectingRequest.id)
      if (error) throw error

      await logAdminAction('reject_request', 'access_request', rejectingRequest.id, { reason })

      toast.success('Solicitud rechazada')
      setRejectingRequest(null)
      await fetchRequests()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al rechazar')
    }
  }

  const visible = activeTab === 'all'
    ? requests
    : requests.filter(r => r.status === activeTab)

  const tabs: { id: Tab; label: string }[] = [
    { id: 'pending',  label: `Pendientes${counts.pending  > 0 ? ` (${counts.pending})`  : ''}` },
    { id: 'approved', label: `Aprobadas${counts.approved  > 0 ? ` (${counts.approved})` : ''}` },
    { id: 'rejected', label: 'Rechazadas' },
    { id: 'all',      label: `Todas (${requests.length})` },
  ]

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/solicitar-acceso`)
    toast.success('Link copiado al portapapeles')
  }

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
        className="flex gap-1 p-1 rounded-xl w-fit mb-6 flex-wrap"
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
            <div key={i} className="rounded-2xl p-5 animate-pulse h-36"
              style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }} />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl p-12 text-center" style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }}>
          {activeTab === 'pending' ? (
            <>
              <div className="text-4xl mb-3">📋</div>
              <p className="text-base font-semibold mb-1" style={{ color: TEXT }}>Sin solicitudes pendientes</p>
              {requests.length > 0 ? (
                <p className="text-sm mb-4" style={{ color: TEXT_MUTED }}>
                  Hay {requests.length} solicitud{requests.length !== 1 ? 'es' : ''} en otros estados.{' '}
                  <button onClick={() => setActiveTab('all')} style={{ color: ACCENT }} className="underline">
                    Ver todas
                  </button>
                </p>
              ) : (
                <p className="text-sm mb-6" style={{ color: TEXT_MUTED }}>
                  Cuando alguien complete el formulario en menulife.digital/solicitar-acceso aparecerá acá.
                </p>
              )}
              <div className="flex gap-3 justify-center">
                <button
                  onClick={copyLink}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
                  style={{ backgroundColor: `${ACCENT}18`, color: ACCENT, border: `1px solid ${ACCENT}30` }}
                >
                  <Link2 className="w-3.5 h-3.5" />
                  Copiar link del formulario
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-4xl mb-3">
                {activeTab === 'approved' ? '✅' : activeTab === 'rejected' ? '❌' : '📋'}
              </div>
              <p className="text-sm" style={{ color: TEXT_MUTED }}>
                {activeTab === 'approved' ? 'Ninguna aprobada aún' : activeTab === 'rejected' ? 'Sin rechazadas' : 'Sin solicitudes'}
              </p>
              {requests.length > 0 && activeTab !== 'all' && (
                <p className="text-xs mt-2">
                  <button onClick={() => setActiveTab('all')} style={{ color: ACCENT }} className="underline">
                    Ver las {requests.length} totales
                  </button>
                </p>
              )}
            </>
          )}
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
                    <a href={`mailto:${request.email}`} className="flex items-center gap-1.5 hover:underline" style={{ color: TEXT_MUTED }}>
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
                    <p className="mt-3 text-sm italic rounded-xl px-3 py-2"
                      style={{ color: TEXT_MUTED, backgroundColor: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}` }}>
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

                {activeTab !== 'pending' && activeTab !== 'all' && (
                  <span
                    className="shrink-0 px-3 py-1 rounded-full text-xs font-semibold"
                    style={{
                      backgroundColor: request.status === 'approved' ? '#10B98118' : '#EF444418',
                      color:           request.status === 'approved' ? '#10B981'   : '#EF4444',
                    }}
                  >
                    {request.status === 'approved' ? 'Aprobada' : 'Rechazada'}
                  </span>
                )}

                {activeTab === 'all' && (
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold"
                      style={{
                        backgroundColor: request.status === 'approved' ? '#10B98118' : request.status === 'rejected' ? '#EF444418' : '#F59E0B18',
                        color:           request.status === 'approved' ? '#10B981'   : request.status === 'rejected' ? '#EF4444'   : '#F59E0B',
                      }}>
                      {request.status === 'approved' ? 'Aprobada' : request.status === 'rejected' ? 'Rechazada' : 'Pendiente'}
                    </span>
                    {request.status === 'pending' && (
                      <button
                        onClick={() => setApprovingRequest(request)}
                        className="text-xs px-3 py-1.5 rounded-xl font-medium"
                        style={{ backgroundColor: '#10B98118', color: '#10B981', border: '1px solid #10B98130' }}
                      >
                        Aprobar
                      </button>
                    )}
                  </div>
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
