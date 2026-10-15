import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { BookLock, FingerprintPattern, LockKeyhole } from 'lucide-react'
import { useLifeT } from '@/i18n/app/life'
import { useAuthStore } from '@/store/authStore'
import { LifeCard, LifeConfirmDialog, colors, font, radius, tint } from '../design-system'
import {
  checkPin, createLock, deviceUnlockAvailable, isValidPin, PIN_MAX, readLock, registerDeviceCredential, remainingWait,
  unlocked, verifyDeviceCredential, writeLock, type JournalLock,
} from '../lib/journalLock'

// Diario privado · desbloqueo (pantalla del Diario y Ajustes) y la tarjeta "Bloquear el diario" de Ajustes.

const fieldStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', minHeight: 48, padding: '10px 14px', borderRadius: radius.md,
  background: colors.surface.high, border: `1px solid ${colors.border.medium}`, color: colors.text.primary,
  fontFamily: font, fontSize: 16, letterSpacing: '0.3em', outline: 'none',
}
const primaryBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, padding: '10px 18px',
  borderRadius: radius.full, border: 'none', background: colors.accent.default, color: colors.accent.on,
  fontFamily: font, fontSize: 15, fontWeight: 700, cursor: 'pointer',
}
const secondaryBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, padding: '10px 18px',
  borderRadius: radius.full, border: `1px solid ${colors.border.medium}`, background: 'transparent', color: colors.text.primary,
  fontFamily: font, fontSize: 14, fontWeight: 600, cursor: 'pointer',
}
const linkBtn: React.CSSProperties = {
  minHeight: 44, padding: '8px 4px', background: 'none', border: 'none', cursor: 'pointer',
  fontFamily: font, fontSize: 13.5, fontWeight: 600, color: colors.accent.ink, textDecoration: 'underline',
}
const help: React.CSSProperties = { fontFamily: font, fontSize: 12.5, color: colors.text.secondary, margin: '10px 0 0', lineHeight: 1.5 }
const label: React.CSSProperties = {
  fontFamily: font, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: colors.text.tertiary, margin: '0 0 10px',
}

/** "30 s" / "2 min" */
function useWaitText() {
  const t = useLifeT().journal
  return (ms: number) => {
    const s = Math.ceil(ms / 1000)
    return s < 60 ? t.seconds(s) : t.minutes(Math.ceil(s / 60))
  }
}

function PinInput({ id, value, onChange, labelText, disabled, autoFocus, invalid, describedBy }: {
  id: string; value: string; onChange: (v: string) => void; labelText: string; disabled?: boolean; autoFocus?: boolean
  invalid?: boolean; describedBy?: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label htmlFor={id} style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: colors.text.secondary }}>{labelText}</label>
      <input id={id} type="password" inputMode="numeric" pattern="[0-9]*" autoComplete="off" maxLength={PIN_MAX}
        value={value} disabled={disabled} autoFocus={autoFocus} aria-invalid={invalid || undefined} aria-describedby={describedBy}
        onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, PIN_MAX))}
        style={{ ...fieldStyle, opacity: disabled ? 0.55 : 1 }} dir="ltr" />
    </div>
  )
}

/**
 * Pide el PIN (o la huella/cara si está guardada). Guarda los errores y la espera en el dispositivo.
 * `onUnlocked` recibe el registro sin errores.
 */
export function PinUnlock({ userId, lock, onUnlocked, onLockChange, submitLabel, prompt, autoDevice = false }: {
  userId: string
  lock: JournalLock
  onUnlocked: (lock: JournalLock) => void
  onLockChange: (lock: JournalLock) => void
  submitLabel: string
  prompt?: string
  autoDevice?: boolean
}) {
  const t = useLifeT().journal
  const waitText = useWaitText()
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const pinId = useId()
  const msgId = useId()
  const wait = remainingWait(lock, now)
  const triedDevice = useRef(false)

  // Cuenta regresiva mientras hay que esperar
  useEffect(() => {
    if (wait <= 0) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [wait])

  const tryDevice = async () => {
    if (!lock.credentialId || busy) return
    setBusy(true)
    const ok = await verifyDeviceCredential(lock.credentialId)
    setBusy(false)
    if (ok) onUnlocked(unlocked(lock))
    else setMessage(t.deviceFailed)
  }

  // Al abrir el diario con la huella guardada, se pide sola una vez
  useEffect(() => {
    if (autoDevice && lock.credentialId && !triedDevice.current && remainingWait(lock, Date.now()) === 0) {
      triedDevice.current = true
      void tryDevice()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDevice, lock.credentialId])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy || !pin) return
    setBusy(true)
    const r = await checkPin(lock, pin, Date.now())
    setBusy(false)
    setNow(Date.now())
    if (r.ok) { setPin(''); setMessage(null); onUnlocked(r.lock); return }
    writeLock(userId, r.lock)
    onLockChange(r.lock)
    setPin('')
    setMessage(r.waitMs > 0 ? null : t.wrongPin)
  }

  const waiting = wait > 0
  return (
    <form onSubmit={e => void submit(e)} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {prompt && <p style={{ ...help, marginTop: 0 }}>{prompt}</p>}
      <PinInput id={pinId} value={pin} onChange={v => { setPin(v); setMessage(null) }} labelText={t.pin}
        disabled={waiting || busy} autoFocus={!autoDevice || !lock.credentialId} invalid={!!message} describedBy={msgId} />
      <div id={msgId} aria-live="polite" style={{ minHeight: 0 }}>
        {waiting ? (
          <p role="alert" style={{ fontFamily: font, fontSize: 13.5, color: colors.semantic.warning, margin: 0 }}>{t.wait(waitText(wait))}</p>
        ) : message ? (
          <p role="alert" style={{ fontFamily: font, fontSize: 13.5, color: colors.semantic.error, margin: 0 }}>{message}</p>
        ) : null}
      </div>
      <button type="submit" disabled={waiting || busy || pin.length < 4} style={{ ...primaryBtn, opacity: waiting || pin.length < 4 ? 0.5 : 1 }}>
        <LockKeyhole size={16} aria-hidden="true" /> {submitLabel}
      </button>
      {lock.credentialId && (
        <button type="button" onClick={() => void tryDevice()} disabled={busy} style={secondaryBtn}>
          <FingerprintPattern size={18} aria-hidden="true" /> {t.unlockDevice}
        </button>
      )}
    </form>
  )
}

/** Pantalla del Diario bloqueado. */
export function JournalLockScreen({ userId, lock, onUnlocked, onLockChange }: {
  userId: string
  lock: JournalLock
  onUnlocked: (lock: JournalLock) => void
  onLockChange: (lock: JournalLock) => void
}) {
  const t = useLifeT().journal
  const navigate = useNavigate()
  const signOut = useAuthStore(s => s.signOut)
  const [forgot, setForgot] = useState(false)

  // Olvidé el PIN: se borra el bloqueo de este dispositivo y se cierra la sesión. Para volver hay que entrar de nuevo
  // (contraseña o Google), que es lo que prueba que es la dueña.
  const resetBySignIn = async () => {
    setForgot(false)
    writeLock(userId, null)
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <LifeCard style={{ padding: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 6, marginBottom: 16 }}>
        <span aria-hidden="true" style={{ width: 52, height: 52, borderRadius: radius.full, background: tint(colors.accent.default, 14), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BookLock size={24} style={{ color: colors.accent.ink }} />
        </span>
        <h2 style={{ fontFamily: font, fontSize: 19, fontWeight: 800, color: colors.text.primary, margin: '6px 0 0' }}>{t.lockedTitle}</h2>
        <p style={{ fontFamily: font, fontSize: 14, color: colors.text.secondary, margin: 0 }}>{t.lockedText}</p>
      </div>
      <PinUnlock userId={userId} lock={lock} onUnlocked={onUnlocked} onLockChange={onLockChange} submitLabel={t.unlock} autoDevice />
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
        <button type="button" onClick={() => setForgot(true)} style={linkBtn}>{t.forgot}</button>
      </div>
      <LifeConfirmDialog open={forgot} title={t.forgotTitle} message={t.forgotText} confirmLabel={t.forgotConfirm}
        onConfirm={() => void resetBySignIn()} onCancel={() => setForgot(false)} />
    </LifeCard>
  )
}

/** Ajustes → "Bloquear el diario" (en este dispositivo). Desactivarlo pide el PIN. */
export function JournalLockCard() {
  const dict = useLifeT()
  const t = dict.journal
  const cancelText = dict.common.cancel
  const user = useAuthStore(s => s.user)
  const userId = user?.id ?? ''
  const [lock, setLock] = useState<JournalLock | null>(() => (userId ? readLock(userId) : null))
  const [mode, setMode] = useState<'idle' | 'enable' | 'disable'>('idle')
  const [pin, setPin] = useState('')
  const [pin2, setPin2] = useState('')
  const [withDevice, setWithDevice] = useState(false)
  const [deviceOk, setDeviceOk] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const pinId = useId()
  const pin2Id = useId()
  const errId = useId()
  const deviceId = useId()

  useEffect(() => { void deviceUnlockAvailable().then(setDeviceOk) }, [])

  if (!userId) return null

  const enable = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    if (!isValidPin(pin)) { setError(t.pinInvalid); return }
    if (pin !== pin2) { setError(t.pinMismatch); return }
    setBusy(true)
    try {
      let credentialId: string | null = null
      if (withDevice && deviceOk) {
        credentialId = await registerDeviceCredential(user?.email ?? 'Mycen')
        if (!credentialId) toast(t.deviceNotSaved)
      }
      const next = await createLock(pin, { credentialId })
      writeLock(userId, next)
      if (!readLock(userId)) { setError(t.noStorage); return }
      setLock(next)
      setMode('idle'); setPin(''); setPin2(''); setError(null)
      toast.success(t.enabled)
    } catch {
      setError(t.noStorage)
    } finally { setBusy(false) }
  }

  const disable = () => {
    writeLock(userId, null)
    setLock(null)
    setMode('idle')
    toast.success(t.disabled)
  }

  return (
    <LifeCard>
      <h2 style={label}>{t.lockTitle}</h2>
      <p style={{ ...help, marginTop: 0, marginBottom: 12 }}>{t.lockHelp}</p>

      {lock ? (
        mode === 'disable' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <PinUnlock userId={userId} lock={lock} prompt={t.disablePrompt} submitLabel={t.disable}
              onUnlocked={disable} onLockChange={setLock} />
            <button type="button" style={secondaryBtn} onClick={() => setMode('idle')}>{cancelText}</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: font, fontSize: 14, fontWeight: 600, color: colors.text.primary, margin: 0 }}>
              <LockKeyhole size={16} aria-hidden="true" style={{ color: colors.semantic.success }} />
              {lock.credentialId ? t.lockOnDevice : t.lockOn}
            </p>
            <p style={{ ...help, marginTop: 0 }}>{t.lockRules}</p>
            <button type="button" style={{ ...secondaryBtn, justifyContent: 'flex-start' }} onClick={() => setMode('disable')}>{t.disable}</button>
          </div>
        )
      ) : mode === 'enable' ? (
        <form onSubmit={e => void enable(e)} style={{ display: 'flex', flexDirection: 'column', gap: 12 }} noValidate>
          <PinInput id={pinId} value={pin} onChange={v => { setPin(v); setError(null) }} labelText={t.newPin} autoFocus invalid={!!error} describedBy={errId} />
          <PinInput id={pin2Id} value={pin2} onChange={v => { setPin2(v); setError(null) }} labelText={t.confirmPin} invalid={!!error} describedBy={errId} />
          {deviceOk && (
            <label htmlFor={deviceId} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 44, fontFamily: font, fontSize: 14, color: colors.text.primary, cursor: 'pointer' }}>
              <input id={deviceId} type="checkbox" checked={withDevice} onChange={e => setWithDevice(e.target.checked)}
                style={{ width: 20, height: 20, accentColor: 'var(--my-accent)' }} />
              {t.useDevice}
            </label>
          )}
          <div id={errId} aria-live="polite">
            {error && <p role="alert" style={{ fontFamily: font, fontSize: 13.5, color: colors.semantic.error, margin: 0 }}>{error}</p>}
          </div>
          <p style={{ ...help, marginTop: 0 }}>{t.lockRules}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" style={{ ...secondaryBtn, flex: 1 }} onClick={() => { setMode('idle'); setPin(''); setPin2(''); setError(null) }}>{cancelText}</button>
            <button type="submit" disabled={busy} style={{ ...primaryBtn, flex: 1 }}>{t.enable}</button>
          </div>
        </form>
      ) : (
        <button type="button" style={{ ...secondaryBtn, justifyContent: 'flex-start', width: '100%' }} onClick={() => setMode('enable')}>
          <LockKeyhole size={16} aria-hidden="true" /> {t.enable}
        </button>
      )}
    </LifeCard>
  )
}
