import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    async function handleCallback() {
      try {
        // Supabase JS v2 + PKCE (default): tokens come as ?code=...&type=... in query params
        // Legacy implicit flow: tokens come as #access_token=...&type=... in hash
        const searchParams = new URLSearchParams(window.location.search)
        const hashParams   = new URLSearchParams(window.location.hash.replace('#', ''))

        const error      = searchParams.get('error')      || hashParams.get('error')
        const errorDesc  = searchParams.get('error_description') || hashParams.get('error_description')
        const type       = searchParams.get('type')       || hashParams.get('type')

        const code         = searchParams.get('code')
        const accessToken  = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')

        // Supabase returned an explicit error in the URL
        if (error) {
          console.error('Auth callback error:', errorDesc)
          navigate(
            `/login?error=${encodeURIComponent(errorDesc ?? 'Link inválido o expirado')}`,
            { replace: true }
          )
          return
        }

        // ── PKCE flow: ?code= in query string ────────────────────────────────
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          if (exchangeError) {
            navigate('/login?error=Sesión+inválida', { replace: true })
            return
          }

          if (type === 'recovery') {
            navigate('/reset-password', { replace: true })
            return
          }

          // signup / magiclink / other → check role and redirect
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { data: superAdmin } = await supabase
              .from('super_admins')
              .select('id')
              .eq('user_id', user.id)
              .maybeSingle()
            navigate(superAdmin ? '/super-admin' : '/dashboard', { replace: true })
          } else {
            navigate('/dashboard', { replace: true })
          }
          return
        }

        // ── Implicit flow: #access_token= in hash ────────────────────────────
        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (sessionError) {
            navigate('/login?error=Sesión+inválida', { replace: true })
            return
          }

          if (type === 'recovery') {
            navigate('/reset-password', { replace: true })
            return
          }

          if (type === 'signup' || type === 'magiclink') {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
              const { data: superAdmin } = await supabase
                .from('super_admins')
                .select('id')
                .eq('user_id', user.id)
                .maybeSingle()
              navigate(superAdmin ? '/super-admin' : '/dashboard', { replace: true })
              return
            }
          }

          navigate('/dashboard', { replace: true })
          return
        }

        // ── No token or code — check for an existing session ─────────────────
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const { data: superAdmin } = await supabase
            .from('super_admins')
            .select('id')
            .eq('user_id', session.user.id)
            .maybeSingle()
          navigate(superAdmin ? '/super-admin' : '/dashboard', { replace: true })
        } else {
          navigate('/login', { replace: true })
        }
      } catch (err) {
        console.error('AuthCallback error:', err)
        navigate('/login', { replace: true })
      }
    }

    handleCallback()
  }, [navigate])

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
