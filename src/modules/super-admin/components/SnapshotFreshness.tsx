import { useCallback, useEffect, useState } from 'react'
import { useAdminT } from '@/i18n/app/admin'
import { adminRpc, BTN, MUTED, WARN_COLOR } from '../lib/adminRpc'
import { freshnessOf, type SnapshotInfo, type SnapshotKey } from '../lib/snapshots'

// "Actualizado hace N min" y "Actualizar ahora" para las pantallas que leen fotos calculadas cada hora
// (20261207000001, docs/lanzamiento/panel-escala.md). Muestra la foto más vieja de las que usa la pantalla.

export function SnapshotFreshness({ keys, onRefreshed }: { keys: readonly SnapshotKey[]; onRefreshed: () => void }) {
  const t = useAdminT().snapshot
  const [info, setInfo] = useState<SnapshotInfo[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const keyId = keys.map(k => `${k.name}:${k.days}`).join(',')

  const load = useCallback(() => {
    void Promise.resolve(adminRpc('admin_snapshot_info')).then(({ data, error }) => {
      if (!error && Array.isArray(data)) { setInfo(data as SnapshotInfo[]); setNow(Date.now()) }
    })
  }, [])
  useEffect(load, [load, keyId])

  const refresh = async () => {
    setBusy(true); setFailed(false)
    let ok = true
    // Una por vez: cada una calcula en vivo con el tope de la sesión
    for (const k of keys) {
      const { error } = await adminRpc('admin_refresh_snapshot', { p_name: k.name, p_days: k.days })
      if (error) ok = false
    }
    setBusy(false)
    setFailed(!ok)
    load()
    onRefreshed()
  }

  const f = info ? freshnessOf(info, keys, now) : null
  const label = !f ? null
    : f.minutes === null ? t.live
      : f.minutes < 1 ? t.justNow
        : f.minutes < 90 ? t.minutes(f.minutes)
          : t.hours(Math.round(f.minutes / 60))

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', margin: '0 0 14px', fontSize: 13, color: MUTED }}>
      {label && <span role="status" data-testid="snapshot-freshness">{label}</span>}
      <button type="button" onClick={() => { void refresh() }} disabled={busy}
        style={{ ...BTN, padding: '6px 12px', fontSize: 13, opacity: busy ? 0.6 : 1 }}>
        {busy ? t.refreshing : t.refresh}
      </button>
      {failed && <span role="alert" style={{ color: WARN_COLOR }}>{t.refreshFailed}</span>}
      {!failed && f?.error && <span style={{ color: WARN_COLOR }}>{t.lastError}</span>}
    </div>
  )
}
