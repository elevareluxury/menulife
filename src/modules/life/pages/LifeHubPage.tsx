import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Globe, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useLifeStore } from '@/store/lifeStore'
import { useRestaurant } from '@/modules/menu/hooks/useRestaurant'
import { Spinner } from '@/components/ui/Spinner'
import HubPage from '@/modules/hub/pages/HubPage'
import { colors, font, radius } from '../design-system'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
}

export function LifeHubPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { setHasRestaurant, setRestaurantName, setRestaurantSlug } = useLifeStore()
  const { restaurant, loading } = useRestaurant()
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (loading && !created) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0A0B0F',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Spinner size="lg" />
      </div>
    )
  }

  // User already has a restaurant (existing or just created) — show hub editor
  if (restaurant || created) {
    return <HubPage />
  }

  const slug = slugify(name)
  const canCreate = name.trim().length >= 2 && !creating

  const handleCreate = async () => {
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
        })
        .select('id,name,slug')
        .single()
      if (err) throw err
      setHasRestaurant(true)
      setRestaurantName(data.name)
      setRestaurantSlug(data.slug)
      setCreated(true)
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? 'Error al crear el hub'
      setError(
        msg.includes('duplicate') || msg.includes('unique')
          ? 'Ese nombre o URL ya está en uso, prueba otro.'
          : msg,
      )
      setCreating(false)
    }
  }

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
          Crear Hub Digital
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
            Tu presencia en la web
          </p>
          <p style={{
            fontFamily: font, fontSize: '13px', color: colors.text.secondary,
            margin: 0, lineHeight: 1.55,
          }}>
            Crea tu hub digital gratuito. Comparte tu historia, links y lo que quieras con una URL única.
          </p>
        </div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
            onKeyDown={e => { if (e.key === 'Enter' && canCreate) handleCreate() }}
            style={{
              width: '100%', padding: '12px 16px', boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${error ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: radius.lg,
              color: colors.text.primary, fontFamily: font, fontSize: '15px',
              outline: 'none',
            }}
          />

          {slug.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '9px 13px', borderRadius: radius.lg,
              background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.13)',
            }}>
              <Globe size={13} style={{ color: '#818CF8', flexShrink: 0 }} strokeWidth={2} />
              <span style={{ fontFamily: font, fontSize: '12px', color: colors.text.tertiary }}>
                tu URL:&nbsp;
              </span>
              <span style={{ fontFamily: font, fontSize: '12px', fontWeight: 700, color: '#818CF8' }}>
                /{slug}
              </span>
            </div>
          )}

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
                <div
                  className="animate-spin"
                  style={{
                    width: 16, height: 16, borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.25)',
                    borderTopColor: '#fff',
                  }}
                />
                Creando...
              </>
            ) : (
              <>
                <Sparkles size={16} strokeWidth={2.3} />
                Crear mi hub gratis
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  )
}
