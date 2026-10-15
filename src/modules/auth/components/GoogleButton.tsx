import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthT } from '@/i18n/app/auth'
import { useAppLang } from '@/i18n/app/store'
import { authErrorMessage } from '@/lib/authErrors'
import type { Referral } from '@/lib/referral'
import { startGoogleSignIn } from '@/modules/auth/lib/googleSignIn'

// Logo de Google con sus colores oficiales (lo piden sus pautas de marca para el botón de acceso)
function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

/** "Continuar con Google", la línea "o" y lo que se acepta al usarlo. */
export function GoogleButton({ referral = null }: { referral?: Referral | null }) {
  const t = useAuthT()
  const g = t.google
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleClick() {
    setError('')
    setLoading(true)
    try {
      // Si sale bien, el navegador se va a Google; no hace falta apagar "loading"
      await startGoogleSignIn(useAppLang.getState().lang, referral)
    } catch (err: unknown) {
      setError(authErrorMessage(err, t.errors, g.failed))
      setLoading(false)
    }
  }

  const font = 'var(--font-jakarta)'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
      {error && (
        <div role="alert" style={{
          padding: '10px 14px', borderRadius: '10px',
          background: 'rgba(244,112,90,0.1)', border: '1px solid rgba(244,112,90,0.3)',
          fontFamily: font, fontSize: '13px', color: '#F4705A', lineHeight: 1.5,
        }}>
          {error}
        </div>
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        aria-busy={loading}
        style={{
          width: '100%', minHeight: '46px', padding: '11px 16px', borderRadius: '50px',
          border: '1px solid rgba(255,255,255,0.18)', background: '#fff', color: '#1F1F1F',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
          fontFamily: font, fontSize: '14px', fontWeight: 600,
          cursor: loading ? 'progress' : 'pointer', opacity: loading ? 0.75 : 1,
        }}
      >
        <GoogleLogo />
        {loading ? g.going : g.continue}
      </button>
      <p style={{ margin: 0, textAlign: 'center', fontFamily: font, fontSize: '12px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>
        {g.accept && <>{g.accept}{' '}</>}
        <Link to="/terminos" target="_blank" style={{ color: '#fff', textDecoration: 'underline' }}>{t.register.terms}</Link> {t.register.and}{' '}
        <Link to="/privacidad" target="_blank" style={{ color: '#fff', textDecoration: 'underline' }}>{t.register.privacy}</Link>{g.acceptEnd}
      </p>
      <div aria-hidden="true" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
        <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
        <span style={{ fontFamily: font, fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>{g.or}</span>
        <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
      </div>
    </div>
  )
}
