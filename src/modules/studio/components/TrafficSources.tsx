import { useEffect, useState } from 'react'
import { loadTrafficSources } from '../lib/studioApi'
import { groupSources, type SourceGroup } from '../lib/trafficSources'
import { useStudioT } from '@/i18n/app/studio'

/** Analítica → "De dónde vienen" (Fase 7): visitas por canal en el período elegido. */
export function TrafficSources({ profileId, days }: { profileId: string; days: number }) {
  const an = useStudioT().analytics
  const key = `${profileId}:${days}`
  const [result, setResult] = useState<{ key: string; groups: SourceGroup[] | 'error' } | null>(null)

  useEffect(() => {
    let cancelled = false
    loadTrafficSources(profileId, days)
      .then(rows => { if (!cancelled) setResult({ key, groups: groupSources(rows) }) })
      .catch(() => { if (!cancelled) setResult({ key, groups: 'error' }) })
    return () => { cancelled = true }
  }, [profileId, days, key])

  const groups = result?.key === key ? result.groups : null
  if (groups === 'error') return null
  const max = Array.isArray(groups) ? Math.max(1, ...groups.map(g => g.visits)) : 1

  return (
    <section className="st-card" aria-labelledby="sources-title">
      <h2 id="sources-title" className="st-card-title">{an.sources}</h2>
      <p className="st-help" style={{ marginTop: 0 }}>{an.sourcesHelp}</p>
      {groups === null && <p className="st-help" role="status">…</p>}
      {Array.isArray(groups) && groups.length === 0 && <p className="st-help" style={{ margin: 0 }}>{an.sourcesEmpty}</p>}
      {Array.isArray(groups) && groups.length > 0 && (
        <ul className="st-sources">
          {groups.map(g => {
            const label = g.key === 'other' ? `${an.sourceNames.other} · ${g.detail}` : an.sourceNames[g.key]
            return (
              <li key={g.key + (g.detail ?? '')}>
                <div className="st-row" style={{ justifyContent: 'space-between' }}>
                  <span>{label}</span>
                  <strong>{an.sourceVisits(g.visits)}</strong>
                </div>
                <div className="st-source-bar" aria-hidden="true"><span style={{ width: `${(g.visits / max) * 100}%` }} /></div>
              </li>
            )
          })}
        </ul>
      )}
      <p className="st-help" style={{ marginBottom: 0 }}>{an.sourcesTip}</p>
    </section>
  )
}
