import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthT } from '@/i18n/app/auth'
import { useAuthStore } from '@/store/authStore'
import { Field, PrimaryAction } from '@/design'
import { isPrivatePath } from './MfaGateLoader'

// Verificación en dos pasos (TOTP, Supabase Auth MFA).
//   · El panel del equipo la exige (AdminMfaGate): la base también, mycen_is_admin() pide una sesión aal2.
//   · Para el resto es opcional (MfaSettingsCard en Studio → Ajustes y Life OS → Ajustes); quien la activó pasa por
//     el código al entrar a las pantallas privadas (MfaGate), no a las públicas.

type Level = 'aal1' | 'aal2' | null
export interface Assurance { current: Level; next: Level }

const CODE_RE = /^\d{6}$/

/** Nivel de la sesión: aal2 = ya pasó el segundo paso. Ante un error, null (no se bloquea a nadie por eso). */
export async function readAssurance(): Promise<Assurance> {
  try {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (error || !data) return { current: null, next: null }
    return { current: data.currentLevel as Level, next: data.nextLevel as Level }
  } catch {
    return { current: null, next: null }
  }
}

async function verifiedTotp(): Promise<string | null> {
  const { data } = await supabase.auth.mfa.listFactors()
  return data?.totp?.[0]?.id ?? null
}

function CodeForm({ busy, error, onSubmit, submit }: {
  busy: boolean; error: string | null; onSubmit: (code: string) => void; submit: string
}) {
  const t = useAuthT().mfa
  const [code, setCode] = useState('')
  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(code.replace(/\s/g, '')) }}
      style={{ display: 'grid', gap: 12 }}>
      <Field label={t.code} value={code} inputMode="numeric" autoComplete="one-time-code" maxLength={7}
        pattern="[0-9 ]*" onChange={e => setCode(e.target.value)} error={error ?? undefined} />
      <PrimaryAction type="submit" disabled={busy || !CODE_RE.test(code.replace(/\s/g, ''))}>
        {busy ? t.verifying : submit}
      </PrimaryAction>
    </form>
  )
}

/** Activar: código QR (y la clave para escribirla a mano) y el primer código de la app */
export function MfaEnroll({ onDone, onCancel }: { onDone: () => void; onCancel?: () => void }) {
  const t = useAuthT().mfa
  const [factor, setFactor] = useState<{ id: string; qr: string; secret: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        // Un intento anterior sin terminar deja un factor sin verificar: se borra antes de empezar otro
        const { data: list } = await supabase.auth.mfa.listFactors()
        for (const f of list?.all ?? []) {
          if (f.factor_type === 'totp' && f.status !== 'verified') await supabase.auth.mfa.unenroll({ factorId: f.id })
        }
        const { data, error: e } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `Mycen ${Date.now()}` })
        if (!alive) return
        if (e || !data) { setError(t.failed); return }
        setFactor({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret })
      } catch {
        if (alive) setError(t.failed)
      }
    })()
    return () => { alive = false }
  }, [t])

  async function verify(code: string) {
    if (!factor) return
    setBusy(true); setError(null)
    const { error: e } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code })
    setBusy(false)
    if (e) { setError(t.wrong); return }
    onDone()
  }

  return (
    <div style={{ display: 'grid', gap: 12 }} data-testid="mfa-enroll">
      {factor ? (
        <>
          <p style={{ margin: 0 }}>{t.scan}</p>
          <img src={factor.qr} alt={t.scan} width={180} height={180}
            style={{ background: 'var(--my-qr-bg)', borderRadius: 'var(--my-r-field)', padding: 8, justifySelf: 'start' }} />
          <p style={{ margin: 0, fontSize: 13 }}>{t.manual}</p>
          <code dir="ltr" style={{ overflowWrap: 'anywhere', fontSize: 14, letterSpacing: '0.08em' }}>{factor.secret}</code>
          <CodeForm busy={busy} error={error} onSubmit={code => void verify(code)} submit={t.verify} />
        </>
      ) : error ? <p role="alert" style={{ margin: 0 }}>{error}</p> : <p role="status" style={{ margin: 0 }}>{t.verifying}</p>}
      {onCancel && <button type="button" className="my-link-button" onClick={onCancel}
        style={{ background: 'none', border: 0, color: 'inherit', textDecoration: 'underline', justifySelf: 'start', minHeight: 44, cursor: 'pointer' }}>
        {t.cancel}</button>}
    </div>
  )
}

/** Entrar: el código de la app (la sesión pasa a aal2) */
export function MfaChallenge({ onDone }: { onDone: () => void }) {
  const t = useAuthT().mfa
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function verify(code: string) {
    setBusy(true); setError(null)
    try {
      const factorId = await verifiedTotp()
      if (!factorId) { setError(t.failed); return }
      const { error: e } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
      if (e) { setError(t.wrong); return }
      onDone()
    } catch {
      setError(t.failed)
    } finally {
      setBusy(false)
    }
  }

  return <CodeForm busy={busy} error={error} onSubmit={code => void verify(code)} submit={t.verify} />
}

/** Pantalla entera (fuera de Studio y Life OS): cielo de Universo, una tarjeta en el medio */
function FullScreen({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  const t = useAuthT().mfa
  return (
    <main data-mycen-theme="universo" className="my-sky my-tap-root"
      style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16, color: 'var(--my-text)' }}>
      <section aria-labelledby="mfa-title" style={{
        width: '100%', maxWidth: 420, display: 'grid', gap: 14, padding: '28px 24px', borderRadius: 'var(--my-r-card)',
        background: 'var(--my-glass-solid)', border: '1px solid var(--my-border)',
      }}>
        <h1 id="mfa-title" style={{ margin: 0, fontSize: 22 }}>{title}</h1>
        <p style={{ margin: 0, color: 'var(--my-muted)' }}>{intro}</p>
        {children}
        <p style={{ margin: 0, fontSize: 13, color: 'var(--my-muted)' }}>{t.lost}</p>
        <button type="button" onClick={() => { void supabase.auth.signOut().then(() => window.location.assign('/login')) }}
          style={{ background: 'none', border: 0, color: 'inherit', textDecoration: 'underline', justifySelf: 'start', minHeight: 44, cursor: 'pointer' }}>
          {t.signOut}</button>
      </section>
    </main>
  )
}

/** El panel del equipo: sin el segundo paso, primero activarlo o escribir el código */
export function AdminMfaGate({ children }: { children: ReactNode }) {
  const t = useAuthT().mfa
  const [state, setState] = useState<'loading' | 'ok' | 'challenge' | 'enroll'>('loading')

  const check = useCallback(async () => {
    const a = await readAssurance()
    if (a.current === 'aal2') { setState('ok'); return }
    setState(a.next === 'aal2' || await verifiedTotp().catch(() => null) ? 'challenge' : 'enroll')
  }, [])

  useEffect(() => { void check() }, [check])

  if (state === 'ok') return <>{children}</>
  if (state === 'loading') return <main data-mycen-theme="universo" className="my-sky" style={{ minHeight: '100vh' }} aria-busy="true" />
  return (
    <FullScreen title={state === 'enroll' ? t.adminTitle : t.challengeTitle} intro={state === 'enroll' ? t.adminIntro : t.challengeIntro}>
      {state === 'enroll' ? <MfaEnroll onDone={() => void check()} /> : <MfaChallenge onDone={() => void check()} />}
    </FullScreen>
  )
}

/** Toda la app: con un factor activado y la sesión en aal1, el código antes de Studio o Life OS */
export function MfaGate() {
  const user = useAuthStore(s => s.user)
  const { pathname } = useLocation()
  const [needs, setNeeds] = useState(false)
  const t = useAuthT().mfa
  const isPrivate = isPrivatePath(pathname)

  useEffect(() => {
    let alive = true
    if (!user || !isPrivate) { setNeeds(false); return }
    void readAssurance().then(a => { if (alive) setNeeds(a.current === 'aal1' && a.next === 'aal2') })
    return () => { alive = false }
  }, [user, isPrivate])

  if (!needs || !isPrivate) return null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, overflow: 'auto' }}>
      <FullScreen title={t.challengeTitle} intro={t.challengeIntro}>
        <MfaChallenge onDone={() => setNeeds(false)} />
      </FullScreen>
    </div>
  )
}

/** Ajustes (Studio y Life OS): activar o desactivar la verificación en dos pasos */
export function MfaSettingsCard() {
  const t = useAuthT().mfa
  const [factorId, setFactorId] = useState<string | null | undefined>(undefined)
  const [enrolling, setEnrolling] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try { setFactorId(await verifiedTotp()) } catch { setFactorId(null) }
  }, [])
  useEffect(() => { void load() }, [load])

  async function disable() {
    if (!factorId) return
    setBusy(true); setMessage(null)
    const { error } = await supabase.auth.mfa.unenroll({ factorId })
    setBusy(false)
    if (error) { setMessage(t.needsRecent); return }
    setMessage(t.disabledDone)
    void load()
  }

  if (factorId === undefined) return null
  return (
    <section aria-labelledby="mfa-settings-title" data-testid="mfa-settings" style={{ display: 'grid', gap: 10 }}>
      <h2 id="mfa-settings-title" style={{ margin: 0, fontSize: 16 }}>
        {t.title} · <span style={{ fontWeight: 600 }}>{factorId ? t.on : t.off}</span>
      </h2>
      <p style={{ margin: 0, fontSize: 14, color: 'var(--my-muted)' }}>{t.intro}</p>
      {enrolling ? (
        <MfaEnroll onCancel={() => setEnrolling(false)}
          onDone={() => { setEnrolling(false); setMessage(t.enabledDone); void load() }} />
      ) : factorId ? (
        <PrimaryAction onClick={() => void disable()} disabled={busy}>{t.disable}</PrimaryAction>
      ) : (
        <PrimaryAction onClick={() => { setMessage(null); setEnrolling(true) }}>{t.enable}</PrimaryAction>
      )}
      <p role="status" style={{ margin: 0, fontSize: 13 }}>{message ?? ''}</p>
    </section>
  )
}
