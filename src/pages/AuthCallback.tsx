import { useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export function AuthCallback() {
  const navigate = useNavigate()

  // Capture URL params SYNCHRONOUSLY during render — Supabase's async _initialize()
  // calls history.replaceState() to clear the hash during its microtask chain,
  // which runs after render but before useEffect. Reading here guarantees we see
  // the original tokens before they're wiped.
  const params = useMemo(() => {
    const search = new URLSearchParams(window.location.search)
    const hash   = new URLSearchParams(window.location.hash.replace('#', ''))
    return {
      error:        search.get('error')             || hash.get('error'),
      errorDesc:    search.get('error_description') || hash.get('error_description'),
      type:         search.get('type')              || hash.get('type'),
      code:         search.get('code'),
      accessToken:  hash.get('access_token'),
      refreshToken: hash.get('refresh_token'),
    }
  }, [])

  useEffect(() => {
    const { error, errorDesc, type, code, accessToken, refreshToken } = params

    async function redirectByRole(userId?: string) {
      const id = userId ?? (await supabase.auth.getUser()).data.user?.id
      if (!id) { navigate('/dashboard', { replace: true }); return }
      const { data: superAdmin } = await supabase
        .from('super_admins')
        .select('id')
        .eq('user_id', id)
        .maybeSingle()
      navigate(superAdmin ? '/super-admin' : '/dashboard', { replace: true })
    }

    async function handle() {
      try {
        // Explicit error in the URL
        if (error) {
          console.error('Auth callback error:', errorDesc)
          const dest = type === 'recovery' ? '/forgot-password' : '/login'
          navigate(
            `${dest}?error=${encodeURIComponent(errorDesc ?? 'Link inválido o expirado')}`,
            { replace: true }
          )
          return
        }

        // ── PKCE flow: ?code= in query string ────────────────────────────────
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          if (exchangeError) {
            const dest = type === 'recovery' ? '/forgot-password' : '/login'
            navigate(`${dest}?error=Sesión+inválida`, { replace: true })
            return
          }
          if (type === 'recovery') {
            navigate('/reset-password', { replace: true })
            return
          }
          await redirectByRole()
          return
        }

        // ── Implicit flow: #access_token= captured via useMemo before Supabase cleared hash
        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (sessionError) {
            const dest = type === 'recovery' ? '/forgot-password' : '/login'
            navigate(`${dest}?error=Sesión+inválida`, { replace: true })
            return
          }
          if (type === 'recovery') {
            navigate('/reset-password', { replace: true })
            return
          }
          await redirectByRole()
          return
        }

        // ── type=recovery captured but tokens already consumed by Supabase initializer ──
        // Supabase already called setSession internally; just verify the session exists.
        if (type === 'recovery') {
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            navigate('/reset-password', { replace: true })
            return
          }
          // Session not ready yet — give Supabase a moment and retry once
          await new Promise(r => setTimeout(r, 800))
          const { data: retry } = await supabase.auth.getSession()
          if (retry.session) {
            navigate('/reset-password', { replace: true })
            return
          }
          navigate('/forgot-password?error=expired', { replace: true })
          return
        }

        // ── No tokens at all — use existing session and redirect normally ────
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          await redirectByRole(session.user.id)
        } else {
          navigate('/login', { replace: true })
        }
      } catch (err) {
        console.error('AuthCallback error:', err)
        navigate('/login', { replace: true })
      }
    }

    handle()
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
      <p style={{ color: '#98A2B3', fontSize: '0.9375rem' }}>
        Verificando acceso...
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
