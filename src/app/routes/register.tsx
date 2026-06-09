import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
const db = supabase as any
import toast from 'react-hot-toast'

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

function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function DarkInput({
  label,
  prefix,
  ...props
}: { label: string; prefix?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
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
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {prefix && (
          <span style={{
            position: 'absolute', left: '14px',
            fontFamily: 'var(--font-jakarta)', fontSize: '14px',
            color: 'rgba(255,255,255,0.3)', pointerEvents: 'none', whiteSpace: 'nowrap',
          }}>
            {prefix}
          </span>
        )}
        <input
          {...props}
          onFocus={e => { setFocused(true); props.onFocus?.(e) }}
          onBlur={e => { setFocused(false); props.onBlur?.(e) }}
          style={{
            ...BASE_INPUT,
            border: `1px solid ${focused ? CORAL : 'rgba(255,255,255,0.1)'}`,
            boxShadow: focused ? `0 0 0 3px rgba(244,112,90,0.12)` : 'none',
            paddingLeft: prefix ? `${prefix.length * 7.5 + 14}px` : '14px',
          }}
        />
      </div>
    </div>
  )
}

export function RegisterPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-generate slug from business name unless manually edited
  useEffect(() => {
    if (!slugEdited) {
      setSlug(slugify(businessName))
    }
  }, [businessName, slugEdited])

  // Debounced slug availability check
  useEffect(() => {
    if (!slug) { setSlugStatus('idle'); return }
    setSlugStatus('checking')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const { data } = await db
        .from('restaurants')
        .select('id')
        .eq('slug', slug)
        .maybeSingle()
      setSlugStatus(data ? 'taken' : 'available')
    }, 500)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [slug])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    if (slugStatus === 'taken') { setError('El link ya está en uso, elegí otro'); return }
    if (!slug) { setError('El link no puede estar vacío'); return }

    setLoading(true)
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name, business_name: businessName } },
      })
      if (authError) throw authError
      if (!authData.user) throw new Error('No se pudo crear el usuario')

      const { error: restError } = await db
        .from('restaurants')
        .insert({
          owner_id: authData.user.id,
          name: businessName,
          slug,
          email,
          plan: 'hub_free',
          hub_enabled: true,
          onboarding_completed: true,
          business_type: 'gastronomy',
          is_active: true,
          subscription_status: 'trial',
          default_currency: 'ARS',
          default_language: 'ES',
        })

      if (restError) throw restError

      toast.success('¡Bienvenido a MenuLife!')
      navigate('/dashboard/hub')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear la cuenta'
      setError(msg)
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
            <img src="/logo.png" alt="MenuLife" className="h-8 w-auto" />
          </Link>
          <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '14px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
            Creá tu perfil gratis
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
            label="Nombre del negocio"
            type="text"
            placeholder="Forest Café"
            value={businessName}
            onChange={e => setBusinessName(e.target.value)}
            required
          />

          {/* Slug field with availability badge */}
          <div>
            <label style={{
              display: 'block', fontFamily: 'var(--font-jakarta)', fontSize: '11px',
              fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: '6px',
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>
              Tu link
            </label>
            <SlugInput
              value={slug}
              onChange={v => { setSlug(v); setSlugEdited(true) }}
              status={slugStatus}
            />
          </div>

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
            placeholder="Mínimo 6 caracteres"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />

          <button
            type="submit"
            disabled={loading || slugStatus === 'taken' || slugStatus === 'checking'}
            style={{
              marginTop: '4px',
              width: '100%', padding: '13px',
              borderRadius: '50px', border: 'none',
              background: (loading || slugStatus === 'taken' || slugStatus === 'checking')
                ? 'rgba(244,112,90,0.45)'
                : CORAL,
              color: '#fff', fontSize: '14px', fontWeight: 600,
              cursor: (loading || slugStatus === 'taken' || slugStatus === 'checking') ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-jakarta)',
              position: 'relative', overflow: 'hidden',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { if (!loading) { e.currentTarget.style.boxShadow = '0 0 24px rgba(244,112,90,0.45)'; e.currentTarget.style.transform = 'scale(1.01)' } }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = '' }}
          >
            {loading ? 'Creando tu perfil...' : 'Crear mi perfil gratis'}
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

function SlugInput({
  value,
  onChange,
  status,
}: {
  value: string
  onChange: (v: string) => void
  status: 'idle' | 'checking' | 'available' | 'taken'
}) {
  const [focused, setFocused] = useState(false)
  const PREFIX = 'menulife.digital/'

  const badgeColor = status === 'available' ? '#10B981' : status === 'taken' ? '#EF4444' : 'rgba(255,255,255,0.3)'
  const badgeText = status === 'available' ? 'Disponible ✓' : status === 'taken' ? 'Ocupado ✗' : status === 'checking' ? '...' : ''

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center',
        background: 'rgba(255,255,255,0.06)',
        border: `1px solid ${focused ? CORAL : 'rgba(255,255,255,0.1)'}`,
        boxShadow: focused ? `0 0 0 3px rgba(244,112,90,0.12)` : 'none',
        borderRadius: '10px', overflow: 'hidden',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}>
        <span style={{
          padding: '11px 0 11px 14px',
          fontFamily: 'var(--font-jakarta)', fontSize: '13px',
          color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {PREFIX}
        </span>
        <input
          type="text"
          value={value}
          onChange={e => onChange(slugify(e.target.value))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="mi-negocio"
          style={{
            flex: 1, padding: '11px 14px 11px 2px',
            background: 'transparent', border: 'none', outline: 'none',
            color: '#fff', fontSize: '14px', fontFamily: 'var(--font-jakarta)',
          }}
        />
      </div>
      {badgeText && (
        <p style={{
          marginTop: '5px', fontFamily: 'var(--font-jakarta)',
          fontSize: '11px', color: badgeColor, fontWeight: 600,
        }}>
          {badgeText}
        </p>
      )}
    </div>
  )
}
