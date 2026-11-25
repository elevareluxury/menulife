import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { signOutDevice } from '@/lib/signOutDevice'
import { useAuthStore } from '@/store/authStore'
import { useAuthT } from '@/i18n/app/auth'
import { useAppLang } from '@/i18n/app/store'
import { useLangDir } from '@/i18n/app/useLangDir'
import { authErrorMessage } from '@/lib/authErrors'
import { needsTerms, needsTermsOnly } from '@/modules/auth/lib/googleSignIn'
import { crossBorderConsent, crossBorderMissing, withCountry } from '@/lib/crossBorder'
import { CrossBorderField } from '@/modules/auth/components/CrossBorderField'
import { postLoginRoute } from '@/modules/auth/lib/postLoginRoute'
import { AuthBrand } from '@/components/ui/AuthBrand'

const CORAL = '#F4705A'

/** "Un paso más": una cuenta creada con Google desde el login acepta Términos y Privacidad una sola vez, y una cuenta de
 *  Corea del Sur o China da el permiso aparte para guardar sus datos fuera del país. Se pide sólo lo que falta. */
export function AcceptTerms() {
  const t = useAuthT()
  const r = t.register
  const g = t.termsGate
  useLangDir()
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const initialized = useAuthStore(s => s.initialized)
  const [accepted, setAccepted] = useState(false)
  const [xAccepted, setXAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (initialized && !user) return <Navigate to="/login" replace />
  if (user && !needsTerms(user) && !loading) return <Navigate to="/life" replace />
  const askTerms = needsTermsOnly(user)
  const xRegion = crossBorderMissing(user?.user_metadata)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (askTerms && !accepted) { setError(r.needTerms); return }
    if (xRegion && !xAccepted) { setError(withCountry(t.xborder.need, xRegion, t.xborder)); return }
    setLoading(true)
    try {
      const meta = user?.user_metadata ?? {}
      const { data, error: err } = await supabase.auth.updateUser({ data: {
        ...(askTerms ? { terms_accepted_at: new Date().toISOString() } : {}),
        ...(xRegion ? crossBorderConsent(xRegion) : {}),
        ...(meta.locale ? {} : { locale: useAppLang.getState().lang }),
      } })
      if (err) throw err
      navigate(await postLoginRoute(data.user.id), { replace: true })
    } catch (err: unknown) {
      setError(authErrorMessage(err, t.errors, r.failed))
      setLoading(false)
    }
  }

  async function handleCancel() {
    if (!(await signOutDevice(supabase))) { window.location.replace('/login'); return }
    navigate('/login', { replace: true })
  }

  const font = 'var(--font-jakarta)'
  return (
    <div className="my-tap-root" style={{ minHeight: '100vh', background: '#0F1115', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <main style={{
        width: '100%', maxWidth: '420px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '24px', padding: '40px 36px',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <AuthBrand />
          <h1 style={{ fontFamily: font, fontSize: '20px', fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>{g.title}</h1>
          <p style={{ fontFamily: font, fontSize: '14px', color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.5 }}>
            {askTerms || !xRegion ? g.intro : withCountry(t.xborder.gateIntro, xRegion, t.xborder)}
          </p>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {askTerms && <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer', fontFamily: font, fontSize: '13px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>
            <input type="checkbox" checked={accepted} onChange={e => { setAccepted(e.target.checked); setError('') }}
              style={{ marginTop: '3px', width: 16, height: 16, accentColor: CORAL, flexShrink: 0 }} />
            <span>
              {r.accept && <>{r.accept}{' '}</>}
              <Link to="/terminos" target="_blank" style={{ color: '#fff', textDecoration: 'underline' }}>{r.terms}</Link> {r.and}{' '}
              <Link to="/privacidad" target="_blank" style={{ color: '#fff', textDecoration: 'underline' }}>{r.privacy}</Link>{r.acceptEnd}
            </span>
          </label>}
          {xRegion && <CrossBorderField region={xRegion} t={t.xborder} checked={xAccepted} onChange={v => { setXAccepted(v); setError('') }} />}
          {error && (
            <div role="alert" style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(244,112,90,0.1)', border: '1px solid rgba(244,112,90,0.3)', fontFamily: font, fontSize: '13px', color: CORAL, lineHeight: 1.5 }}>
              {error}
            </div>
          )}
          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '13px', borderRadius: '50px', border: 'none', background: '#C8442F', // texto blanco a 4.8:1
            color: '#fff', fontSize: '14px', fontWeight: 600, fontFamily: font, cursor: loading ? 'progress' : 'pointer',
          }}>
            {g.submit}
          </button>
          <button type="button" onClick={handleCancel} style={{
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontFamily: font, fontSize: '13px',
            textDecoration: 'underline', cursor: 'pointer', padding: '6px',
          }}>
            {g.cancel}
          </button>
        </form>
      </main>
    </div>
  )
}
