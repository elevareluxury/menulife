import { useState, useRef, useEffect } from 'react'
import { Mail, ArrowLeft, Shield } from 'lucide-react'
import type { usePortalAuth } from '../hooks/usePortalAuth'

type AuthHook = ReturnType<typeof usePortalAuth>

// ─── OTP Input ────────────────────────────────────────────────────────────────
function OTPInput({ onComplete }: { onComplete: (code: string) => void }) {
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const refs = useRef<(HTMLInputElement | null)[]>([])

  const focus = (i: number) => setTimeout(() => refs.current[i]?.focus(), 0)

  const handleChange = (i: number, val: string) => {
    const char = val.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[i] = char
    setDigits(next)
    if (char) {
      if (i < 5) focus(i + 1)
      if (!next.includes('')) onComplete(next.join(''))
    }
  }

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      const next = [...digits]
      if (digits[i]) { next[i] = ''; setDigits(next) }
      else if (i > 0) { next[i - 1] = ''; setDigits(next); focus(i - 1) }
    } else if (e.key === 'ArrowLeft'  && i > 0) focus(i - 1)
    else if (e.key === 'ArrowRight' && i < 5) focus(i + 1)
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    const next = pasted.split('').concat(Array(6).fill('')).slice(0, 6)
    setDigits(next)
    const lastFilled = Math.min(pasted.length, 5)
    focus(lastFilled)
    if (pasted.length === 6) onComplete(pasted)
  }

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onFocus={e => e.target.select()}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          style={{
            width: 48, height: 56, fontSize: 24, fontWeight: 700,
            textAlign: 'center', background: '#13161C',
            border: `1.5px solid ${d ? '#F4705A' : 'rgba(255,255,255,0.12)'}`,
            borderRadius: 12, color: '#fff', outline: 'none',
            transition: 'border-color 0.15s',
          }}
        />
      ))}
    </div>
  )
}

// ─── Login ────────────────────────────────────────────────────────────────────
interface Props {
  restaurantId: string
  auth:         AuthHook
}

export function PortalLogin({ auth }: Props) {
  const [step,      setStep]      = useState<'email' | 'otp'>('email')
  const [email,     setEmail]     = useState('')
  const [devCode,   setDevCode]   = useState<string | null>(null)
  const [otpError,  setOtpError]  = useState<string | null>(null)
  const emailRef = useRef<HTMLInputElement>(null)

  useEffect(() => { emailRef.current?.focus() }, [])

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    const result = await auth.requestMagicLink(email)
    if (result.success) {
      setDevCode(result.devCode ?? null)
      setStep('otp')
    }
  }

  const handleOTPComplete = async (code: string) => {
    setOtpError(null)
    const result = await auth.verifyCode(email, code)
    if (!result.success) {
      setOtpError(result.error ?? 'Código incorrecto')
    }
  }

  const handleResend = async () => {
    setOtpError(null)
    setDevCode(null)
    const result = await auth.requestMagicLink(email)
    if (result.success) setDevCode(result.devCode ?? null)
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 py-10"
      style={{ background: '#0F1115' }}
    >
      <div className="w-full" style={{ maxWidth: 390 }}>

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(244,112,90,0.12)', border: '1px solid rgba(244,112,90,0.2)' }}
          >
            <Shield className="w-7 h-7" style={{ color: '#F4705A' }} />
          </div>
        </div>

        {step === 'email' ? (
          <form onSubmit={handleEmailSubmit}>
            <h1 className="text-2xl font-bold text-white text-center mb-1">
              Accedé a tu portal
            </h1>
            <p className="text-sm text-center mb-8" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Ingresá tu email para continuar
            </p>

            <div className="mb-4">
              <div
                className="flex items-center gap-3 rounded-2xl px-4"
                style={{
                  background: '#13161C',
                  border: '1px solid rgba(255,255,255,0.1)',
                  height: 56,
                }}
              >
                <Mail className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }} />
                <input
                  ref={emailRef}
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); auth.clearError() }}
                  placeholder="tu@email.com"
                  className="flex-1 bg-transparent outline-none text-white text-sm"
                  style={{ caretColor: '#F4705A' }}
                />
              </div>
              {auth.authError && (
                <p className="text-xs mt-2 px-1" style={{ color: '#EF4444' }}>{auth.authError}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={!email.trim() || auth.loading}
              className="w-full h-14 rounded-2xl text-sm font-bold text-white transition-opacity"
              style={{
                background: '#F4705A',
                opacity: !email.trim() || auth.loading ? 0.5 : 1,
              }}
            >
              {auth.loading ? 'Enviando…' : 'Continuar'}
            </button>
          </form>

        ) : (
          <div>
            <button
              onClick={() => { setStep('email'); auth.clearError(); setOtpError(null) }}
              className="flex items-center gap-2 mb-6 text-sm"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              <ArrowLeft className="w-4 h-4" />
              Volver
            </button>

            <h1 className="text-2xl font-bold text-white text-center mb-1">
              Verificá tu identidad
            </h1>
            <p className="text-sm text-center mb-8" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Ingresá el código de 6 dígitos
            </p>

            {/* DEV banner */}
            {devCode && (
              <div
                className="rounded-xl px-4 py-3 mb-6 flex items-center gap-3"
                style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#F59E0B' }}>
                  Dev
                </span>
                <span className="text-sm font-bold" style={{ color: '#F59E0B' }}>
                  {devCode}
                </span>
                <span className="text-xs ml-auto" style={{ color: 'rgba(245,158,11,0.6)' }}>
                  Remover en V2
                </span>
              </div>
            )}

            <div className="mb-6">
              <OTPInput onComplete={handleOTPComplete} />
              {(otpError || auth.authError) && (
                <p className="text-xs text-center mt-3" style={{ color: '#EF4444' }}>
                  {otpError ?? auth.authError}
                </p>
              )}
            </div>

            {auth.loading && (
              <div className="flex justify-center mb-4">
                <div
                  className="w-5 h-5 border-2 rounded-full animate-spin"
                  style={{ borderColor: 'rgba(255,255,255,0.08)', borderTopColor: '#F4705A' }}
                />
              </div>
            )}

            <p className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
              ¿No recibiste el código?{' '}
              <button
                onClick={handleResend}
                disabled={auth.loading}
                className="font-semibold underline"
                style={{ color: 'rgba(255,255,255,0.6)' }}
              >
                Reenviar
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
