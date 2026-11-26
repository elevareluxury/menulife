import { useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { postLoginRoute } from '@/modules/auth/lib/postLoginRoute'
import { useAuthT } from '@/i18n/app/auth'
import { applyPendingSignup, needsTerms } from '@/modules/auth/lib/googleSignIn'

export function AuthCallback() {
  const t = useAuthT()
  const navigate = useNavigate()

  // Capture URL params SYNCHRONOUSLY during render — Supabase's async _initialize()
  // calls history.replaceState() to clear the hash during its microtask chain,
  // which runs after render but before useEffect. Reading here guarantees we see
  // the original tokens before they're wiped.
  const params = useMemo(() => {
    const search = new URLSearchParams(window.location.search)
    const hash   = new URLSearchParams(window.location.hash.replace('#', ''))
    return {
      error:     search.get('error')             || hash.get('error'),
      errorDesc: search.get('error_description') || hash.get('error_description'),
      type:      search.get('type')              || hash.get('type'),
      code:      search.get('code'),
      // Links de los mails (supabase/templates): token_hash + type, se canjean con verifyOtp en cualquier dispositivo
      tokenHash: search.get('token_hash'),
      // Links de mails viejos (antes de PKCE): los tokens vienen en el # y el cliente ya no los lee solo
      accessToken:  hash.get('access_token'),
      refreshToken: hash.get('refresh_token'),
    }
  }, [])

  useEffect(() => {
    const { error, errorDesc, type, code, tokenHash, accessToken, refreshToken } = params

    async function redirectByRole(userId?: string) {
      // Volviendo de "Continuar con Google": idioma, términos y referido, como en el registro con email
      await applyPendingSignup()
      const { data: { user } } = await supabase.auth.getUser()
      // Cuenta nueva con Google desde el login: acepta Términos y Privacidad una vez antes de entrar
      if (needsTerms(user)) { navigate('/auth/terms', { replace: true }); return }
      const id = userId ?? user?.id
      if (!id) { navigate('/life', { replace: true }); return }
      navigate(await postLoginRoute(id), { replace: true })
    }

    async function handle() {
      try {
        // CASE 1: Explicit error in URL
        if (error) {
          // Se pasa un código (no el texto en inglés de Supabase): la pantalla lo muestra en el idioma de la persona
          // "Database error saving new user" = la base frenó la cuenta nueva (registros en pausa)
          const code = /expired/i.test(errorDesc ?? '') ? 'expired' : /saving new user/i.test(errorDesc ?? '') ? 'paused' : 'invalid'
          const dest = type === 'recovery' ? '/forgot-password' : '/login'
          navigate(`${dest}?error=${code}`, { replace: true })
          return
        }

        // CASE 1b: link de un mail (token_hash). Recuperar la contraseña va a /reset-password; lo demás, a la app.
        if (tokenHash) {
          const otpType = (['email', 'signup', 'recovery', 'email_change', 'magiclink', 'invite'] as const)
            .find(t => t === type) ?? 'email'
          // Con una sesión abierta, un link de otra cuenta no la reemplaza sin avisar (alguien podría mandarte el link
          // de SU cuenta para que escribas tus cosas ahí). Sólo cambiar el email es de la cuenta abierta.
          if (otpType !== 'email_change') {
            const { data: current } = await supabase.auth.getSession()
            if (current.session) { await redirectByRole(current.session.user.id); return }
          }
          const { error: ex } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: otpType })
          if (ex) {
            const bad = /expired/i.test(ex.message) ? 'expired' : 'invalid'
            navigate(otpType === 'recovery' ? `/forgot-password?error=${bad}` : `/login?error=${bad}`, { replace: true })
            return
          }
          if (otpType === 'recovery') { navigate('/reset-password', { replace: true }); return }
          await redirectByRole()
          return
        }

        // CASE 1c: tokens en el # (mails viejos, antes de PKCE). Ya no se usan para entrar: cualquiera podía armar un
        // link con los tokens de su cuenta y dejarte adentro de ella sin que lo notes. Se pide el link de nuevo.
        if (accessToken || refreshToken) {
          if (window.location.hash) window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search)
          const { data: current } = await supabase.auth.getSession()
          if (current.session) { await redirectByRole(current.session.user.id); return }
          navigate(type === 'recovery' ? '/forgot-password?error=expired' : '/login?error=expired', { replace: true })
          return
        }

        // CASE 2: Recovery — poll for session (works for both implicit & PKCE flow).
        // Do NOT call setSession() with raw tokens — Supabase's _initialize() already
        // consumed them; calling setSession() again causes "invalid token" errors that
        // send the user to /forgot-password instead of /reset-password.
        if (type === 'recovery') {
          // PKCE: exchange code before polling
          if (code) {
            const { error: ex } = await supabase.auth.exchangeCodeForSession(code)
            if (ex) {
              navigate('/forgot-password?error=invalid', { replace: true })
              return
            }
          }

          // Poll until Supabase's async token processing completes
          let session = null
          for (let i = 0; i < 10 && !session; i++) {
            const { data } = await supabase.auth.getSession()
            session = data.session
            if (!session) await new Promise(r => setTimeout(r, 500))
          }

          if (session) {
            navigate('/reset-password', { replace: true })
          } else {
            navigate('/forgot-password?error=expired', { replace: true })
          }
          return
        }

        // CASE 3: PKCE code (Google, Apple o un link viejo de mail). Si el canje dice que era recuperar la contraseña
        // (el pedido se hizo en este navegador), a /reset-password.
        if (code) {
          const { data: ex, error: exError } = await supabase.auth.exchangeCodeForSession(code)
          if (exError) {
            navigate('/login?error=invalid', { replace: true })
            return
          }
          // auth-js devuelve redirectType aunque el tipo no lo declare
          if ((ex as { redirectType?: string | null }).redirectType === 'recovery') { navigate('/reset-password', { replace: true }); return }
          await redirectByRole()
          return
        }

        // CASE 4: No explicit type — implicit hash tokens already consumed by Supabase.
        // Poll until _initialize() finishes (max 5 × 300 ms — adapts to connection speed).
        let session4 = null
        for (let i = 0; i < 5 && !session4; i++) {
          const { data } = await supabase.auth.getSession()
          session4 = data.session
          if (!session4 && i < 4) await new Promise(r => setTimeout(r, 300))
        }
        if (session4) {
          await redirectByRole(session4.user.id)
        } else {
          navigate('/login', { replace: true })
        }
      } catch {
        navigate('/login', { replace: true })
      }
    }

    // Safety net: if handle() hangs or throws outside its inner try/catch, redirect after 15 s
    const timeoutId = setTimeout(() => {
      navigate('/login?error=auth_failed', { replace: true })
    }, 15_000)

    handle()
      .catch(() => navigate('/login?error=auth_failed', { replace: true }))
      .finally(() => clearTimeout(timeoutId))

    return () => clearTimeout(timeoutId)
  }, [navigate, params])

  return (
    <div style={{
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      height:         '100vh',
      background:     '#0F1115',
      color:          '#F5F7FA',
      gap:            '16px',
    }}>
      <div style={{
        width:          '40px',
        height:         '40px',
        border:         '3px solid #FF6B7A',
        borderTopColor: 'transparent',
        borderRadius:   '50%',
        animation:      'spin 0.8s linear infinite',
      }} />
      <p role="status" style={{ color: '#98A2B3', fontSize: '0.9375rem' }}>
        {t.common.checking}
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
