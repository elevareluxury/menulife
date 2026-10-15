import { useEffect, useMemo, useState } from 'react'
import { loadClickStats } from '../lib/studioApi'
import { listProjects } from '../lib/projectsApi'
import { portfolioProjectIds, rankClicks, type ClickStats, type RankedClick } from '../lib/clickStats'
import { moduleDisplayTitle } from '../lib/moduleCatalog'
import type { StudioModule } from '../lib/studioTypes'
import { Button } from './ui'
import { useStudioT } from '@/i18n/app/studio'
import { useAppLang } from '@/i18n/app/store'
import { langLocale } from '@/i18n/app/languages'
import { supportListenStrings } from '@/modules/profile/lib/supportListenI18n'

const VISIBLE = 10

/** Analítica → "Lo que más tocan": cada botón del perfil con sus toques y el % sobre las visitas; y totales por módulo. */
export function ClickRanking({ profileId, identityId, days, modules }: {
  profileId: string
  identityId: string | null
  days: number
  modules: StudioModule[]
}) {
  const t = useStudioT()
  const an = t.analytics
  const lang = useAppLang(st => st.lang)
  const locale = langLocale(lang)
  const key = `${profileId}:${days}`
  const [result, setResult] = useState<{ key: string; stats: ClickStats | 'error'; projects: Map<string, string> } | null>(null)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    let cancelled = false
    loadClickStats(profileId, days)
      .then(async stats => {
        // Nombres de proyectos sólo si se tocó alguno del portfolio
        const projects = new Map<string, string>()
        if (identityId && portfolioProjectIds(stats).length) {
          try {
            for (const p of await listProjects(identityId)) projects.set(p.id, p.title)
          } catch { /* sin nombres: queda "ya no está" */ }
        }
        if (!cancelled) setResult({ key, stats, projects })
      })
      .catch(() => { if (!cancelled) setResult({ key, stats: 'error', projects: new Map() }) })
    return () => { cancelled = true }
  }, [profileId, identityId, days, key])

  const current = result?.key === key ? result : null
  const ranked = useMemo(() => {
    if (!current || current.stats === 'error') return null
    const sl = supportListenStrings(lang)
    return rankClicks(current.stats, modules, {
      labels: {
        primary: an.clickPrimary, reserve: an.clickReserve, vcard: an.clickSaveContact,
        itemGone: an.clickItemGone, moduleGone: t.catalog.summary.deleted,
        supportAlias: sl.supportAlias, supportPix: sl.supportPix,
      },
      moduleTitle: m => moduleDisplayTitle(m as StudioModule, t),
      projectTitles: current.projects,
    })
  }, [current, modules, an, t, lang])

  if (current?.stats === 'error') return null
  const pct = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 })
  const items = ranked ? (showAll ? ranked.items : ranked.items.slice(0, VISIBLE)) : []

  const list = (rows: RankedClick[], labelledBy: string) => {
    const max = Math.max(1, ...rows.map(r => r.taps))
    return (
      <ol className="st-sources st-clicks" aria-labelledby={labelledBy}>
        {rows.map(r => (
          <li key={r.key}>
            <div className="st-row st-clicks-row">
              <span className="st-clicks-label">
                {r.label}
                {r.module && <span className="st-clicks-module">{an.clickInModule(r.module)}</span>}
              </span>
              <span className="st-clicks-numbers">
                <strong>{an.clickTaps(r.taps)}</strong>
                {r.ctr != null && <span>{an.clickCtr(pct.format(r.ctr))}</span>}
              </span>
            </div>
            <div className="st-source-bar" aria-hidden="true"><span style={{ width: `${(r.taps / max) * 100}%` }} /></div>
          </li>
        ))}
      </ol>
    )
  }

  return (
    <>
      <section className="st-card" aria-labelledby="clicks-title">
        <h2 id="clicks-title" className="st-card-title">{an.clicksTitle}</h2>
        <p className="st-help" style={{ marginTop: 0 }}>{an.clicksHelp}</p>
        {ranked === null && <p className="st-help" role="status">{t.common.loading}</p>}
        {ranked && ranked.items.length === 0 && <p className="st-help" style={{ margin: 0 }}>{an.noClicks}</p>}
        {ranked && ranked.items.length > 0 && list(items, 'clicks-title')}
        {ranked && ranked.items.length > VISIBLE && (
          <div style={{ marginTop: 12 }}>
            <Button onClick={() => setShowAll(v => !v)} aria-expanded={showAll}>
              {showAll ? an.clickShowLess : an.clickShowAll(ranked.items.length)}
            </Button>
          </div>
        )}
      </section>

      {ranked && ranked.modules.length > 0 && (
        <section className="st-card" aria-labelledby="clicks-modules-title">
          <h2 id="clicks-modules-title" className="st-card-title">{an.topModules}</h2>
          {list(ranked.modules, 'clicks-modules-title')}
        </section>
      )}
    </>
  )
}
