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
      error:     search.get('error')             || hash.get('error'),
      errorDesc: search.get('error_description') || hash.get('error_description'),
      type:      search.get('type')              || hash.get('type'),
      code:      search.get('code'),
    }
  }, [])

  useEffect(() => {
    const { error, errorDesc, type, code } = params

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
        // CASE 1: Explicit error in URL
        if (error) {
          const msg = errorDesc
            ? decodeURIComponent(errorDesc.replace(/\+/g, ' '))
            : 'Link inválido o expirado'
          const dest = type === 'recovery' ? '/forgot-password' : '/login'
          navigate(`${dest}?error=${encodeURIComponent(msg)}`, { replace: true })
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
              navigate('/forgot-password?error=Sesión+inválida', { replace: true })
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

        // CASE 3: PKCE code, non-recovery (magic link, signup confirmation)
        if (code) {
          const { error: ex } = await supabase.auth.exchangeCodeForSession(code)
          if (ex) {
            navigate('/login?error=Sesión+inválida', { replace: true })
            return
          }
          await redirectByRole()
          return
        }

        // CASE 4: No explicit type — implicit hash tokens already consumed by Supabase.
        // Give _initialize() a moment to finish, then use the existing session.
        await new Promise(r => setTimeout(r, 800))
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          await redirectByRole(session.user.id)
        } else {
          navigate('/login', { replace: true })
        }
      } catch (err) {
        console.error('[AuthCallback] error:', err)
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
