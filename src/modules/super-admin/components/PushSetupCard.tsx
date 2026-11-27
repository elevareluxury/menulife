import { useState } from 'react'
import { useAdminT, type AdminDict } from '@/i18n/app/admin'
import { useAdminFormat } from '../lib/adminFormat'
import { BTN, CARD, INPUT, MUTED, OK_COLOR, TEXT } from '../lib/adminRpc'
import type { Level } from '../lib/systemStatus'
import { pushChecks, pushLevel, type PushCheck, type PushStatus } from '../lib/pushStatus'
import { cryptoAvailable, generateCronSecret, generateVapidKeys, type VapidKeys } from '../lib/vapid'

// Estado → "Avisos push" (recordatorios de Life OS con la app cerrada): qué falta configurar, según la base
// (admin_push_status) y la clave pública con la que se armó esta versión de la web, y un generador de claves que
// trabaja sólo en el navegador (nada se manda ni se guarda). Guía: docs/lanzamiento/web-push.md.

const BUILD_KEY = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) ?? ''
const GUIDE_URL = 'https://github.com/elevareluxury/menulife/blob/main/docs/lanzamiento/web-push.md'
const COLOR: Record<Level, string> = { ok: OK_COLOR, warn: '#F5B544', bad: '#F87171', unknown: MUTED }

type P = AdminDict['push']
type Num = (v: unknown) => string

function Dot({ level }: { level: Level }) {
  return <span aria-hidden="true" style={{ flexShrink: 0, width: 12, height: 12, marginTop: 4, borderRadius: 999, background: COLOR[level] }} />
}

function line(c: PushCheck, p: P, n: Num): string[] {
  const f = c.facts
  const k = p.checks
  switch (c.id) {
    case 'buildKey': return [k.buildKey[c.state as 'ok' | 'missing' | 'invalid']]
    case 'function':
      if (c.state === 'ok') return [k.function.ok(n(f.min))]
      if (c.state === 'late') return [k.function.late(n(f.min))]
      if (c.state === 'error') return [k.function.error(String(f.msg ?? '—'))]
      return [k.function.never]
    case 'keys': return [k.keys[c.state as 'ok' | 'waiting' | 'missing' | 'invalid' | 'mismatch']]
    case 'cron': return [k.cron[c.state as 'ok' | 'missing' | 'paused' | 'noCron']]
    case 'secret': return [c.state === 'bad' ? k.secret.bad(n(f.n)) : k.secret[c.state as 'ok' | 'unknown']]
    case 'devices':
      return c.state === 'some'
        ? [k.devices.some(n(f.n), n(f.people)), ...(Number(f.failing) > 0 ? [k.devices.failing(n(f.failing))] : [])]
        : [k.devices.none]
    case 'delivered': return [c.state === 'some' ? k.delivered.some(n(f.shown), n(f.opened)) : k.delivered.none]
  }
}

/** `push`: undefined = cargando; null = no se pudo leer (por ejemplo, falta la migración). `now`: hora de la revisión */
export function PushSetupCard({ push, now }: { push: PushStatus | null | undefined; now: number }) {
  const t = useAdminT()
  const p = t.push
  const { number } = useAdminFormat()
  const n: Num = v => (typeof v === 'number' ? number(v) : String(v ?? '—'))
  const checks = pushChecks({ push: push ?? null, buildKey: BUILD_KEY, now })
  const level = push === undefined ? 'unknown' : pushLevel(checks)

  return (
    <section style={CARD} aria-labelledby="push-title" data-testid="push-card" data-level={level}>
      <h2 id="push-title" style={{ margin: '0 0 4px', fontSize: 16, color: TEXT, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Dot level={level} />{p.title}
      </h2>
      <p style={{ margin: '0 0 4px', fontSize: 13, color: MUTED }}>{p.intro}</p>
      <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: COLOR[level] }}>{p.summary[level]}</p>
      {push === null && <p role="alert" style={{ color: COLOR.bad, fontSize: 13.5, margin: '0 0 10px' }}>{p.noMigration}</p>}
      <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {checks.map(c => (
          <li key={c.id} data-testid={`push-check-${c.id}`} data-level={c.level}
            style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <Dot level={c.level} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong style={{ color: TEXT, fontSize: 14 }}>{p.checks[c.id].title}</strong>
              {line(c, p, n).map((txt, i) => (
                <p key={i} style={{ margin: '3px 0 0', fontSize: 13.5, color: MUTED, overflowWrap: 'anywhere' }}>{txt}</p>
              ))}
            </div>
          </li>
        ))}
      </ol>
      <a href={GUIDE_URL} target="_blank" rel="noopener noreferrer"
        style={{ fontSize: 13.5, color: TEXT, textDecoration: 'underline', minHeight: 44, display: 'inline-flex', alignItems: 'center' }}>
        {p.guide}
      </a>
      <KeyGenerator p={p} />
    </section>
  )
}

function KeyGenerator({ p }: { p: P }) {
  const g = p.generator
  const [keys, setKeys] = useState<(VapidKeys & { cron: string }) | null>(null)
  const [failed, setFailed] = useState(false)
  const supported = cryptoAvailable()

  const generate = async () => {
    setFailed(false)
    try {
      const pair = await generateVapidKeys()
      setKeys({ ...pair, cron: generateCronSecret() })
    } catch {
      setFailed(true)
    }
  }

  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
      <h3 style={{ margin: '0 0 4px', fontSize: 15, color: TEXT }}>{g.title}</h3>
      <p style={{ margin: '0 0 10px', fontSize: 13, color: MUTED }}>{g.intro}</p>
      {!supported ? <p role="alert" style={{ color: COLOR.bad, fontSize: 13.5 }}>{g.unsupported}</p> : (
        <button type="button" style={BTN} onClick={() => { void generate() }} data-testid="vapid-generate">
          {keys ? g.again : g.generate}
        </button>
      )}
      {failed && <p role="alert" style={{ color: COLOR.bad, fontSize: 13.5 }}>{g.failed}</p>}
      {keys && (
        <div style={{ display: 'grid', gap: 14, marginTop: 14 }}>
          <KeyField id="vapid-public" label={g.publicLabel} help={g.publicHelp} value={keys.publicKey} g={g} />
          <KeyField id="vapid-private" label={g.privateLabel} help={g.privateHelp} value={keys.privateKey} g={g} secret />
          <KeyField id="cron-secret" label={g.cronLabel} help={g.cronHelp} value={keys.cron} g={g} secret />
          <p style={{ margin: 0, fontSize: 12.5, color: MUTED }}>{g.rotate}</p>
        </div>
      )}
    </div>
  )
}

function KeyField({ id, label, help, value, g, secret = false }: {
  id: string; label: string; help: string; value: string; g: P['generator']; secret?: boolean
}) {
  const [msg, setMsg] = useState<'copied' | 'copyFailed' | null>(null)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setMsg('copied')
    } catch {
      setMsg('copyFailed')
    }
  }
  return (
    <div>
      <label htmlFor={id} style={{ display: 'block', color: TEXT, fontWeight: 600, fontSize: 13.5, marginBottom: 4 }}>{label}</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <input id={id} data-testid={id} readOnly value={value} autoComplete="off" spellCheck={false}
          onFocus={e => e.currentTarget.select()}
          style={{ ...INPUT, flex: '1 1 260px', minWidth: 0, fontFamily: 'ui-monospace, monospace' }} />
        <button type="button" style={BTN} onClick={() => { void copy() }}>{g.copy}</button>
      </div>
      <p style={{ margin: '4px 0 0', fontSize: 12.5, color: secret ? COLOR.warn : MUTED }}>{help}</p>
      <span role="status" style={{ fontSize: 12.5, color: msg === 'copyFailed' ? COLOR.bad : OK_COLOR }}>
        {msg ? g[msg] : ''}
      </span>
    </div>
  )
}
