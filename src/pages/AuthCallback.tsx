import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/reset-password', { replace: true })
      } else if (event === 'SIGNED_IN' && session) {
        const { data: superAdmin } = await supabase
          .from('super_admins')
          .select('id')
          .eq('user_id', session.user.id)
          .maybeSingle()

        navigate(superAdmin ? '/super-admin' : '/dashboard', { replace: true })
      } else if (event === 'SIGNED_OUT') {
        navigate('/login', { replace: true })
      } else {
        navigate('/login', { replace: true })
      }
    })
    return () => subscription.unsubscribe()
  }, [navigate])

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: '#0F1115',
      color: '#F5F7FA',
      fontSize: '0.9375rem',
    }}>
      Verificando acceso...
    </div>
  )
}
