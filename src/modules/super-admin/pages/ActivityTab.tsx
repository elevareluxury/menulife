import { useEffect, useState } from 'react'
import { useAdminT, type AdminDict } from '@/i18n/app/admin'
import { useAdminFormat } from '../lib/adminFormat'
import { adminRpc, BTN, CARD, MUTED, TEXT, WARN_COLOR } from '../lib/adminRpc'

// Actividad del equipo (auditoría del panel): lo que anota la base sola en cada acción de un super-admin
// (admin_audit_log, admin_list_audit). Se ve de a 50, lo último primero.

interface AuditRow {
  id: string; action: string; target_type: string; target_id: string | null
  details: Record<string, unknown>; created_at: string; admin_email: string | null
}

const PAGE = 50
type ActionKey = Exclude<keyof AdminDict['activity'], 'title' | 'intro' | 'empty' | 'loadMore' | 'loadFailed'>

export function ActivityTab() {
  const t = useAdminT()
  const a = t.activity
  const { dateTime } = useAdminFormat()
  const [rows, setRows] = useState<AuditRow[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [more, setMore] = useState(false)
  const [busy, setBusy] = useState(false)

  const apply = (page: AuditRow[], append: boolean) => {
    setRows(prev => (append && prev ? [...prev, ...page] : page))
    setMore(page.length === PAGE)
  }

  useEffect(() => {
    let cancelled = false
    void Promise.resolve(adminRpc('admin_list_audit', { p_limit: PAGE, p_before: null })).then(({ data, error }) => {
      if (cancelled) return
      if (error) setFailed(true)
      else apply((data as AuditRow[] | null) ?? [], false)
    })
    return () => { cancelled = true }
  }, [])

  const loadMore = async (before: string) => {
    setBusy(true)
    const { data, error } = await adminRpc('admin_list_audit', { p_limit: PAGE, p_before: before })
    setBusy(false)
    if (error) { setFailed(true); return }
    apply((data as AuditRow[] | null) ?? [], true)
  }

  const label = (action: string) => (action in a ? a[action as ActionKey] : action)
  const detail = (r: AuditRow) => {
    const handle = typeof r.details.handle === 'string' ? `/${r.details.handle}` : null
    const reason = typeof r.details.reason === 'string' ? r.details.reason : null
    const message = typeof r.details.message === 'string' ? r.details.message : null
    return [handle, r.target_type === 'mycen_site_flags' ? r.target_id : null, reason, message].filter(Boolean).join(' · ')
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 800, color: TEXT }}>{a.title}</h1>
      <p style={{ margin: '0 0 16px', fontSize: 13.5, color: MUTED }}>{a.intro}</p>
      {failed ? <p role="alert" style={{ color: WARN_COLOR }}>{a.loadFailed}</p>
        : !rows ? <p role="status" style={{ color: MUTED }}>{t.common.loading}</p>
          : rows.length === 0 ? <p style={{ color: MUTED }}>{a.empty}</p>
            : (
              <>
                <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                  {rows.map(r => (
                    <li key={r.id} style={{ ...CARD, padding: '12px 16px', marginBottom: 8 }}>
                      <p style={{ margin: 0, color: TEXT, fontWeight: 700, fontSize: 14 }}>{label(r.action)}</p>
                      <p style={{ margin: '3px 0 0', color: MUTED, fontSize: 12.5, overflowWrap: 'anywhere' }}>
                        {r.admin_email ?? '—'} · {dateTime(r.created_at)}{detail(r) ? ` · ${detail(r)}` : ''}
                      </p>
                    </li>
                  ))}
                </ol>
                {more && (
                  <button type="button" style={BTN} disabled={busy} onClick={() => { void loadMore(rows[rows.length - 1].created_at) }}>
                    {a.loadMore}
                  </button>
                )}
              </>
            )}
    </div>
  )
}
