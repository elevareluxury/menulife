import { useState } from 'react'
import { CalendarPlus, Copy, RefreshCw, Power } from 'lucide-react'
import toast from 'react-hot-toast'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useLifeT } from '@/i18n/app/life'
import { LifeCard, LifeConfirmDialog, colors, font, radius } from '../design-system'
import { webOrigin } from '@/lib/platform'

// V1.1 (beta calendarFeed): link privado para suscribirse a las tareas desde Google Calendar o el iPhone.
// El link lo arma api/calendar.ts (/cal/<token>.ics); el token lo crea o cambia la RPC life_calendar_token.

const db = supabase as unknown as SupabaseClient

const label: React.CSSProperties = {
  fontFamily: font, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: colors.text.tertiary, margin: '0 0 10px',
}
const help: React.CSSProperties = { fontFamily: font, fontSize: 12.5, color: colors.text.secondary, margin: '10px 0 0', lineHeight: 1.5 }
const btn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10, minHeight: 48, padding: '10px 14px', borderRadius: radius.md,
  background: colors.surface.high, border: `1px solid ${colors.border.subtle}`, color: colors.text.primary,
  fontFamily: font, fontSize: 14, fontWeight: 600, cursor: 'pointer', textAlign: 'start', textDecoration: 'none',
}

export function CalendarFeedCard() {
  const t = useLifeT()
  const c = t.calendarFeed
  const [token, setToken] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmRotate, setConfirmRotate] = useState(false)

  async function get(rotate: boolean) {
    setBusy(true)
    const { data, error } = await db.rpc('life_calendar_token', { p_rotate: rotate })
    setBusy(false)
    if (error || typeof data !== 'string') { toast.error(c.error); return }
    setToken(data)
    if (rotate) toast.success(c.rotated)
  }

  async function disable() {
    setBusy(true)
    const { error } = await db.rpc('life_calendar_disable')
    setBusy(false)
    if (error) { toast.error(c.error); return }
    setToken(null)
    toast.success(c.disabled)
  }

  const host = new URL(webOrigin()).host
  const https = token ? `${webOrigin()}/cal/${token}.ics` : ''
  const webcal = token ? `webcal://${host}/cal/${token}.ics` : ''

  return (
    <LifeCard>
      <h2 style={label}>{c.title}</h2>
      <p style={{ ...help, marginTop: 0, marginBottom: 12 }}>{c.help}</p>
      {!token ? (
        <button type="button" style={btn} disabled={busy} onClick={() => void get(false)}>
          <CalendarPlus size={16} aria-hidden="true" /> {c.show}
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input readOnly value={https} aria-label={c.title} dir="ltr" onFocus={e => e.currentTarget.select()}
            style={{ ...btn, cursor: 'text', fontSize: 13, fontWeight: 500, color: colors.text.secondary, width: '100%', boxSizing: 'border-box' }} />
          <button type="button" style={btn} onClick={() => {
            void navigator.clipboard?.writeText(https).then(() => toast.success(c.copied), () => toast.error(c.error))
          }}>
            <Copy size={16} aria-hidden="true" /> {c.copy}
          </button>
          <a style={btn} href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`} target="_blank" rel="noopener noreferrer">
            <CalendarPlus size={16} aria-hidden="true" /> {c.google}
          </a>
          <a style={btn} href={webcal}>
            <CalendarPlus size={16} aria-hidden="true" /> {c.apple}
          </a>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" style={{ ...btn, flex: 1 }} disabled={busy} onClick={() => setConfirmRotate(true)}>
              <RefreshCw size={16} aria-hidden="true" /> {c.rotate}
            </button>
            <button type="button" style={{ ...btn, flex: 1, background: 'transparent', color: colors.semantic.error }} disabled={busy} onClick={() => void disable()}>
              <Power size={16} aria-hidden="true" /> {c.disable}
            </button>
          </div>
          <p style={help}>{c.googleNote} {c.privateNote}</p>
        </div>
      )}
      <LifeConfirmDialog open={confirmRotate} title={c.rotateTitle} message={c.rotateText} confirmLabel={c.rotate}
        onConfirm={() => { setConfirmRotate(false); void get(true) }} onCancel={() => setConfirmRotate(false)} />
    </LifeCard>
  )
}
