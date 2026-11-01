import { useMemo, useState } from 'react'
import { LocateFixed, MapPin } from 'lucide-react'
import type { ProfileLang } from '../lib/profileTypes'
import { ui } from '../lib/profileI18n'
import { coordsFromMapsUrl, formatDistance, sortByDistance, type Branch, type Coords } from '../lib/branches'
import { mapLinks } from '../lib/mapLinks'
import './branches.css'

type Status = 'idle' | 'busy' | 'done' | 'fail'

/**
 * Sucursales del módulo Ubicación (chunk propio). "Ver la más cerca" pide la ubicación al navegador recién al tocarlo,
 * ordena en el dispositivo y no la manda a ningún lado. Sólo aparece si al menos dos sucursales tienen coordenadas.
 */
export function Branches({ places, lang, onOpen }: { places: Branch[]; lang: ProfileLang; onOpen: () => void }) {
  const t = ui(lang)
  const [here, setHere] = useState<Coords | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const coords = useMemo(() => new Map(places.map(p => [p, coordsFromMapsUrl(p.maps_url)])), [places])
  const canSort = typeof navigator !== 'undefined' && !!navigator.geolocation && [...coords.values()].filter(Boolean).length >= 2
  const list = here ? sortByDistance(places, p => coords.get(p) ?? null, here) : places.map(place => ({ place, km: null }))

  function locate() {
    setStatus('busy')
    navigator.geolocation.getCurrentPosition(
      pos => { setHere({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setStatus('done') },
      () => setStatus('fail'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    )
  }

  return (
    <div className="mp-branches">
      {canSort && (
        <div className="mp-branches-near">
          <button type="button" className="mp-branches-btn" onClick={locate} disabled={status === 'busy'}>
            <LocateFixed size={17} aria-hidden="true" /> {status === 'busy' ? t.nearestBusy : t.nearest}
          </button>
          <p className="mp-branches-note" role="status">
            {status === 'done' ? t.nearestDone : status === 'fail' ? t.nearestFail : t.nearestPrivate}
          </p>
        </div>
      )}
      <ol className="mp-branches-list">
        {list.map(({ place, km }, i) => {
          const full = [place.address, place.city].filter(Boolean).join(', ')
          const name = place.name || place.address || place.city
          const sub = place.name ? full : place.city && place.address ? place.city : ''
          return (
            <li key={`${name}-${i}`} className={`mp-branch${here && i === 0 && km != null ? ' is-nearest' : ''}`}>
              <div className="mp-branch-head">
                <MapPin size={18} aria-hidden="true" />
                <div className="mp-branch-text">
                  <strong className="mp-branch-name">{name || t.location}</strong>
                  {sub && <span className="mp-branch-sub">{sub}</span>}
                </div>
                {km != null && <span className="mp-branch-km">{formatDistance(km, lang)}</span>}
              </div>
              <span className="mp-maps-apps mp-branch-apps">
                {mapLinks(full, place.maps_url || null).map(a => (
                  <a key={a.key} className="mp-maps-app" href={a.href} target="_blank" rel="noopener noreferrer"
                    aria-label={`${t.howToGet} (${name}): ${a.label}`} onClick={onOpen}>{a.label}</a>
                ))}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
