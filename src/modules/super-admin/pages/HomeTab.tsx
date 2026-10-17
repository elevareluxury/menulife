import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAdminT } from '@/i18n/app/admin'
import { useSiteFlags } from '@/lib/siteFlags'
import { useAdminFormat } from '../lib/adminFormat'
import { adminRpc, CARD, MUTED, OK_COLOR, TEXT } from '../lib/adminRpc'
import { SuperDashboard } from './SuperDashboard'

// Resumen de Mycen (auditoría del panel): cuentas, perfiles publicados, Life OS y lo que hay para revisar, con los
// últimos 30 días por día. El resumen de Business (negocios, pedidos…) va debajo sólo si Business está prendido.

interface Overview {
  accounts: number; accounts_7d: number; accounts_30d: number
  published: number; published_7d: number; suspended: number; verified: number; life_active_7d: number
  pending_reports: number; pending_verifications: number; open_errors: number
  series: { day: string; signups: number; published: number }[]
}

export function HomeTab() {
  const t = useAdminT()
  const h = t.home
  const { number } = useAdminFormat()
  const { business } = useSiteFlags()
  const [state, setState] = useState<{ data: Overview | null; failed: boolean } | null>(null)

  useEffect(() => {
    let cancelled = false
    void Promise.resolve(adminRpc('admin_overview', { p_days: 30 })).then(({ data, error }) => {
      if (!cancelled) setState({ data: error ? null : data as Overview, failed: !!error })
    })
    return () => { cancelled = true }
  }, [])

  const o = state?.data
  const pending = o ? [
    { n: o.pending_reports, label: h.pendingReports(o.pending_reports), to: '/super-admin/denuncias' },
    { n: o.pending_verifications, label: h.pendingVerifications(o.pending_verifications), to: '/super-admin/verificaciones' },
    { n: o.open_errors, label: h.openErrors(o.open_errors), to: '/super-admin/errores' },
  ].filter(p => p.n > 0) : []

  return (
    <div style={{ maxWidth: 1100 }}>
      <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 800, color: TEXT }}>{h.title}</h1>
      <p style={{ margin: '0 0 18px', fontSize: 13.5, color: MUTED }}>{h.subtitle}</p>

      {!state ? <p role="status" style={{ color: MUTED }}>{t.common.loading}</p>
        : !o ? <p role="alert" style={{ color: '#FCA5A5' }}>{h.loadFailed}</p>
          : (
            <>
              <section aria-label={h.title} style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', marginBottom: 14 }}>
                <Kpi label={h.accounts} value={number(o.accounts)} sub={`${h.newWeek(o.accounts_7d)} · ${h.newMonth(o.accounts_30d)}`} />
                <Kpi label={h.published} value={number(o.published)} sub={h.publishedWeek(o.published_7d)} />
                <Kpi label={h.lifeActive} value={number(o.life_active_7d)} sub={h.lastWeek} />
                <Kpi label={h.verified} value={number(o.verified)} sub={h.suspended(o.suspended)} />
              </section>

              <section style={CARD} aria-labelledby="home-pending">
                <h2 id="home-pending" style={{ margin: '0 0 10px', fontSize: 16, color: TEXT }}>{h.pendingTitle}</h2>
                {pending.length === 0
                  ? <p style={{ margin: 0, color: OK_COLOR, fontSize: 14 }}>{h.nothingPending}</p>
                  : <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 6 }}>
                    {pending.map(p => (
                      <li key={p.to}>
                        <Link to={p.to} style={{ display: 'flex', alignItems: 'center', minHeight: 44, color: TEXT, fontSize: 14.5, fontWeight: 600 }}>
                          {p.label} →
                        </Link>
                      </li>
                    ))}
                  </ul>}
              </section>

              <section style={CARD} aria-labelledby="home-chart">
                <h2 id="home-chart" style={{ margin: '0 0 12px', fontSize: 16, color: TEXT }}>{h.chartTitle}</h2>
                <DayBars series={o.series} signupsLabel={h.signups} publishedLabel={h.publishedSeries} />
              </section>
            </>
          )}

      {business
        ? <div style={{ marginTop: 28 }}><SuperDashboard /></div>
        : <p style={{ marginTop: 20, color: MUTED, fontSize: 13 }}>{h.businessOff}</p>}
    </div>
  )
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div style={{ ...CARD, marginBottom: 0 }}>
      <p style={{ margin: 0, fontSize: 12.5, color: MUTED, fontWeight: 600 }}>{label}</p>
      <p style={{ margin: '6px 0 2px', fontSize: 28, fontWeight: 800, color: TEXT }}>{value}</p>
      <p style={{ margin: 0, fontSize: 12.5, color: MUTED }}>{sub}</p>
    </div>
  )
}

// Barras por día (registros y publicados), dibujadas con CSS: sin librerías de gráficos en el panel
function DayBars({ series, signupsLabel, publishedLabel }: { series: Overview['series']; signupsLabel: string; publishedLabel: string }) {
  const { date } = useAdminFormat()
  const max = Math.max(1, ...series.map(s => Math.max(s.signups, s.published)))
  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 10, fontSize: 12.5, color: MUTED }}>
        <span><span aria-hidden="true" style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: '#FF7A59', marginInlineEnd: 6 }} />{signupsLabel}</span>
        <span><span aria-hidden="true" style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: '#7DD3FC', marginInlineEnd: 6 }} />{publishedLabel}</span>
      </div>
      <ol aria-label={`${signupsLabel} · ${publishedLabel}`} style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 120, margin: 0, padding: 0, listStyle: 'none' }}>
        {series.map(s => (
          <li key={s.day} title={`${date(`${s.day}T12:00:00`)} · ${signupsLabel}: ${s.signups} · ${publishedLabel}: ${s.published}`}
            aria-label={`${date(`${s.day}T12:00:00`)}: ${signupsLabel} ${s.signups}, ${publishedLabel} ${s.published}`}
            style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'flex-end', gap: 1, height: '100%' }}>
            <span style={{ flex: 1, height: `${(s.signups / max) * 100}%`, minHeight: s.signups ? 2 : 0, background: '#FF7A59', borderRadius: '2px 2px 0 0' }} />
            <span style={{ flex: 1, height: `${(s.published / max) * 100}%`, minHeight: s.published ? 2 : 0, background: '#7DD3FC', borderRadius: '2px 2px 0 0' }} />
          </li>
        ))}
      </ol>
    </div>
  )
}
