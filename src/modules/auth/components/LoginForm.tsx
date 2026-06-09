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

      const [{ data: superAdmin }, { data: restaurant }] = await Promise.all([
        supabase.from('super_admins').select('id').eq('user_id', data.user.id).maybeSingle(),
        supabase.from('restaurants').select('plan').eq('owner_id', data.user.id).maybeSingle(),
      ])

      if (superAdmin) {
        navigate(ROUTES.SUPER_ADMIN)
      } else if (restaurant?.plan === 'hub_free') {
        navigate('/dashboard/hub')
      } else {
        navigate(ROUTES.DASHBOARD)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al iniciar sesión'
      setError(msg)
    } finally {
      setLoading(false)
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

    </form>
  )
}
