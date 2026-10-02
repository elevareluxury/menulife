import { useEffect, useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useStudio } from '../StudioContext'
import { loadStats } from '../lib/studioApi'
import { moduleDisplayTitle } from '../lib/moduleCatalog'
import type { DailyStat } from '../lib/studioTypes'
import { Button, PageHeader } from '../components/ui'
import { useStudioT } from '@/i18n/app/studio'
import { useAppLang } from '@/i18n/app/store'
import { langLocale } from '@/i18n/app/languages'

const RANGES = [7, 30, 90] as const

export function AnalyticsPage() {
  const { profile, modules } = useStudio()
  const [days, setDays] = useState<(typeof RANGES)[number]>(30)
  const [result, setResult] = useState<{ key: string; data: DailyStat[] | 'error'; now: number } | null>(null)
  const [attempt, setAttempt] = useState(0)
  const t = useStudioT()
  const an = t.analytics
  const locale = langLocale(useAppLang(st => st.lang))
  const key = `${profile.id}:${days}:${attempt}`

  useEffect(() => {
    let cancelled = false
    loadStats(profile.id, days)
      .then(data => { if (!cancelled) setResult({ key, data, now: Date.now() }) })
      .catch(() => { if (!cancelled) setResult({ key, data: 'error', now: Date.now() }) })
    return () => { cancelled = true }
  }, [profile.id, days, key])

  const data = result?.key === key ? result.data : null
  const now = result?.now ?? 0

  const summary = useMemo(() => {
    if (!Array.isArray(data)) return null
    const sum = (types: string[]) => data.filter(d => types.includes(d.event_type)).reduce((a, d) => a + d.events, 0)
    const views = sum(['view'])
    const visitors = data.filter(d => d.event_type === 'view').reduce((a, d) => a + d.visitors, 0)
    const primary = sum(['primary_action_click'])
    const moduleClicks = sum(['module_click'])
    const shares = sum(['share', 'copy_link'])
    const vcards = sum(['vcard_download'])

    const byModule = new Map<string, number>()
    data.filter(d => d.event_type === 'module_click' && d.module_id)
      .forEach(d => byModule.set(d.module_id!, (byModule.get(d.module_id!) ?? 0) + d.events))
    const top = [...byModule.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, n]) => {
      const m = modules.find(x => x.id === id)
      return { label: m ? moduleDisplayTitle(m, t) : t.catalog.summary.deleted, n }
    })

    const series: { day: string; label: string; visitas: number }[] = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now - i * 86_400_000)
      const iso = d.toISOString().slice(0, 10)
      series.push({
        day: iso,
        label: d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' }),
        visitas: data.filter(x => x.event_type === 'view' && x.day === iso).reduce((a, x) => a + x.events, 0),
      })
    }
    return { views, visitors, primary, moduleClicks, shares, vcards, top, series }
  }, [data, modules, days, now, t, locale])

  return (
    <>
      <PageHeader title={an.title} subtitle={an.subtitle}
        actions={(
          <div className="st-segment" role="group" aria-label={an.period}>
            {RANGES.map(r => (
              <button key={r} type="button" aria-pressed={days === r} onClick={() => setDays(r)}>{an.days(r)}</button>
            ))}
          </div>
        )} />

      {data === null && <section className="st-card"><p className="st-help" role="status">{t.common.loading}</p></section>}
      {data === 'error' && (
        <section className="st-card st-empty">
          <strong>{an.error}</strong>
          <div style={{ marginTop: 12 }}><Button onClick={() => setAttempt(a => a + 1)}>{t.common.retry}</Button></div>
        </section>
      )}

      {summary && summary.views === 0 && summary.moduleClicks === 0 && summary.primary === 0 ? (
        <section className="st-card st-empty">
          <strong>{an.emptyTitle}</strong>
          {profile.status === 'published' ? an.emptyPublished : an.emptyDraft}
        </section>
      ) : summary && (
        <>
          <section className="st-card">
            <div className="st-metrics">
              <div className="st-metric"><b>{summary.views}</b><span>{an.visits}</span></div>
              <div className="st-metric"><b>{summary.visitors}</b><span>{an.visitors}</span></div>
              <div className="st-metric"><b>{summary.primary}</b><span>{an.primaryClicks}</span></div>
              <div className="st-metric"><b>{summary.moduleClicks}</b><span>{an.moduleClicks}</span></div>
              {summary.shares > 0 && <div className="st-metric"><b>{summary.shares}</b><span>{an.shares}</span></div>}
              {summary.vcards > 0 && <div className="st-metric"><b>{summary.vcards}</b><span>{an.vcards}</span></div>}
            </div>
          </section>

          <section className="st-card">
            <h2 className="st-card-title">{an.perDay}</h2>
            <div style={{ width: '100%', height: 200 }} role="img" dir="ltr"
              aria-label={an.chartLabel(days, summary.views)}>
              <ResponsiveContainer>
                <AreaChart data={summary.series} margin={{ top: 6, right: 6, bottom: 0, left: -24 }}>
                  <CartesianGrid stroke="rgba(241,240,233,0.06)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: '#7D7F76', fontSize: 11 }} axisLine={false} tickLine={false}
                    interval={Math.max(0, Math.floor(days / 7) - 1)} />
                  <YAxis allowDecimals={false} tick={{ fill: '#7D7F76', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#20221F', border: '1px solid rgba(241,240,233,0.12)', borderRadius: 10, fontSize: 12 }}
                    labelStyle={{ color: '#B9B9AE' }} itemStyle={{ color: '#F1F0E9' }} />
                  <Area type="monotone" dataKey="visitas" name={an.visits} stroke="#F1F0E9" strokeWidth={2} fill="rgba(241,240,233,0.10)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="st-card">
            <h2 className="st-card-title">{an.topModules}</h2>
            {summary.top.length === 0
              ? <p className="st-help" style={{ margin: 0 }}>{an.noClicks}</p>
              : (
                <ol className="st-checklist" style={{ listStyle: 'decimal', paddingInlineStart: 20 }}>
                  {summary.top.map(row => (
                    <li key={row.label} style={{ display: 'list-item' }}>
                      {row.label} — <strong>{row.n}</strong>
                    </li>
                  ))}
                </ol>
              )}
          </section>

          <p className="st-help">
            {an.howWeMeasure}
          </p>
        </>
      )}
    </>
  )
}
