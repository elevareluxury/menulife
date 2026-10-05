import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Mail } from 'lucide-react'
import { LanguageSelect } from '@/components/ui/LanguageSelect'
import { useAuthT } from '@/i18n/app/auth'
import { useLangDir } from '@/i18n/app/useLangDir'

const S = {
  page: {
    minHeight: '100vh',
    background: '#0F1115',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
  } as React.CSSProperties,
  card: {
    position: 'relative',
    background: '#171A21',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '16px',
    padding: '2.5rem',
    width: '100%',
    maxWidth: '420px',
  } as React.CSSProperties,
  logo: {
    textAlign: 'center' as const,
    marginBottom: '2rem',
  },
  logoText: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#F5F7FA',
    letterSpacing: '-0.03em',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#F5F7FA',
    marginBottom: '0.5rem',
  },
  subtitle: {
    fontSize: '0.875rem',
    color: '#98A2B3',
    lineHeight: 1.6,
    marginBottom: '1.75rem',
  },
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#98A2B3',
    marginBottom: '0.375rem',
  },
  input: {
    width: '100%',
    background: '#1E2330',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    padding: '11px 14px',
    color: '#F5F7FA',
    fontSize: '0.9375rem',
    outline: 'none',
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.15s',
  } as React.CSSProperties,
  inputError: {
    borderColor: '#FF6B7A',
  },
  errorMsg: {
    marginTop: '0.375rem',
    fontSize: '0.8125rem',
    color: '#FF6B7A',
  },
  btn: {
    marginTop: '1.25rem',
    width: '100%',
    background: 'linear-gradient(135deg, #FF6B7A 0%, #FF4757 100%)',
    border: 'none',
    borderRadius: '10px',
    padding: '13px',
    color: '#fff',
    fontSize: '0.9375rem',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    opacity: 1,
    transition: 'opacity 0.15s',
  } as React.CSSProperties,
  btnDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  backLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginTop: '1.25rem',
    fontSize: '0.875rem',
    color: '#98A2B3',
    textDecoration: 'none',
  } as React.CSSProperties,
}

export function ForgotPassword() {
  const t = useAuthT()
  const f = t.forgot
  useLangDir()
  const location = useLocation()
  const [email, setEmail]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [error, setError]         = useState('')
  // ?error=expired | invalid (códigos que manda AuthCallback; cualquier otro valor se trata como inválido)
  const urlErrorCode = new URLSearchParams(location.search).get('error')
  const urlError = !urlErrorCode ? '' : urlErrorCode === 'expired' ? f.expired : f.invalid

  const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidEmail(email)) {
      setError(f.invalidEmail)
      return
    }
    setError('')
    setLoading(true)
    try {
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      })
      // Siempre mostramos éxito aunque el email no exista (no revela qué emails tienen cuenta)
      void authError
      setEmailSent(true)
    } catch {
      // Mostrar éxito de todas formas
      setEmailSent(true)
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setLoading(true)
    try {
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      })
    } finally {
      setLoading(false)
    }
  }

  // ── Estado post-envío ──────────────────────────────────────────────────────
  if (emailSent) {
    return (
      <div style={S.page}>
        <div style={S.card}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📧</div>
            <h1 style={{ ...S.title, textAlign: 'center' }}>{f.sentTitle}</h1>
          </div>

          <p style={{ ...S.subtitle, textAlign: 'center' }}>
            {f.sentTo}{' '}
            <span style={{ color: '#F5F7FA', fontWeight: 500 }}>{email}</span>
            <br />{f.expires}
          </p>

          <p style={{ ...S.subtitle, textAlign: 'center', marginBottom: '0.75rem' }}>
            {f.notArrived}
          </p>

          <button
            onClick={handleResend}
            disabled={loading}
            style={{
              ...S.btn,
              marginTop: 0,
              ...(loading ? S.btnDisabled : {}),
            }}
          >
            {loading && <Spinner />}
            {f.resend}
          </button>

          <Link to="/login" style={S.backLink}>
            <ArrowLeft size={15} />
            {t.common.backToLogin}
          </Link>
        </div>
      </div>
    )
  }

  // ── Formulario ─────────────────────────────────────────────────────────────
  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={{ position: 'absolute', top: '16px', insetInlineEnd: '16px' }}>
          <LanguageSelect label={t.common.language} />
        </div>
        <div style={S.logo}>
          <img src="/logo.png" alt="Mycen" style={{ height: '32px', width: 'auto' }} />
        </div>

        <h1 style={S.title}>{f.title}</h1>

        {urlError && (
          <div role="alert" style={{
            background: 'rgba(255,107,122,0.1)',
            border: '1px solid rgba(255,107,122,0.3)',
            borderRadius: '10px',
            padding: '12px 14px',
            marginBottom: '1.25rem',
            color: '#FF6B7A',
            fontSize: '0.875rem',
            lineHeight: 1.5,
          }}>
            {urlError}
          </div>
        )}

        <p style={S.subtitle}>
          {f.intro}
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <div>
            <label style={S.label} htmlFor="fp-email">
              {t.common.email}
            </label>
            <input
              id="fp-email"
              type="email"
              autoComplete="email"
              placeholder={t.common.emailPlaceholder}
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError('') }}
              required
              style={{ ...S.input, ...(error ? S.inputError : {}) }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#FF6B7A' }}
              onBlur={(e)  => { e.currentTarget.style.borderColor = error ? '#FF6B7A' : 'rgba(255,255,255,0.1)' }}
            />
            {error && <p role="alert" style={S.errorMsg}>{error}</p>}
          </div>

          <button
            type="submit"
            disabled={loading || !email}
            style={{
              ...S.btn,
              ...(loading || !email ? S.btnDisabled : {}),
            }}
          >
            {loading && <Spinner />}
            <Mail size={16} />
            {f.submit}
          </button>
        </form>

        <Link to="/login" style={S.backLink}>
          <ArrowLeft size={15} />
          {t.common.backToLogin}
        </Link>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <svg
      style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}
