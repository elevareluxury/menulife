import { useEffect, useState } from 'react'
import { useAuthT } from '@/i18n/app/auth'
import { useAppLang } from '@/i18n/app/store'
import { authErrorMessage } from '@/lib/authErrors'
import type { Referral } from '@/lib/referral'
import type { Claim } from '@/lib/claim'
import { oauthProviders, startOAuthSignIn } from '@/modules/auth/lib/googleSignIn'
import { fetchAuthProviders } from '@/lib/authProviders'

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

// Logo de Apple (manzana) en blanco sobre negro, como piden sus pautas para el botón de acceso
function AppleLogo() {
  return (
    <svg width="16" height="18" viewBox="0 0 814 1000" aria-hidden="true" focusable="false">
      <path fill="#fff" d="M788 340c-6 4-108 62-108 190 0 148 130 200 134 202-1 3-21 72-69 142-43 62-88 124-156 124s-86-40-165-40c-77 0-104 41-166 41s-106-57-156-127C45 790 0 663 0 543 0 349 126 247 250 247c66 0 121 43 162 43 39 0 101-46 176-46 29 0 131 3 200 96zM554 158c31-37 53-88 53-140 0-7-1-14-2-20-50 2-110 34-146 76-28 32-55 84-55 136 0 8 1 16 2 18 3 1 9 1 14 1 45 0 101-30 134-71z" />
    </svg>
  )
}

/**
 * La línea "o", "Continuar con Google" y (si está prendido) "Continuar con Apple", debajo del formulario. Google sólo nos da nombre, email y foto: la aceptación
 * de los Términos y la Privacidad la pide Mycen. En el registro (`accepted` = la casilla del formulario) no se va a Google
 * sin tildarla. En el login no se pide: quien ya tiene cuenta entra directo y una cuenta nueva acepta en `/auth/terms`.
 */
export function GoogleButton({ referral = null, claim = null, accepted }: { referral?: Referral | null; claim?: Claim | null; accepted?: boolean }) {
  const t = useAuthT()
  const g = t.google
  const r = t.register
  const signup = accepted !== undefined
  const a = t.apple
  const [loading, setLoading] = useState<'google' | 'apple' | null>(null)
  const [error, setError] = useState('')
  // Primero lo último que respondió Supabase en este dispositivo; después, lo que está configurado hoy
  const [shown, setShown] = useState(() => oauthProviders())
  useEffect(() => {
    let alive = true
    void fetchAuthProviders().then(p => { if (alive && p) setShown(oauthProviders(p)) })
    return () => { alive = false }
  }, [])

  async function handleClick(provider: 'google' | 'apple') {
    setError('')
    if (signup && !accepted) { setError(r.needTerms); return }
    setLoading(provider)
    try {
      // Si sale bien, el navegador se va a Google o Apple; no hace falta apagar "loading"
      await startOAuthSignIn(provider, useAppLang.getState().lang, referral, signup, claim)
    } catch (err: unknown) {
      setError(authErrorMessage(err, t.errors, provider === 'apple' ? a.failed : g.failed))
      setLoading(null)
    }
  }

  const font = 'var(--font-jakarta)'
  if (!shown.google && !shown.apple) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '18px' }}>
      <div aria-hidden="true" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
        <span style={{ fontFamily: font, fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>{g.or}</span>
        <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
      </div>
      {error && (
        <div role="alert" style={{
          padding: '10px 14px', borderRadius: '10px',
          background: 'rgba(244,112,90,0.1)', border: '1px solid rgba(244,112,90,0.3)',
          fontFamily: font, fontSize: '13px', color: '#F4705A', lineHeight: 1.5,
        }}>
          {error}
        </div>
      )}
      {shown.google && (<button
        type="button"
        onClick={() => handleClick('google')}
        disabled={!!loading}
        aria-busy={loading === 'google'}
        style={{
          width: '100%', minHeight: '46px', padding: '11px 16px', borderRadius: '50px',
          border: '1px solid rgba(255,255,255,0.18)', background: '#fff', color: '#1F1F1F',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
          fontFamily: font, fontSize: '14px', fontWeight: 600,
          cursor: loading ? 'progress' : 'pointer', opacity: loading ? 0.75 : 1,
        }}
      >
        <GoogleLogo />
        {loading === 'google' ? g.going : g.continue}
      </button>)}
      {shown.apple && (
        <button
          type="button"
          onClick={() => handleClick('apple')}
          disabled={!!loading}
          aria-busy={loading === 'apple'}
          style={{
            width: '100%', minHeight: '46px', padding: '11px 16px', borderRadius: '50px',
            border: '1px solid rgba(255,255,255,0.28)', background: '#000', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            fontFamily: font, fontSize: '14px', fontWeight: 600,
            cursor: loading ? 'progress' : 'pointer', opacity: loading ? 0.75 : 1,
          }}
        >
          <AppleLogo />
          {loading === 'apple' ? a.going : a.continue}
        </button>
      )}
    </div>
  )
}
