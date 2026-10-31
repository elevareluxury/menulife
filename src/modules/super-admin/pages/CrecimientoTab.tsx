import { useEffect, useState, type ReactNode } from 'react'
import { useAdminT, type AdminDict } from '@/i18n/app/admin'
import { useStudioT } from '@/i18n/app/studio'
import { LANG_INFO, isAppLang } from '@/i18n/app/languages'
import { saveFile } from '@/lib/nativeFiles'
import { useAdminFormat } from '../lib/adminFormat'
import { adminRpc, BTN, CARD, MUTED, OK_COLOR, TEXT } from '../lib/adminRpc'
import {
  change, cityOf, funnelRows, pct, REGIONS, toCsv,
  type Cohort, type GrowthAdoption, type GrowthFunnel, type GrowthOverview, type Keyed, type Region,
} from '../lib/growth'

// Crecimiento (panel del equipo): lo que mide una app mundial para seguir creciendo — activos por día, semana y mes,
// stickiness, crecimiento contra el período anterior, ciclo de vida, retención por cohorte, embudo, contagio,
// mundo y dispositivos, uso de cada función y visitas. Todo de admin_growth_*; cada tabla se exporta a CSV.

const A1 = '#FF7A59'
const A2 = '#7DD3FC'
const BAD = '#F87171'
const PERIODS = [30, 90, 365] as const

interface Data { overview: GrowthOverview; retention: Cohort[]; funnel: GrowthFunnel; adoption: GrowthAdoption }

export function CrecimientoTab() {
  const t = useAdminT()
  const g = t.growth
  const st = useStudioT()
  const { number, date } = useAdminFormat()
  const [days, setDays] = useState<(typeof PERIODS)[number]>(90)
  const [state, setState] = useState<{ days: number; data: Data | null; failed: boolean } | null>(null)

  useEffect(() => {
    let cancelled = false
    void Promise.all([
      Promise.resolve(adminRpc('admin_growth_overview', { p_days: days })),
      Promise.resolve(adminRpc('admin_growth_retention')),
      Promise.resolve(adminRpc('admin_growth_funnel', { p_days: Math.min(days, 90) })),
      Promise.resolve(adminRpc('admin_growth_adoption', { p_days: Math.min(days, 90) })),
    ]).then(([o, r, f, a]) => {
      if (cancelled) return
      if (o.error || r.error || f.error || a.error) { setState({ days, data: null, failed: true }); return }
      setState({
        days,
        data: { overview: o.data as GrowthOverview, retention: (r.data as Cohort[]) ?? [], funnel: f.data as GrowthFunnel, adoption: a.data as GrowthAdoption },
        failed: false,
      })
    })
    return () => { cancelled = true }
  }, [days])

  const n = (v: number | null | undefined, digits = 0) => (v === null || v === undefined ? '—' : number(v, digits))
  const p = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${number(v, 1)} %`)
  // Mientras llega otro período se muestra "Cargando…" (no los números del anterior)
  const current = state && state.days === days ? state : null
  const d = current?.data

  return (
    <div style={{ maxWidth: 1100 }}>
      <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 800, color: TEXT }}>{g.title}</h1>
      <p style={{ margin: '0 0 14px', fontSize: 13.5, color: MUTED }}>{g.intro}</p>

      <div role="group" aria-label={g.period} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {PERIODS.map(x => (
          <button key={x} type="button" aria-pressed={days === x} onClick={() => setDays(x)}
            style={{ ...BTN, background: days === x ? 'rgba(255,122,89,0.16)' : BTN.background, borderColor: days === x ? A1 : 'rgba(255,255,255,0.12)' }}>
            {g.days(number(x))}
          </button>
        ))}
      </div>

      {!current ? <p role="status" style={{ color: MUTED }}>{t.common.loading}</p>
        : !d ? <p role="alert" style={{ color: BAD }}>{g.loadFailed}</p>
          : (
            <>
              <Kpis o={d.overview} g={g} n={n} p={p} />

              <Section id="gr-active" title={g.activeTitle} help={g.activeHelp}
                csv={() => download(`mycen-activos-${d.overview.today}.csv`,
                  toCsv(['day', 'dau', 'wau', 'mau', 'signups', 'published'], d.overview.daily.map(x => [x.day, x.dau, x.wau, x.mau, x.signups, x.published])))}
                g={g}>
                <Bars label={g.activeTitle} items={d.overview.daily.map(x => ({ key: x.day, a: x.dau, b: x.signups }))}
                  aLabel={g.kpi.dau} bLabel={g.signups} date={date} />
              </Section>

              <Section id="gr-life" title={g.lifecycleTitle} g={g}>
                <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
                  {(['new', 'retained', 'resurrected', 'churned'] as const).map(k => (
                    <div key={k} data-testid={`lifecycle-${k}`}>
                      <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: k === 'churned' ? BAD : TEXT }}>{n(d.overview.lifecycle[k])}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 13.5, fontWeight: 700, color: TEXT }}>{g.lifecycle[k]}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 12.5, color: MUTED }}>{g.lifecycle[`${k}Help`]}</p>
                    </div>
                  ))}
                </div>
              </Section>

              <Section id="gr-ret" title={g.retentionTitle} help={g.retentionHelp} g={g}
                csv={() => download('mycen-retencion.csv', toCsv(['week', 'size', ...Array.from({ length: 12 }, (_, i) => `w${i}`)],
                  d.retention.map(c => [c.week, c.size, ...c.weeks])))}>
                <Retention cohorts={d.retention} g={g} n={n} date={date} />
              </Section>

              <Section id="gr-funnel" title={g.funnelTitle} help={g.funnelHelp} g={g}
                csv={() => download('mycen-embudo.csv', toCsv(['step', 'users'], d.funnel.steps.map(s => [s.key, s.users])))}>
                <Funnel f={d.funnel} g={g} n={n} p={p} />
              </Section>

              <Section id="gr-viral" title={g.viralTitle} g={g}>
                <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', marginBottom: 14 }}>
                  <Stat label={g.referralSignups} value={n(d.funnel.referrals.signups)}
                    sub={d.funnel.referrals.share_of_signups === null ? g.noData : g.shareOfSignups(p(d.funnel.referrals.share_of_signups))} />
                  <Stat label={g.referrers} value={n(d.funnel.referrals.referrers)} />
                  <Stat label={g.kFactor} value={d.funnel.referrals.k === null ? '—' : number(d.funnel.referrals.k, 2)} sub={g.kHelp}
                    color={d.funnel.referrals.k !== null && d.funnel.referrals.k >= 1 ? OK_COLOR : undefined} />
                </div>
                <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
                  <KeyBars title={g.sourcesTitle} rows={d.funnel.sources} value={r => r.visits ?? 0}
                    label={r => (r.key === 'direct' ? g.direct : r.key)} n={n} />
                  <KeyBars title={g.channelsTitle} rows={d.funnel.signup_channels} value={r => r.users ?? 0}
                    label={r => (r.key === 'direct' ? g.direct : r.key)} n={n} />
                </div>
              </Section>

              <Section id="gr-world" title={g.worldTitle} help={g.worldHelp} g={g}
                csv={() => download('mycen-mundo.csv', toCsv(['group', 'key', 'users'], [
                  ...d.overview.platforms.map(r => ['platform', r.key, r.users]),
                  ...d.overview.languages.map(r => ['language', r.key, r.users]),
                  ...d.overview.regions.map(r => ['region', r.key, r.users]),
                  ...d.overview.timezones.map(r => ['timezone', r.key, r.users]),
                ]))}>
                <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
                  <KeyBars title={g.platformsTitle} rows={d.overview.platforms} value={r => r.users ?? 0}
                    label={r => g.platforms[r.key as keyof typeof g.platforms] ?? r.key} n={n} />
                  <KeyBars title={g.languagesTitle} rows={d.overview.languages} value={r => r.users ?? 0}
                    label={r => (isAppLang(r.key) ? LANG_INFO[r.key].native : r.key)} n={n} />
                  <KeyBars title={g.regionsTitle} rows={d.overview.regions} value={r => r.users ?? 0}
                    label={r => ((REGIONS as readonly string[]).includes(r.key) ? g.regions[r.key as Region] : r.key)} n={n} />
                  <KeyBars title={g.timezonesTitle} rows={d.overview.timezones} value={r => r.users ?? 0} label={r => cityOf(r.key)} n={n} />
                  <KeyBars title={g.areasTitle} n={n} value={r => r.users ?? 0} label={r => g.areas[r.key as 'life' | 'studio']}
                    rows={[{ key: 'life', users: d.overview.areas.life }, { key: 'studio', users: d.overview.areas.studio }]} />
                </div>
              </Section>

              <Section id="gr-adopt" title={g.adoptionTitle} g={g}
                csv={() => download('mycen-uso.csv', toCsv(['group', 'key', 'count', 'pct'], [
                  ...d.adoption.modules.map(r => ['module', r.key, r.profiles, r.pct]),
                  ...d.adoption.layouts.map(r => ['layout', r.key, r.profiles, r.pct]),
                  ...d.adoption.life.map(r => ['life', r.key, r.users, pct(r.users ?? 0, d.adoption.active_users)]),
                ]))}>
                <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
                  <KeyBars title={g.modulesTitle} rows={d.adoption.modules} value={r => r.profiles ?? 0} n={n}
                    label={r => (st.catalog.types as Record<string, { label: string }>)[r.key]?.label ?? r.key}
                    extra={r => g.ofProfiles(p(r.pct))} />
                  <KeyBars title={g.layoutsTitle} rows={d.adoption.layouts} value={r => r.profiles ?? 0} n={n}
                    label={r => (st.look.layouts as Record<string, { name: string }>)[r.key]?.name ?? r.key}
                    extra={r => g.ofProfiles(p(r.pct))} />
                  <KeyBars title={g.modesTitle} rows={d.adoption.modes} value={r => r.profiles ?? 0} n={n}
                    label={r => g.modes[r.key as 'universo' | 'amanecer'] ?? r.key} />
                  <KeyBars title={g.lifeTitle} n={n} rows={d.adoption.life.filter(r => r.users !== null).map(r => ({ key: r.key, users: r.users ?? 0 }))}
                    value={r => r.users ?? 0} label={r => g.life[r.key as keyof typeof g.life] ?? r.key}
                    extra={r => g.ofActive(p(pct(r.users ?? 0, d.adoption.active_users)))} />
                </div>
              </Section>

              <Section id="gr-visits" title={g.visitsTitle} g={g}
                csv={() => download('mycen-visitas.csv', toCsv(['day', 'views', 'visitors'], d.overview.visits.map(v => [v.day, v.views, v.visitors])))}>
                <Bars label={g.visitsTitle} items={d.overview.visits.map(v => ({ key: v.day, a: v.visitors, b: v.views }))}
                  aLabel={g.visitors} bLabel={g.views} date={date} />
                <h3 style={{ margin: '16px 0 8px', fontSize: 14, color: TEXT }}>{g.topTitle}</h3>
                {d.adoption.top_profiles.length === 0 ? <p style={{ margin: 0, color: MUTED, fontSize: 13.5 }}>{g.noData}</p> : (
                  <ol style={{ margin: 0, paddingInlineStart: 22, display: 'grid', gap: 2 }}>
                    {d.adoption.top_profiles.map(tp => (
                      <li key={tp.handle} style={{ color: TEXT, fontSize: 13.5 }}>
                        <a href={`/${tp.handle}`} target="_blank" rel="noopener noreferrer"
                          style={{ color: TEXT, textDecoration: 'underline', display: 'inline-flex', minHeight: 44, alignItems: 'center' }}>/{tp.handle}</a>
                        <span style={{ color: MUTED }}> · {g.people(n(tp.visitors))} · {n(tp.views)} {g.views.toLowerCase()}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </Section>

              <Section id="gr-monthly" title={g.monthlyTitle} g={g}
                csv={() => download('mycen-mes-a-mes.csv', toCsv(['month', 'signups', 'active', 'published', 'accounts'],
                  d.overview.monthly.map(m => [m.month, m.signups, m.active, m.published, m.accounts])))}>
                <Monthly o={d.overview} g={g} n={n} />
              </Section>
            </>
          )}
    </div>
  )
}

type G = AdminDict['growth']
type Num = (v: number | null | undefined, digits?: number) => string

function download(name: string, csv: string) {
  void saveFile(new Blob([csv], { type: 'text/csv;charset=utf-8' }), name)
}

function Section({ id, title, help, csv, g, children }: { id: string; title: string; help?: string; csv?: () => void; g: G; children: ReactNode }) {
  return (
    <section style={CARD} aria-labelledby={id}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: help ? 2 : 12 }}>
        <h2 id={id} style={{ margin: 0, fontSize: 16, color: TEXT }}>{title}</h2>
        {csv && <button type="button" style={{ ...BTN, padding: '6px 12px', fontSize: 12.5 }} onClick={csv}>{g.csv}</button>}
      </div>
      {help && <p style={{ margin: '0 0 12px', fontSize: 12.5, color: MUTED }}>{help}</p>}
      {children}
    </section>
  )
}

function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div>
      <p style={{ margin: 0, fontSize: 12.5, color: MUTED, fontWeight: 600 }}>{label}</p>
      <p style={{ margin: '4px 0 2px', fontSize: 26, fontWeight: 800, color: color ?? TEXT }}>{value}</p>
      {sub && <p style={{ margin: 0, fontSize: 12.5, color: MUTED }}>{sub}</p>}
    </div>
  )
}

function Kpis({ o, g, n, p }: { o: GrowthOverview; g: G; n: Num; p: (v: number | null) => string }) {
  const delta = (cur: number, prev: number) => {
    const c = change(cur, prev)
    return c === null ? g.noBase : g.vsPrevious(`${c > 0 ? '+' : ''}${p(c)}`)
  }
  const kpis = [
    { id: 'dau', label: g.kpi.dau, value: n(o.dau) },
    { id: 'wau', label: g.kpi.wau, value: n(o.wau), sub: delta(o.wau, o.growth.wau_prev) },
    { id: 'mau', label: g.kpi.mau, value: n(o.mau), sub: delta(o.mau, o.growth.mau_prev) },
    { id: 'stickiness', label: g.kpi.stickiness, value: p(o.stickiness), sub: g.kpi.stickinessHelp },
    { id: 'signups', label: g.kpi.signups7, value: n(o.growth.signups_7d), sub: delta(o.growth.signups_7d, o.growth.signups_prev_7d) },
    { id: 'accounts', label: g.kpi.accounts, value: n(o.accounts) },
    { id: 'published', label: g.kpi.published, value: n(o.growth.published_total),
      sub: `${g.kpi.published7(n(o.growth.published_7d))} · ${delta(o.growth.published_7d, o.growth.published_prev_7d)}` },
  ]
  return (
    <section aria-label={g.title} style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', marginBottom: 14 }}>
      {kpis.map(k => (
        <div key={k.id} data-testid={`kpi-${k.id}`} style={{ ...CARD, marginBottom: 0 }}>
          <Stat label={k.label} value={k.value} sub={k.sub} />
        </div>
      ))}
    </section>
  )
}

/** Barras por día dibujadas con CSS (dos series); cada día tiene su texto para lectores de pantalla */
function Bars({ label, items, aLabel, bLabel, date }: { label: string; items: { key: string; a: number; b: number }[]; aLabel: string; bLabel: string; date: (iso: string) => string }) {
  const max = Math.max(1, ...items.map(i => Math.max(i.a, i.b)))
  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 8, fontSize: 12.5, color: MUTED, flexWrap: 'wrap' }}>
        <span><span aria-hidden="true" style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: A1, marginInlineEnd: 6 }} />{aLabel}</span>
        <span><span aria-hidden="true" style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: A2, marginInlineEnd: 6 }} />{bLabel}</span>
      </div>
      <ol aria-label={label} style={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 130, margin: 0, padding: 0, listStyle: 'none' }}>
        {items.map(i => (
          <li key={i.key} title={`${date(`${i.key}T12:00:00`)} · ${aLabel}: ${i.a} · ${bLabel}: ${i.b}`}
            aria-label={`${date(`${i.key}T12:00:00`)}: ${aLabel} ${i.a}, ${bLabel} ${i.b}`}
            style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'flex-end', gap: 1, height: '100%' }}>
            <span style={{ flex: 1, height: `${(i.a / max) * 100}%`, minHeight: i.a ? 2 : 0, background: A1, borderRadius: '2px 2px 0 0' }} />
            <span style={{ flex: 1, height: `${(i.b / max) * 100}%`, minHeight: i.b ? 2 : 0, background: A2, borderRadius: '2px 2px 0 0' }} />
          </li>
        ))}
      </ol>
    </div>
  )
}

function KeyBars({ title, rows, value, label, extra, n }: {
  title: string; rows: Keyed[]; value: (r: Keyed) => number; label: (r: Keyed) => string; extra?: (r: Keyed) => string; n: Num
}) {
  const max = Math.max(1, ...rows.map(value))
  return (
    <div>
      <h3 style={{ margin: '0 0 8px', fontSize: 14, color: TEXT }}>{title}</h3>
      {rows.length === 0 ? <p style={{ margin: 0, fontSize: 13, color: MUTED }}>—</p> : (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 8 }}>
          {rows.map(r => (
            <li key={r.key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13, color: TEXT }}>
                <span style={{ overflowWrap: 'anywhere' }}>{label(r)}</span>
                <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{n(value(r))}</span>
              </div>
              <div aria-hidden="true" style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.06)', marginTop: 4 }}>
                <div style={{ width: `${(value(r) / max) * 100}%`, height: '100%', borderRadius: 999, background: A1 }} />
              </div>
              {extra && <p style={{ margin: '2px 0 0', fontSize: 12, color: MUTED }}>{extra(r)}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Retention({ cohorts, g, n, date }: { cohorts: Cohort[]; g: G; n: Num; date: (iso: string) => string }) {
  if (cohorts.length === 0) return <p style={{ margin: 0, color: MUTED, fontSize: 13.5 }}>{g.noData}</p>
  const cols = Array.from({ length: 12 }, (_, i) => i)
  const cell: React.CSSProperties = { padding: '6px 6px', fontSize: 12, textAlign: 'center', whiteSpace: 'nowrap', color: TEXT }
  return (
    <div style={{ overflowX: 'auto' }} tabIndex={0} role="region" aria-label={g.retentionTitle}>
      <table style={{ borderCollapse: 'separate', borderSpacing: 2, minWidth: 640 }}>
        <thead>
          <tr>
            <th scope="col" style={{ ...cell, textAlign: 'start', color: MUTED }}>{g.cohort}</th>
            <th scope="col" style={{ ...cell, color: MUTED }}>{g.size}</th>
            {cols.map(c => <th key={c} scope="col" style={{ ...cell, color: MUTED }}>{g.weekN(String(c))}</th>)}
          </tr>
        </thead>
        <tbody>
          {cohorts.map(c => (
            <tr key={c.week}>
              <th scope="row" style={{ ...cell, textAlign: 'start', fontWeight: 600 }}>{date(`${c.week}T12:00:00`)}</th>
              <td style={cell}>{n(c.size)}</td>
              {cols.map(k => {
                const v = c.weeks[k]
                return (
                  <td key={k} style={{ ...cell, borderRadius: 4, background: v === null || v === undefined ? 'transparent' : `rgba(255,122,89,${0.08 + (v / 100) * 0.55})` }}>
                    {v === null || v === undefined ? '' : `${n(v, 0)}%`}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Funnel({ f, g, n, p }: { f: GrowthFunnel; g: G; n: Num; p: (v: number | null) => string }) {
  const rows = funnelRows(f.steps)
  const max = Math.max(1, ...rows.map(r => r.users))
  const back = f.steps.find(s => s.key === 'came_back')
  const signed = f.steps.find(s => s.key === 'signed_up')?.users ?? 0
  return (
    <div>
      <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 10 }}>
        {rows.map(r => (
          <li key={r.key} data-testid={`funnel-${r.key}`} data-worst={r.worst || undefined}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13.5, color: TEXT, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600 }}>{g.steps[r.key]}</span>
              <span><strong>{n(r.users)}</strong>
                {r.ofSignups !== null && <span style={{ color: MUTED }}> · {g.ofSignups(p(r.ofSignups))}</span>}
                {r.ofPrevious !== null && <span style={{ color: r.worst ? BAD : MUTED }}> · {g.ofPrevious(p(r.ofPrevious))}</span>}
              </span>
            </div>
            <div aria-hidden="true" style={{ height: 10, borderRadius: 999, background: 'rgba(255,255,255,0.06)', marginTop: 4 }}>
              <div style={{ width: `${(r.users / max) * 100}%`, height: '100%', borderRadius: 999, background: r.worst ? BAD : A1 }} />
            </div>
            {r.worst && <p style={{ margin: '3px 0 0', fontSize: 12.5, color: BAD, fontWeight: 700 }}>{g.biggestDrop}</p>}
          </li>
        ))}
      </ol>
      {back && (
        <p style={{ margin: '12px 0 0', fontSize: 13.5, color: TEXT }}>
          {g.steps.came_back}: <strong>{n(back.users)}</strong>
          <span style={{ color: MUTED }}> · {g.ofSignups(p(pct(back.users, signed)))}</span>
        </p>
      )}
    </div>
  )
}

function Monthly({ o, g, n }: { o: GrowthOverview; g: G; n: Num }) {
  const cell: React.CSSProperties = { padding: '6px 8px', fontSize: 13, color: TEXT, textAlign: 'end', whiteSpace: 'nowrap' }
  return (
    <div style={{ overflowX: 'auto' }} tabIndex={0} role="region" aria-label={g.monthlyTitle}>
      <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 420 }}>
        <thead>
          <tr>
            {[g.month, g.signups, g.active, g.publishedCol, g.accountsCol].map((h, i) => (
              <th key={h} scope="col" style={{ ...cell, color: MUTED, textAlign: i === 0 ? 'start' : 'end', fontWeight: 600 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {o.monthly.map(m => (
            <tr key={m.month} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <th scope="row" style={{ ...cell, textAlign: 'start', fontWeight: 600 }}>{m.month}</th>
              <td style={cell}>{n(m.signups)}</td>
              <td style={cell}>{n(m.active)}</td>
              <td style={cell}>{n(m.published)}</td>
              <td style={cell}>{n(m.accounts)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
