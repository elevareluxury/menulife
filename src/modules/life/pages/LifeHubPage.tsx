import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { ArrowLeft, Globe, Sparkles, Check, X, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useLifeStore } from '@/store/lifeStore'
import { useRestaurant } from '@/modules/menu/hooks/useRestaurant'
import { Spinner } from '@/components/ui/Spinner'
import HubPage from '@/modules/hub/pages/HubPage'
import { colors, font, radius } from '../design-system'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

const RESERVED_SLUGS = new Set([
  'login', 'register', 'onboarding', 'dashboard', 'life',
  'auth', 'admin', 'api', 'app', 'help', 'about', 'terms',
  'privacy', 'contact', 'support', 'settings', 'profile',
  'signup', 'signin', 'logout', 'me', 'my', 'account',
  'hub', 'id', 'mycen', 'menulife',
])

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
}

function isValidSlug(slug: string): boolean {
  if (slug.length < 3 || slug.length > 50) return false
  if (RESERVED_SLUGS.has(slug)) return false
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug)) return false
  return true
}

type SlugStatus =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'available' }
  | { state: 'taken' }
  | { state: 'invalid'; reason: string }
  | { state: 'reserved' }

export function LifeHubPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { setHasRestaurant, setRestaurantName, setRestaurantSlug } = useLifeStore()
  const { restaurant, loading } = useRestaurant()

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [slugStatus, setSlugStatus] = useState<SlugStatus>({ state: 'idle' })
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-suggest slug from name if user hasn't edited slug manually
  useEffect(() => {
    if (slugTouched) return
    const suggested = slugify(name)
    setSlug(suggested)
  }, [name, slugTouched])

  // Debounced availability check
  useEffect(() => {
    if (slug.length === 0) {
      setSlugStatus({ state: 'idle' })
      return
    }

    if (RESERVED_SLUGS.has(slug)) {
      setSlugStatus({ state: 'reserved' })
      return
    }

    if (!isValidSlug(slug)) {
      setSlugStatus({
        state: 'invalid',
        reason: slug.length < 3
          ? 'Muy corto (mínimo 3)'
          : 'Solo letras, números y guiones',
      })
      return
    }

    setSlugStatus({ state: 'checking' })
    const timer = setTimeout(async () => {
      try {
        const { data } = await db
          .from('restaurants')
          .select('id')
          .eq('slug', slug)
          .maybeSingle()
        setSlugStatus({ state: data ? 'taken' : 'available' })
      } catch {
        setSlugStatus({ state: 'idle' })
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [slug])

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0A0B0F',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Spinner size="lg" />
      </div>
    )
  }

  // User already has a restaurant
  if (restaurant) {
    if (restaurant.onboarding_completed !== true) {
      return <Navigate to="/onboarding" replace />
    }
    return <HubPage />
  }

  const canCreate = (
    name.trim().length >= 2 &&
    slug.length >= 3 &&
    slugStatus.state === 'available' &&
    !creating
  )

  const handleCreate = useCallback(async () => {
    if (!user || !canCreate) return
    setCreating(true)
    setError(null)
    try {
      const { data, error: err } = await db
        .from('restaurants')
        .insert({
          owner_id: user.id,
          name: name.trim(),
          slug,
          plan: 'hub_free',
          hub_enabled: true,
          onboarding_completed: false,
          is_active: true,
        })
        .select('id,name,slug')
        .single()
      if (err) throw err

      setHasRestaurant(true)
      setRestaurantName(data.name)
      setRestaurantSlug(data.slug)

      navigate('/onboarding')
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? 'Error al crear el ID'
      setError(
        msg.includes('duplicate') || msg.includes('unique')
          ? 'Ese nombre o URL ya está en uso, probá otro.'
          : msg,
      )
      setCreating(false)
    }
  }, [user, canCreate, name, slug, navigate, setHasRestaurant, setRestaurantName, setRestaurantSlug])

  const slugBorderColor = (() => {
    if (slugStatus.state === 'taken' || slugStatus.state === 'invalid' || slugStatus.state === 'reserved') {
      return 'rgba(248,113,113,0.5)'
    }
    if (slugStatus.state === 'available') return 'rgba(34,197,94,0.5)'
    return 'rgba(255,255,255,0.1)'
  })()

  return (
    <div style={{ minHeight: '100vh', background: '#0A0B0F' }}>

      {/* Nav bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: `calc(env(safe-area-inset-top) + 14px) 16px 14px`,
        maxWidth: '480px', margin: '0 auto',
      }}>
        <button
          onClick={() => navigate('/life')}
          style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
            color: colors.text.secondary, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <ArrowLeft size={16} strokeWidth={2.3} />
        </button>
        <p style={{
          fontFamily: font, fontSize: '16px', fontWeight: 700,
          color: colors.text.primary, margin: 0,
        }}>
          Crear ID Digital
        </p>
      </div>

      {/* Body */}
      <div style={{
        maxWidth: '480px', width: '100%', margin: '0 auto',
        padding: '8px 16px 120px',
        display: 'flex', flexDirection: 'column', gap: '20px',
      }}>

        {/* Hero */}
        <div style={{
          background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)',
          borderRadius: radius.xl, padding: '28px 24px', textAlign: 'center',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px',
            background: 'radial-gradient(circle at 36% 32%, #5C60C0 0%, #3730A3 60%, #1E1B4B 100%)',
            boxShadow: '0 0 24px rgba(99,102,241,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Globe size={22} style={{ color: '#818CF8' }} strokeWidth={2} />
          </div>
          <p style={{
            fontFamily: font, fontSize: '18px', fontWeight: 700,
            color: colors.text.primary, margin: '0 0 8px',
          }}>
            Tu ID en la web
          </p>
          <p style={{
            fontFamily: font, fontSize: '13px', color: colors.text.secondary,
            margin: 0, lineHeight: 1.55,
          }}>
            Creá tu ID digital gratuito. Compartí tu historia, links
            y lo que quieras con una URL única.
          </p>
        </div>

        {/* Form: nombre */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{
            fontFamily: font, fontSize: '11px', fontWeight: 700,
            color: colors.text.tertiary, letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            Nombre
          </label>
          <input
            value={name}
            onChange={e => { setName(e.target.value); setError(null) }}
            placeholder="Ej: Juan García, Mi Estudio..."
            autoFocus
            style={{
              width: '100%', padding: '12px 16px', boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: radius.lg,
              color: colors.text.primary, fontFamily: font, fontSize: '15px',
              outline: 'none',
            }}
          />
        </div>

        {/* Form: username / slug */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{
            fontFamily: font, fontSize: '11px', fontWeight: 700,
            color: colors.text.tertiary, letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            Tu URL
          </label>
          <div style={{
            display: 'flex', alignItems: 'stretch',
            background: 'rgba(255,255,255,0.05)',
            border: `1px solid ${slugBorderColor}`,
            borderRadius: radius.lg,
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '12px 12px 12px 16px',
              fontFamily: font, fontSize: '15px',
              color: colors.text.tertiary,
              display: 'flex', alignItems: 'center',
              whiteSpace: 'nowrap',
            }}>
              mycen.id/
            </div>
            <input
              value={slug}
              onChange={e => {
                setSlugTouched(true)
                setSlug(slugify(e.target.value))
                setError(null)
              }}
              placeholder="tu-usuario"
              style={{
                flex: 1, padding: '12px 12px 12px 0', boxSizing: 'border-box',
                background: 'transparent',
                border: 'none',
                color: colors.text.primary, fontFamily: font, fontSize: '15px',
                outline: 'none',
              }}
            />
            <div style={{
              padding: '0 14px',
              display: 'flex', alignItems: 'center',
              minWidth: '32px',
            }}>
              {slugStatus.state === 'checking' && (
                <Loader2 size={16} className="animate-spin" style={{ color: colors.text.tertiary }} />
              )}
              {slugStatus.state === 'available' && (
                <Check size={16} strokeWidth={2.5} style={{ color: '#22C55E' }} />
              )}
              {(slugStatus.state === 'taken' || slugStatus.state === 'invalid' || slugStatus.state === 'reserved') && (
                <X size={16} strokeWidth={2.5} style={{ color: '#F87171' }} />
              )}
            </div>
          </div>

          {slugStatus.state === 'available' && (
            <p style={{ fontFamily: font, fontSize: '12px', color: '#22C55E', margin: 0 }}>
              Disponible
            </p>
          )}
          {slugStatus.state === 'taken' && (
            <p style={{ fontFamily: font, fontSize: '12px', color: '#F87171', margin: 0 }}>
              Ya está en uso, probá otro
            </p>
          )}
          {slugStatus.state === 'invalid' && (
            <p style={{ fontFamily: font, fontSize: '12px', color: '#F87171', margin: 0 }}>
              {slugStatus.reason}
            </p>
          )}
          {slugStatus.state === 'reserved' && (
            <p style={{ fontFamily: font, fontSize: '12px', color: '#F87171', margin: 0 }}>
              Ese nombre está reservado
            </p>
          )}
        </div>

        {error && (
          <p style={{ fontFamily: font, fontSize: '13px', color: '#F87171', margin: 0 }}>
            {error}
          </p>
        )}

        <button
          onClick={handleCreate}
          disabled={!canCreate}
          style={{
            marginTop: '4px',
            width: '100%', padding: '14px 0',
            borderRadius: radius.xl,
            background: canCreate
              ? 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)'
              : 'rgba(255,255,255,0.05)',
            border: 'none',
            cursor: canCreate ? 'pointer' : 'not-allowed',
            color: canCreate ? '#fff' : colors.text.tertiary,
            fontFamily: font, fontSize: '15px', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            opacity: creating ? 0.75 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          {creating ? (
            <>
              <div className="animate-spin" style={{
                width: 16, height: 16, borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.25)',
                borderTopColor: '#fff',
              }} />
              Creando...
            </>
          ) : (
            <>
              <Sparkles size={16} strokeWidth={2.3} />
              Crear mi ID gratis
            </>
          )}
        </button>

      </div>
    </div>
  )
}
