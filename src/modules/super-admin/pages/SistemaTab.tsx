import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { timeSince } from '../lib/adminActions'
import { RefreshCw, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'

const CARD_BG    = '#171A21'
const BORDER     = 'rgba(255,255,255,0.06)'
const TEXT       = '#F5F7FA'
const TEXT_MUTED = '#98A2B3'
const ACCENT     = '#FF6B7A'

interface ServiceStatus { name: string; ok: boolean; detail?: string }
interface ProblemGroup  { label: string; count: number; names: string[] }
interface AdminLog {
  id: string
  admin_id: string
  action: string
  target_type: string
  target_id: string
  details: Record<string, unknown>
  created_at: string
  admin_email?: string
}

const ACTION_LABELS: Record<string, string> = {
  approve_request:   'Aprobó solicitud',
  reject_request:    'Rechazó solicitud',
  change_plan:       'Cambió plan',
  extend_trial:      'Extendió trial',
  update_features:   'Actualizó features',
  add_note:          'Agregó nota',
  deactivate:        'Desactivó cuenta',
  activate:          'Activó cuenta',
  impersonate:       'Impersonó negocio',
  reset_password:    'Resetó contraseña',
}

function ServiceRow({ svc }: { svc: ServiceStatus }) {
  return (
    <div className="flex items-center justify-between py-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
      <div className="flex items-center gap-3">
        {svc.ok
          ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: '#10B981' }} />
          : <XCircle     className="w-4 h-4 flex-shrink-0" style={{ color: '#EF4444' }} />
        }
        <span className="text-sm font-medium" style={{ color: TEXT }}>{svc.name}</span>
      </div>
      <span className="text-xs" style={{ color: svc.ok ? '#10B981' : '#EF4444' }}>
        {svc.ok ? (svc.detail ?? 'Operativo') : (svc.detail ?? 'Error')}
      </span>
    </div>
  )
}

export function SistemaTab() {
  const [loading, setLoading] = useState(true)
  const [services, setServices] = useState<ServiceStatus[]>([])
  const [problems, setProblems] = useState<ProblemGroup[]>([])
  const [logs, setLogs] = useState<AdminLog[]>([])
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      // Health checks
      const [dbResult, storageResult, authResult] = await Promise.allSettled([
        supabase.from('restaurants').select('id', { head: true }).limit(1),
        supabase.storage.from('restaurant-assets').list('', { limit: 1 }),
        supabase.auth.getSession(),
      ])

      const realtimeOk = await new Promise<boolean>(resolve => {
        const t = setTimeout(() => resolve(false), 2500)
        const ch = supabase.channel(`sa-health-${Date.now()}`)
        ch.subscribe(s => {
          clearTimeout(t)
          void supabase.removeChannel(ch)
          resolve(s === 'SUBSCRIBED')
        })
      })

      const dbOk      = dbResult.status === 'fulfilled' && !dbResult.value.error
      const storageOk = storageResult.status === 'fulfilled' && !storageResult.value.error
      const authOk    = authResult.status === 'fulfilled' && !!authResult.value.data.session?.user

      setServices([
        { name: 'Database',  ok: dbOk,       detail: dbOk       ? 'Conectada'      : 'Sin conexión'    },
        { name: 'Storage',   ok: storageOk,  detail: storageOk  ? 'Operativo'      : 'Sin acceso'      },
        { name: 'Auth',      ok: authOk,     detail: authOk     ? 'Funcionando'    : 'Error de sesión' },
        { name: 'Realtime',  ok: realtimeOk, detail: realtimeOk ? 'Activo'         : 'Sin conexión'    },
      ])

      // Problems query
      const now30 = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()

      const [
        { data: allRest },
        { data: logsRaw },
        { data: admins },
      ] = await Promise.all([
        supabase.from('restaurants')
          .select('id, name, is_active, subscription_status, trial_ends_at, updated_at')
          .eq('is_active', true),
        supabase.from('admin_logs')
          .select('id, admin_id, action, target_type, target_id, details, created_at')
          .order('created_at', { ascending: false })
          .limit(30),
        supabase.from('super_admins').select('user_id, email'),
      ])

      const adminMap = Object.fromEntries(
        (admins ?? []).map(a => [a.user_id, (a.email as string).split('@')[0]])
      )

      const rests = (allRest ?? []) as {
        id: string; name: string; is_active: boolean;
        subscription_status: string; trial_ends_at: string | null; updated_at: string
      }[]

      const now = Date.now()
      const expiredTrials    = rests.filter(r => r.subscription_status === 'trial' && r.trial_ends_at && new Date(r.trial_ends_at).getTime() < now)
      const inactive30       = rests.filter(r => new Date(r.updated_at).getTime() < new Date(now30).getTime())

      // For no-products / no-tables / no-waiters, query from view if available
      let noProducts: { name: string }[] = []
      let noTables:   { name: string }[] = []
      let noWaiters:  { name: string }[] = []
      try {
        const { data: viewData } = await supabase
          .from('view_superadmin_restaurants')
          .select('name, total_products, total_tables, total_waiters')
          .eq('is_active', true)

        if (viewData) {
          const vd = viewData as { name: string; total_products: number; total_tables: number; total_waiters: number }[]
          noProducts = vd.filter(r => (r.total_products ?? 0) === 0)
          noTables   = vd.filter(r => (r.total_tables   ?? 0) === 0)
          noWaiters  = vd.filter(r => (r.total_waiters  ?? 0) === 0)
        }
      } catch {
        // view may not exist yet
      }

      const problemGroups: ProblemGroup[] = []
      if (noProducts.length)
        problemGroups.push({ label: 'Sin productos en el menú', count: noProducts.length, names: noProducts.slice(0,3).map(r => r.name) })
      if (noTables.length)
        problemGroups.push({ label: 'Sin mesas configuradas', count: noTables.length, names: noTables.slice(0,3).map(r => r.name) })
      if (noWaiters.length)
        problemGroups.push({ label: 'Sin mozos registrados', count: noWaiters.length, names: noWaiters.slice(0,3).map(r => r.name) })
      if (expiredTrials.length)
        problemGroups.push({ label: 'Con trial vencido', count: expiredTrials.length, names: expiredTrials.slice(0,3).map(r => r.name) })
      if (inactive30.length)
        problemGroups.push({ label: 'Inactivos 30+ días', count: inactive30.length, names: inactive30.slice(0,3).map(r => r.name) })

      setProblems(problemGroups)

      setLogs(
        ((logsRaw ?? []) as AdminLog[]).map(l => ({
          ...l,
          admin_email: adminMap[l.admin_id] ?? l.admin_id.slice(0, 8),
        }))
      )

      setLastChecked(new Date())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: TEXT }}>Estado del sistema</h1>
          <p className="text-sm" style={{ color: TEXT_MUTED }}>
            {lastChecked ? `Última verificación: ${timeSince(lastChecked.toISOString())}` : 'Verificando...'}
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
          style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}`, color: TEXT_MUTED }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Verificar
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Services */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }}>
          <h2 className="text-sm font-semibold mb-2" style={{ color: TEXT }}>🩺 Servicios</h2>
          {loading ? (
            <div className="space-y-2 mt-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-10 rounded-xl animate-pulse"
                  style={{ backgroundColor: 'rgba(255,255,255,0.04)' }} />
              ))}
            </div>
          ) : (
            services.map(svc => <ServiceRow key={svc.name} svc={svc} />)
          )}
        </div>

        {/* Problems */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }}>
          <h2 className="text-sm font-semibold mb-3" style={{ color: TEXT }}>⚠️ Negocios con problemas</h2>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-14 rounded-xl animate-pulse"
                  style={{ backgroundColor: 'rgba(255,255,255,0.04)' }} />
              ))}
            </div>
          ) : problems.length === 0 ? (
            <div className="flex items-center gap-3 rounded-xl p-4 mt-2"
              style={{ backgroundColor: '#10B98110', border: '1px solid #10B98130' }}>
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: '#10B981' }} />
              <p className="text-sm" style={{ color: '#10B981' }}>
                Todo en orden. No hay negocios con problemas detectados.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {problems.map(pg => (
                <div key={pg.label}
                  className="rounded-xl p-3"
                  style={{ backgroundColor: '#F59E0B08', border: '1px solid #F59E0B25' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#F59E0B' }} />
                    <span className="text-sm font-medium" style={{ color: '#F59E0B' }}>
                      {pg.count} {pg.label}
                    </span>
                  </div>
                  <p className="text-xs ml-5.5" style={{ color: TEXT_MUTED }}>
                    {pg.names.join(', ')}{pg.count > 3 ? ` y ${pg.count - 3} más` : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Admin action log */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }}>
        <h2 className="text-sm font-semibold mb-4" style={{ color: TEXT }}>Últimas acciones admin</h2>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-10 rounded-xl animate-pulse"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)' }} />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <p className="text-sm text-center py-6" style={{ color: TEXT_MUTED }}>
            Sin acciones registradas aún
          </p>
        ) : (
          <div className="space-y-1">
            {logs.map(log => (
              <div key={log.id}
                className="flex items-center justify-between gap-3 py-2.5"
                style={{ borderBottom: `1px solid ${BORDER}` }}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-medium flex-shrink-0"
                    style={{ color: ACCENT }}>
                    {log.admin_email}
                  </span>
                  <span className="text-sm truncate" style={{ color: TEXT }}>
                    {ACTION_LABELS[log.action] ?? log.action}
                  </span>
                  {log.target_type === 'restaurant' && (
                    <span className="text-xs" style={{ color: TEXT_MUTED }}>
                      (target: {log.target_id.slice(0, 8)}…)
                    </span>
                  )}
                </div>
                <span className="text-xs flex-shrink-0" style={{ color: TEXT_MUTED }}>
                  {timeSince(log.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
