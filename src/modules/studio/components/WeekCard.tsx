import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { useStudio } from '../StudioContext'
import { countMessagesSince, loadStats, loadTrafficSources } from '../lib/studioApi'
import { weeklySummary, type WeeklySummary } from '../lib/weekly'
import { useStudioT } from '@/i18n/app/studio'
import { useEverywhereT } from '@/i18n/app/share/everywhere'

/**
 * "Tu semana" en el Inicio de Studio (V1 · etapa 08): visitas, toques en la acción principal, contactos guardados y
 * mensajes de los últimos 7 días, de dónde llegaron y una frase en positivo con el canal que más trajo.
 */
export function WeekCard() {
  const { profile } = useStudio()
  const t = useStudioT()
  const w = t.week
  const names = t.analytics.sourceNames
  const everywhere = useEverywhereT()
  const [data, setData] = useState<WeeklySummary | null | 'error'>(null)

  useEffect(() => {
    let cancelled = false
    const since = new Date(Date.now() - 7 * 86_400_000)
    Promise.all([
      loadStats(profile.id, 7),
      loadTrafficSources(profile.id, 7).catch(() => []),
      countMessagesSince(profile.id, since).catch(() => 0),
    ]).then(([stats, sources, messages]) => { if (!cancelled) setData(weeklySummary(stats, sources, messages)) },
      () => { if (!cancelled) setData('error') })
    return () => { cancelled = true }
  }, [profile.id])

  const h = data && data !== 'error' ? data.highlight : null
  const highlight = !h ? null
    : h.kind === 'source' ? w.topSource(names[h.key as keyof typeof names] ?? h.key, h.visits)
    : h.kind === 'scan' ? w.topScan(h.visits)
    : w.total(h.visits)

  return (
    <section className="st-card st-week" aria-labelledby="st-week-title">
      <div>
        <h2 id="st-week-title" className="st-card-title" style={{ margin: 0 }}>{w.title}</h2>
        <p className="st-help" style={{ margin: '4px 0 0' }}>{w.help}</p>
      </div>
      {data === null && <p className="st-help">{t.common.loading}</p>}
      {data === 'error' && <p className="st-error">{t.overview.statsError}</p>}
      {data && data !== 'error' && (
        <>
          {highlight
            ? <p className="st-week-highlight"><Sparkles size={18} aria-hidden="true" /> {highlight}</p>
            : (
              <div className="st-empty">
                <p style={{ margin: '0 0 12px' }}>{w.empty}</p>
                <Link to="/studio/everywhere" className="st-btn st-btn-secondary st-btn-sm">{everywhere.title}</Link>
              </div>
            )}
          <dl className="st-metrics st-week-metrics">
            <div className="st-metric"><dt>{w.visits}</dt><dd>{data.visits}</dd></div>
            <div className="st-metric"><dt>{w.primary}</dt><dd>{data.primary}</dd></div>
            <div className="st-metric"><dt>{w.contacts}</dt><dd>{data.contacts}</dd></div>
            <div className="st-metric"><dt>{w.messages}</dt><dd>{data.messages}</dd></div>
          </dl>
          {data.sources.length > 0 && (
            <div>
              <h3 className="st-card-title" style={{ margin: '0 0 8px' }}>{w.from}</h3>
              <ul className="st-sources">
                {data.sources.map(s => (
                  <li key={s.key + (s.detail ?? '')}>
                    <div className="st-row" style={{ justifyContent: 'space-between' }}>
                      <span>{names[s.key as keyof typeof names] ?? s.key}{s.detail ? ` · ${s.detail}` : ''}</span>
                      <span className="st-help">{t.analytics.sourceVisits(s.visits)}</span>
                    </div>
                    <div className="st-source-bar" aria-hidden="true">
                      <span style={{ width: `${Math.max(4, Math.round((s.visits / data.sources[0].visits) * 100))}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {(data.visits > 0) && <Link to="/studio/analytics" className="st-btn st-btn-ghost st-btn-sm" style={{ alignSelf: 'flex-start' }}>{w.seeAll}</Link>}
        </>
      )}
    </section>
  )
}
