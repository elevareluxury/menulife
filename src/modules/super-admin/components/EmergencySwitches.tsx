import { useState } from 'react'
import { useAdminT } from '@/i18n/app/admin'
import { readSiteFlags, setSiteFlagsLocal, useSiteFlags, type SiteFlags } from '@/lib/siteFlags'
import { adminRpc, BTN, CARD, MUTED, OK_COLOR, TEXT } from '../lib/adminRpc'

// Interruptores de emergencia (Estado del sistema): si hay spam o un ataque, el equipo pausa una parte en un clic. La
// base la frena de verdad (mycen_pre_request → 503 FEATURE_PAUSED; registros con un trigger en auth.users); cada
// cambio queda en la actividad del equipo. Pausar pide confirmación; reanudar, no.

const KEYS = ['signups', 'messages', 'subscriptions', 'polls'] as const
type Key = typeof KEYS[number]
const PAUSED = '#F5B544'

export function EmergencySwitches() {
  const e = useAdminT().status.emergency
  const flags = useSiteFlags()
  const [busy, setBusy] = useState<Key | null>(null)
  const [failed, setFailed] = useState(false)

  async function toggle(key: Key) {
    const next = !flags[key]
    if (!next && !window.confirm(e.confirm(e[key]))) return
    setBusy(key)
    setFailed(false)
    const { data, error } = await adminRpc('admin_set_site_flag', { p_key: key, p_enabled: next })
    setBusy(null)
    if (error || !data) setFailed(true)
    else setSiteFlagsLocal(readSiteFlags(data as Partial<SiteFlags>))
  }

  return (
    <section style={CARD} aria-labelledby="emergency-title" data-testid="emergency-switches">
      <h2 id="emergency-title" style={{ margin: '0 0 4px', fontSize: 16, color: TEXT }}>{e.title}</h2>
      <p style={{ margin: '0 0 12px', fontSize: 13.5, color: MUTED }}>{e.intro}</p>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {KEYS.map(key => {
          const on = flags[key]
          return (
            <li key={key} data-testid={`switch-${key}`} data-on={on}
              style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px 12px', minHeight: 44 }}>
              <span style={{ flex: '1 1 180px', minWidth: 0, color: TEXT, fontSize: 14.5, fontWeight: 600 }}>{e[key]}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: on ? OK_COLOR : PAUSED }}>{on ? e.on : e.off}</span>
              <button type="button" style={BTN} disabled={busy !== null} aria-busy={busy === key}
                aria-label={`${on ? e.turnOff : e.turnOn}: ${e[key]}`} onClick={() => void toggle(key)}>
                {on ? e.turnOff : e.turnOn}
              </button>
            </li>
          )
        })}
      </ul>
      {failed && <p role="alert" style={{ margin: '10px 0 0', fontSize: 13.5, color: '#F87171' }}>{e.failed}</p>}
    </section>
  )
}
