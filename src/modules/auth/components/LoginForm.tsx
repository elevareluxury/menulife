import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { ROUTES } from '@/lib/constants'
import toast from 'react-hot-toast'

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

function DarkInput({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      <label style={{ display: 'block', fontFamily: 'var(--font-jakarta)', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: '6px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {label}
      </label>
      <input
        {...props}
        onFocus={e => { setFocused(true); props.onFocus?.(e) }}
        onBlur={e => { setFocused(false); props.onBlur?.(e) }}
        style={{
          ...BASE_INPUT,
          border: `1px solid ${focused ? 'var(--ml-salmon)' : 'rgba(255,255,255,0.1)'}`,
          boxShadow: focused ? '0 0 0 3px rgba(244,112,90,0.12)' : 'none',
        }}
      />
    </div>
  )
}

export function LoginForm() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      setLoading(true)
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) throw signInError

      toast.success('¡Bienvenido!')

      const { data: superAdmin } = await supabase
        .from('super_admins')
        .select('id')
        .eq('user_id', data.user.id)
        .maybeSingle()

      navigate(superAdmin ? ROUTES.SUPER_ADMIN : ROUTES.DASHBOARD)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al iniciar sesión'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/dashboard` },
      })
      if (error) throw error
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al iniciar sesión con Google')
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Error banner */}
      {error && (
        <div style={{
          padding: '10px 14px', borderRadius: '10px',
          background: 'rgba(244,112,90,0.1)', border: '1px solid rgba(244,112,90,0.3)',
          fontFamily: 'var(--font-jakarta)', fontSize: '13px', color: '#F4705A',
          lineHeight: 1.5,
        }}>
          {error}
        </div>
      )}

      <DarkInput
        label="Email"
        type="email"
        placeholder="tu@email.com"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
        autoComplete="email"
      />

      <div>
        <DarkInput
          label="Contraseña"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
          <Link
            to="/forgot-password"
            style={{ fontFamily: 'var(--font-jakarta)', fontSize: '12px', color: 'var(--ml-salmon)', textDecoration: 'none', fontWeight: 500 }}
            onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
            onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
      </div>

      {/* Primary CTA */}
      <button
        type="submit"
        disabled={loading}
        style={{
          width: '100%', padding: '13px',
          borderRadius: '50px', border: 'none',
          background: loading ? 'rgba(244,112,90,0.45)' : 'var(--ml-salmon)',
          color: '#fff', fontSize: '14px', fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer',
          fontFamily: 'var(--font-jakarta)',
          position: 'relative', overflow: 'hidden',
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => { if (!loading) { e.currentTarget.style.boxShadow = '0 0 24px rgba(244,112,90,0.45)'; e.currentTarget.style.transform = 'scale(1.01)' } }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = '' }}
      >
        {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
        {!loading && (
          <span style={{
            position: 'absolute', top: 0, left: '-100%', width: '100%', height: '100%',
            background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)',
            animation: 'ml-shimmer 3s infinite',
          }} />
        )}
      </button>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
        <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '12px', color: 'rgba(255,255,255,0.25)' }}>O continuar con</span>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
      </div>

      {/* Google */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        style={{
          width: '100%', padding: '12px',
          borderRadius: '50px',
          border: '1px solid rgba(255,255,255,0.12)',
          background: 'rgba(255,255,255,0.04)',
          color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: 500,
          cursor: 'pointer', fontFamily: 'var(--font-jakarta)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        Google
      </button>
    </form>
  )
}
