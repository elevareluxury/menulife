import { useState, useEffect } from 'react'
import { Search, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

const db = supabase as any

type Period       = 'today' | 'week' | 'month'
type ActionFilter = 'all' | 'cobros' | 'caja' | 'usuarios' | 'menu'

interface AuditEntry {
  id: string
  action: string
  entity_type: string | null
  entity_id: string | null
  details: Record<string, unknown>
  user_name: string
  created_at: string
}

const ACTION_LABELS: Record<string, string> = {
  cash_open:          'Abrió caja',
  cash_close:         'Cerró caja',
  payment_completed:  'Cobro realizado',
  ticket_correction:  'Corrección de ticket',
  expense_created:    'Gasto registrado',
  expense_deleted:    'Gasto eliminado',
  table_reopen:       'Mesa reabierta',
  menu_item_created:  'Ítem de menú creado',
  menu_item_updated:  'Menú actualizado',
  menu_item_deleted:  'Ítem de menú eliminado',
  login:              'Inicio de sesión',
  role_assigned:      'Rol asignado',
  permission_granted: 'Permiso otorgado',
  permission_removed: 'Permiso removido',
}

const ACTION_CATEGORY: Record<ActionFilter, string[]> = {
  all:      [],
  cobros:   ['payment_completed', 'ticket_correction'],
  caja:     ['cash_open', 'cash_close', 'expense_created', 'expense_deleted'],
  usuarios: ['login', 'role_assigned', 'permission_granted', 'permission_removed'],
  menu:     ['menu_item_created', 'menu_item_updated', 'menu_item_deleted'],
}

function getIcon(action: string) {
  if (action.startsWith('payment') || action.startsWith('ticket')) return '💰'
  if (action.startsWith('cash') || action.startsWith('expense'))   return '🏦'
  if (action === 'login')                                           return '🔑'
  if (action.startsWith('menu'))                                    return '📋'
  if (action.startsWith('role') || action.startsWith('permission')) return '🛡️'
  if (action.startsWith('table'))                                   return '🪑'
  return '📝'
}

function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)}d`
}

function periodStart(period: Period): Date {
  const now = new Date()
  if (period === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (period === 'week')  return new Date(now.getTime() - 7  * 86400000)
  return                         new Date(now.getTime() - 30 * 86400000)
}

interface AuditTabProps {
  restaurantId: string
}

export function AuditTab({ restaurantId }: AuditTabProps) {
  const [entries, setEntries]         = useState<AuditEntry[]>([])
  const [loading, setLoading]         = useState(true)
  const [period, setPeriod]           = useState<Period>('today')
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all')
  const [search, setSearch]           = useState('')
  const [expanded, setExpanded]       = useState<string | null>(null)

  useEffect(() => { fetchLogs() }, [restaurantId, period])

  async function fetchLogs() {
    setLoading(true)
    const { data } = await db
      .from('audit_logs')
      .select('id, action, entity_type, entity_id, details, user_name, created_at')
      .eq('restaurant_id', restaurantId)
      .gte('created_at', periodStart(period).toISOString())
      .order('created_at', { ascending: false })
      .limit(100)
    setEntries(data ?? [])
    setLoading(false)
  }

  const filtered = entries.filter(e => {
    if (actionFilter !== 'all' && !ACTION_CATEGORY[actionFilter].includes(e.action)) return false
    if (search && !e.user_name?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const PERIODS: Array<{ id: Period; label: string }> = [
    { id: 'today', label: 'Hoy' },
    { id: 'week',  label: 'Semana' },
    { id: 'month', label: 'Mes' },
  ]

  const FILTERS: Array<{ id: ActionFilter; label: string }> = [
    { id: 'all',      label: 'Todos' },
    { id: 'cobros',   label: 'Cobros' },
    { id: 'caja',     label: 'Caja' },
    { id: 'usuarios', label: 'Usuarios' },
    { id: 'menu',     label: 'Menú' },
  ]

  const btnCls = (active: boolean) => cn(
    'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
    active ? 'bg-brand text-white' : 'bg-surface-3 text-ink-3 hover:text-ink-1'
  )

  return (
    <div className="space-y-4">

      {/* Period + action filters */}
      <div className="flex flex-wrap gap-2">
        {PERIODS.map(p => (
          <button key={p.id} onClick={() => setPeriod(p.id)} className={btnCls(period === p.id)}>
            {p.label}
          </button>
        ))}
        <div className="w-px self-stretch" style={{ background: 'var(--border-subtle)', margin: '0 4px' }} />
        {FILTERS.map(f => (
          <button key={f.id} onClick={() => setActionFilter(f.id)} className={btnCls(actionFilter === f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Search by user */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-4" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por usuario..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-ink-1 placeholder:text-ink-4 border border-border-subtle focus:outline-none focus:border-brand"
          style={{ background: 'rgba(255,255,255,0.04)' }}
        />
      </div>

      {/* Count */}
      {!loading && (
        <p className="text-xs text-ink-4">{filtered.length} registro{filtered.length !== 1 ? 's' : ''}</p>
      )}

      {/* Entries */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="rounded-xl px-5 py-10 text-center"
          style={{ background: '#1A1D24', border: '1px solid var(--border-subtle)' }}
        >
          <p className="text-sm text-ink-3">Sin registros para este período.</p>
        </div>
      ) : (
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: '#1A1D24', border: '1px solid var(--border-subtle)' }}
        >
          {filtered.map((entry, idx) => {
            const isExpanded  = expanded === entry.id
            const hasDetails  = Object.keys(entry.details ?? {}).length > 0
            const label       = ACTION_LABELS[entry.action] ?? entry.action
            return (
              <div key={entry.id} className={cn(idx < filtered.length - 1 && 'border-b border-border-subtle')}>
                <div
                  className={cn(
                    'flex items-start gap-3 px-4 py-3',
                    hasDetails && 'cursor-pointer hover:bg-surface-3 transition-colors'
                  )}
                  onClick={() => hasDetails && setExpanded(isExpanded ? null : entry.id)}
                >
                  <span className="text-base flex-shrink-0 mt-0.5 leading-none">{getIcon(entry.action)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-ink-1">{label}</span>
                      <span className="text-xs text-ink-4 flex-shrink-0">{relativeTime(entry.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-ink-3">{entry.user_name}</span>
                      {entry.entity_type && (
                        <>
                          <span className="text-ink-4">·</span>
                          <span className="text-xs text-ink-4">{entry.entity_type}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {hasDetails && (
                    <div className="flex-shrink-0 mt-0.5">
                      {isExpanded
                        ? <ChevronUp className="w-3.5 h-3.5 text-ink-4" />
                        : <ChevronDown className="w-3.5 h-3.5 text-ink-4" />
                      }
                    </div>
                  )}
                </div>

                {isExpanded && hasDetails && (
                  <div
                    className="px-4 pb-3"
                    style={{ borderTop: '1px solid var(--border-subtle)' }}
                  >
                    <pre
                      className="text-xs text-ink-3 rounded-lg p-3 mt-2 overflow-x-auto whitespace-pre-wrap break-all"
                      style={{ background: 'rgba(255,255,255,0.03)' }}
                    >
                      {JSON.stringify(entry.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
