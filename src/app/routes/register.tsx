import { useEffect, useId, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { authErrorMessage } from '@/lib/authErrors'
import { LanguageSelect } from '@/components/ui/LanguageSelect'
import { useAuthT } from '@/i18n/app/auth'
import { useAppLang } from '@/i18n/app/store'
import { useLangDir } from '@/i18n/app/useLangDir'
import { parseReferral } from '@/lib/referral'
import { trackOncePerSession } from '@/lib/productEvents'

const CORAL = '#F4705A'

const BASE_INPUT: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: '10px',
  background: 'rgba(255,255,255,0.06)',
  color: '#fff',
  fontSize: '14px',
  fontFamily: 'var(--font-jakarta)',
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
  boxSizing: 'border-box',
}

function DarkInput({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false)
  const id = useId()
  return (
    <div>
      <label htmlFor={id} style={{
        display: 'block', fontFamily: 'var(--font-jakarta)', fontSize: '11px',
        fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: '6px',
        letterSpacing: '0.06em', textTransform: 'uppercase',
      }}>
        {label}
      </label>
      <input
        id={id}
        {...props}
        onFocus={e => { setFocused(true); props.onFocus?.(e) }}
        onBlur={e => { setFocused(false); props.onBlur?.(e) }}
        style={{
          ...BASE_INPUT,
          border: `1px solid ${focused ? CORAL : 'rgba(255,255,255,0.1)'}`,
          boxShadow: focused ? `0 0 0 3px rgba(244,112,90,0.12)` : 'none',
        }}
      />
    </div>
  )
}

export function RegisterPage() {
  const t = useAuthT()
  const r = t.register
  useLangDir()
  const navigate = useNavigate()
  // Llegó desde el pie de un perfil ("Creá tu identidad"): se guarda con la cuenta y se atribuye en el onboarding
  const [referral] = useState(() => parseReferral(window.location.search))
  // Métricas (etapa 14): alguien abrió el registro (una vez por sesión del navegador)
  useEffect(() => { trackOncePerSession('signup_started', 'signup_started', { ref: referral?.ref }) }, [referral])
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [accepted, setAccepted] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim()) { setError(r.needName); return }
    if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      setError(r.weakPassword)
      return
    }
    if (!accepted) { setError(r.needTerms); return }

    setLoading(true)
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // locale: el idioma de los mails de Supabase (plantillas en supabase/templates)
          data: {
            name: name.trim(), terms_accepted_at: new Date().toISOString(), locale: useAppLang.getState().lang,
            ...(referral ? { ref: referral.ref, ref_purpose: referral.purpose } : {}),
          },
          emailRedirectTo: window.location.origin + '/auth/callback',
        },
      })
      if (authError) throw authError
      if (!authData.user) throw new Error('signup without user')

      // Email confirmation required — no session yet
      if (!authData.session) {
        toast.success(r.checkEmail)
        navigate('/login')
        return
      }

      toast.success(r.welcome)
      // Onboarding guiado: Studio lo muestra a quien todavía no tiene identidad
      navigate('/studio')
    } catch (err: unknown) {
      setError(authErrorMessage(err, t.errors, r.failed))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0F1115',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', position: 'relative', overflow: 'hidden',
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'fixed', bottom: '-180px', left: '50%', transform: 'translateX(-50%)',
        width: '700px', height: '360px', borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(244,112,90,0.11) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      <div style={{
        width: '100%', maxWidth: '420px',
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '24px', padding: '40px 36px',
        backdropFilter: 'blur(20px)',
        position: 'relative', zIndex: 1,
        animation: 'ml-fade-up 0.45s ease-out both',
      }}>
        <div style={{ position: 'absolute', top: '16px', insetInlineEnd: '16px' }}>
          <LanguageSelect label={t.common.language} />
        </div>

        {/* Logo + title */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none', marginBottom: '16px' }}>
            <img src="/logo.png" alt="Mycen" className="h-8 w-auto" />
          </Link>
          <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '14px', color: 'rgba(255,255,255,0.7)', margin: 0 }}>
            {r.subtitle}
          </p>
        </div>

        {error && (
          <div role="alert" style={{
            padding: '10px 14px', borderRadius: '10px',
            background: 'rgba(244,112,90,0.1)', border: '1px solid rgba(244,112,90,0.3)',
            fontFamily: 'var(--font-jakarta)', fontSize: '13px', color: CORAL,
            lineHeight: 1.5, marginBottom: '16px',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <DarkInput
            label={r.name}
            type="text"
            placeholder={r.namePlaceholder}
            value={name}
            onChange={e => setName(e.target.value)}
            required
            autoComplete="name"
          />

          <DarkInput
            label={t.common.email}
            type="email"
            placeholder={t.common.emailPlaceholder}
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <DarkInput
            label={t.common.password}
            type="password"
            placeholder={r.passwordPlaceholder}
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />

          <label style={{
            display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer',
            fontFamily: 'var(--font-jakarta)', fontSize: '13px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.5,
          }}>
            <input type="checkbox" checked={accepted} onChange={e => { setAccepted(e.target.checked); setError('') }} required
              style={{ marginTop: '3px', width: 16, height: 16, accentColor: CORAL, flexShrink: 0 }} />
            <span>
              {r.accept && <>{r.accept}{' '}</>}
              <Link to="/terminos" target="_blank" style={{ color: '#fff' }}>{r.terms}</Link> {r.and}{' '}
              <Link to="/privacidad" target="_blank" style={{ color: '#fff' }}>{r.privacy}</Link>{r.acceptEnd}
            </span>
          </label>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '4px',
              width: '100%', padding: '13px',
              borderRadius: '50px', border: 'none',
              background: loading ? 'rgba(200,68,47,0.6)' : '#C8442F', // coral oscuro: texto blanco a 4.8:1 (WCAG AA)
              color: '#fff', fontSize: '14px', fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-jakarta)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { if (!loading) { e.currentTarget.style.boxShadow = '0 0 24px rgba(244,112,90,0.45)'; e.currentTarget.style.transform = 'scale(1.01)' } }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = '' }}
          >
            {loading ? r.submitting : r.submit}
          </button>
        </form>

        <p style={{ marginTop: '24px', textAlign: 'center', fontFamily: 'var(--font-jakarta)', fontSize: '13px', color: 'rgba(255,255,255,0.65)' }}>
          {r.haveAccount}{' '}
          <Link to="/login" style={{ color: CORAL, fontWeight: 600, textDecoration: 'none' }}>
            {r.login}
          </Link>
        </p>
      </div>
    </div>
  )
}
