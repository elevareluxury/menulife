import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { authErrorMessage } from '@/lib/authErrors'

const CORAL = '#F4705A'

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

function DarkInput({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      <label style={{
        display: 'block', fontFamily: 'var(--font-jakarta)', fontSize: '11px',
        fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: '6px',
        letterSpacing: '0.06em', textTransform: 'uppercase',
      }}>
        {label}
      </label>
      <input
        {...props}
        onFocus={e => { setFocused(true); props.onFocus?.(e) }}
        onBlur={e => { setFocused(false); props.onBlur?.(e) }}
        style={{
          ...BASE_INPUT,
          border: `1px solid ${focused ? CORAL : 'rgba(255,255,255,0.1)'}`,
          boxShadow: focused ? `0 0 0 3px rgba(244,112,90,0.12)` : 'none',
        }}
      />
    </div>
  )
}

export function RegisterPage() {
  const navigate = useNavigate()
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [accepted, setAccepted] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim()) { setError('Escribí tu nombre.'); return }
    if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      setError('La contraseña necesita al menos 8 caracteres, con letras y números.')
      return
    }
    if (!accepted) { setError('Para crear tu cuenta, aceptá los Términos y la Política de privacidad.'); return }

    setLoading(true)
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name: name.trim(), terms_accepted_at: new Date().toISOString() },
          emailRedirectTo: window.location.origin + '/auth/callback',
        },
      })
      if (authError) throw authError
      if (!authData.user) throw new Error('No se pudo crear el usuario')

      // Email confirmation required — no session yet
      if (!authData.session) {
        toast.success('¡Cuenta creada! Revisá tu email para confirmar.')
        navigate('/login')
        return
      }

      toast.success('¡Bienvenido a Mycen!')
      // Onboarding guiado: Studio lo muestra a quien todavía no tiene identidad
      navigate('/studio')
    } catch (err: unknown) {
      setError(authErrorMessage(err, 'No pudimos crear tu cuenta. Intentá de nuevo.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0F1115',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', position: 'relative', overflow: 'hidden',
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'fixed', bottom: '-180px', left: '50%', transform: 'translateX(-50%)',
        width: '700px', height: '360px', borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(244,112,90,0.11) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      <div style={{
        width: '100%', maxWidth: '420px',
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '24px', padding: '40px 36px',
        backdropFilter: 'blur(20px)',
        position: 'relative', zIndex: 1,
        animation: 'ml-fade-up 0.45s ease-out both',
      }}>
        {/* Logo + title */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none', marginBottom: '16px' }}>
            <img src="/logo.png" alt="Mycen" className="h-8 w-auto" />
          </Link>
          <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '14px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
            Tu identidad digital, todo en un solo lugar
          </p>
        </div>

        {error && (
          <div style={{
            padding: '10px 14px', borderRadius: '10px',
            background: 'rgba(244,112,90,0.1)', border: '1px solid rgba(244,112,90,0.3)',
            fontFamily: 'var(--font-jakarta)', fontSize: '13px', color: CORAL,
            lineHeight: 1.5, marginBottom: '16px',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <DarkInput
            label="Tu nombre"
            type="text"
            placeholder="Juan García"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            autoComplete="name"
          />

          <DarkInput
            label="Email"
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <DarkInput
            label="Contraseña"
            type="password"
            placeholder="Mínimo 8, con letras y números"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />

          <label style={{
            display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer',
            fontFamily: 'var(--font-jakarta)', fontSize: '13px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.5,
          }}>
            <input type="checkbox" checked={accepted} onChange={e => { setAccepted(e.target.checked); setError('') }} required
              style={{ marginTop: '3px', width: 16, height: 16, accentColor: CORAL, flexShrink: 0 }} />
            <span>
              Acepto los{' '}
              <Link to="/terminos" target="_blank" style={{ color: '#fff' }}>Términos</Link> y la{' '}
              <Link to="/privacidad" target="_blank" style={{ color: '#fff' }}>Política de privacidad</Link>.
            </span>
          </label>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '4px',
              width: '100%', padding: '13px',
              borderRadius: '50px', border: 'none',
              background: loading ? 'rgba(244,112,90,0.45)' : CORAL,
              color: '#fff', fontSize: '14px', fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-jakarta)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { if (!loading) { e.currentTarget.style.boxShadow = '0 0 24px rgba(244,112,90,0.45)'; e.currentTarget.style.transform = 'scale(1.01)' } }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = '' }}
          >
            {loading ? 'Creando tu cuenta…' : 'Crear mi cuenta gratis'}
          </button>
        </form>

        <p style={{ marginTop: '24px', textAlign: 'center', fontFamily: 'var(--font-jakarta)', fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>
          ¿Ya tenés cuenta?{' '}
          <Link to="/login" style={{ color: CORAL, fontWeight: 600, textDecoration: 'none' }}>
            Iniciar sesión →
          </Link>
        </p>
      </div>
    </div>
  )
}
