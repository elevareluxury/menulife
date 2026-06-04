import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import bcrypt from 'bcryptjs'
import { supabase } from '@/lib/supabase'
import { useWaiterAuthStore } from '@/store/waiterAuthStore'
import { useWaiters } from '@/modules/waiters/hooks/useWaiters'
import { WaiterSelector } from '../components/WaiterSelector'
import { requestNotificationPermission, registerServiceWorker } from '@/lib/notifications'
import type { Waiter } from '@/types'
import toast from 'react-hot-toast'

export function WaiterLogin() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { setAuth, isAuthenticated } = useWaiterAuthStore()
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [restaurantName, setRestaurantName] = useState<string>('')
  const [step, setStep] = useState<'selector' | 'pin'>('selector')
  const [selectedWaiter, setSelectedWaiter] = useState<Waiter | null>(null)
  const [lastWaiterId, setLastWaiterId] = useState<string | null>(null)
  const [pinError, setPinError] = useState(false)
  const [restaurantError, setRestaurantError] = useState(false)

  const lastWaiterKey = `menulife-last-waiter-${slug}`
  const { waiters, loading: loadingWaiters } = useWaiters(restaurantId ?? undefined)
  const activeWaiters = waiters.filter(w => w.is_active)

  useEffect(() => {
    if (isAuthenticated()) {
      navigate(`/mozo/${slug}/app`, { replace: true })
    }
  }, [isAuthenticated, navigate, slug])

  useEffect(() => {
    if (!slug) return
    setLastWaiterId(localStorage.getItem(lastWaiterKey))
    supabase
      .from('restaurants')
      .select('id, name')
      .eq('slug', slug)
      .single()
      .then(({ data, error }) => {
        if (data && !error) {
          setRestaurantId(data.id)
          setRestaurantName(data.name ?? '')
        } else {
          setRestaurantError(true)
        }
      }, () => {
        setRestaurantError(true)
      })
  }, [slug, lastWaiterKey])

  const handleSelectWaiter = (waiter: Waiter) => {
    setSelectedWaiter(waiter)
    setPin('')
    setStep('pin')
  }

  const handleBack = () => {
    setStep('selector')
    setSelectedWaiter(null)
    setPin('')
  }

  const handlePinInput = (digit: string) => {
    if (pin.length < 10) setPin(p => p + digit)
  }

  const handleDelete = () => setPin(p => p.slice(0, -1))

  // Fallback: client-side bcrypt comparison when edge function isn't deployed
  const loginDirect = async (currentPin: string) => {
    if (!restaurantId || !selectedWaiter) throw new Error('Datos incompletos')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: waiterRow, error } = await (supabase as any)
      .from('waiters')
      .select('id, first_name, last_name, avatar_url, is_on_shift, pin, restaurant_id')
      .eq('id', selectedWaiter.id)
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .single()

    if (error || !waiterRow) throw new Error('PIN incorrecto')

    const storedPin: string = waiterRow.pin ?? ''
    const isHashed = storedPin.startsWith('$2')
    const isValid = isHashed
      ? await bcrypt.compare(currentPin, storedPin)
      : storedPin === currentPin

    if (!isValid) throw new Error('PIN incorrecto')

    // Migrate plain-text PIN to bcrypt hash on successful login
    if (!isHashed) {
      const hashed = await bcrypt.hash(currentPin, 10)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('waiters').update({ pin: hashed }).eq('id', waiterRow.id)
    }

    const { pin: _pin, ...mozo } = waiterRow
    localStorage.setItem(lastWaiterKey, selectedWaiter.id)
    setAuth(`direct-${Date.now()}`, mozo)
    // Registrar login y arrancar turno
    await (supabase as any).from('waiters').update({
      last_login: new Date().toISOString(),
      is_on_shift: true,
      shift_start: new Date().toISOString(),
    }).eq('id', mozo.id)
    try {
      await (supabase as any).from('waiter_activity_log').insert({
        restaurant_id: restaurantId,
        waiter_id: mozo.id,
        action: 'login',
      })
    } catch { /* non-critical */ }
    toast.success(`Bienvenido ${mozo.first_name}!`)
    requestNotificationPermission()
    registerServiceWorker()
    navigate(`/mozo/${slug}/app`)
  }

  const handleSubmit = async () => {
    if (pin.length < 4 || pin.length > 10 || !restaurantId || !selectedWaiter) {
      toast.error('Ingresá un PIN de 4 a 10 dígitos')
      return
    }
    setLoading(true)
    try {
      // Primary path: Supabase Edge Function (server-side bcrypt)
      let usedFallback = false
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL as string}/functions/v1/mozo-login`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY as string,
            },
            body: JSON.stringify({ pin, restaurant_id: restaurantId, waiter_id: selectedWaiter.id }),
          }
        )

        // Edge function not deployed (404) → use fallback
        if (response.status === 404) {
          usedFallback = true
        } else {
          const data = await response.json()
          if (!response.ok) throw new Error(data.error || 'PIN incorrecto')

          localStorage.setItem(lastWaiterKey, selectedWaiter.id)
          setAuth(data.token, data.mozo)
          // Registrar login y arrancar turno
          await (supabase as any).from('waiters').update({
            last_login: new Date().toISOString(),
            is_on_shift: true,
            shift_start: new Date().toISOString(),
          }).eq('id', data.mozo.id)
          try {
            await (supabase as any).from('waiter_activity_log').insert({
              restaurant_id: restaurantId,
              waiter_id: data.mozo.id,
              action: 'login',
            })
          } catch { /* non-critical */ }
          toast.success(`Bienvenido ${data.mozo.first_name}!`)
          requestNotificationPermission()
          registerServiceWorker()
          navigate(`/mozo/${slug}/app`)
          return
        }
      } catch (fetchErr) {
        // Network error (function not reachable) → use fallback
        const msg = fetchErr instanceof Error ? fetchErr.message : ''
        if (msg === 'Failed to fetch' || msg.includes('NetworkError') || msg.includes('network')) {
          usedFallback = true
        } else {
          throw fetchErr
        }
      }

      if (usedFallback) {
        await loginDirect(pin)
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'PIN incorrecto'
      toast.error(msg)
      setPinError(true)
      setPin('')
      setTimeout(() => setPinError(false), 600)
    } finally {
      setLoading(false)
    }
  }

  // Auto-submit when 6 digits entered (standard PIN length)
  useEffect(() => {
    if (pin.length === 6 && step === 'pin' && !loading) {
      handleSubmit()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin])

  const avatarColor = selectedWaiter ? getColor(selectedWaiter.id) : 'var(--ml-salmon)'

  return (
    <div style={{
      minHeight: '100vh', background: '#0F1115',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', position: 'relative', overflow: 'hidden',
    }}>
      {/* Top ambient glow */}
      <div style={{
        position: 'fixed', top: '-150px', left: '50%', transform: 'translateX(-50%)',
        width: '500px', height: '300px', borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(244,112,90,0.1) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        width: '100%', maxWidth: '380px',
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '24px', padding: '36px 28px',
        backdropFilter: 'blur(20px)',
        position: 'relative', zIndex: 1,
        animation: 'ml-fade-up 0.4s ease-out both',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '11px',
            background: 'var(--ml-salmon)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: '20px',
            margin: '0 auto 12px',
          }}>M</div>
          <p style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '17px', color: '#fff', margin: '0 0 4px' }}>
            menulife
          </p>
          {restaurantName && (
            <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
              {restaurantName}
            </p>
          )}
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '24px' }}>
          {(['selector', 'pin'] as const).map((s) => (
            <div key={s} style={{
              width: s === step ? '20px' : '6px', height: '6px',
              borderRadius: '3px',
              background: s === step ? 'var(--ml-salmon)' : 'rgba(255,255,255,0.15)',
              transition: 'all 0.3s ease',
            }} />
          ))}
        </div>

        {step === 'selector' ? (
          <>
            <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '14px', color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: '16px' }}>
              {restaurantError ? '⚠️ Restaurante no encontrado' : '¿Quién sos?'}
            </p>
            <WaiterSelector
              waiters={activeWaiters}
              loading={!restaurantError && (loadingWaiters || !restaurantId)}
              lastWaiterId={lastWaiterId}
              onSelect={handleSelectWaiter}
            />
          </>
        ) : (
          <>
            {/* Selected waiter avatar */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                width: '60px', height: '60px', borderRadius: '50%',
                background: avatarColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: '22px', fontWeight: 800,
                fontFamily: 'var(--font-syne)',
                margin: '0 auto 10px',
                boxShadow: `0 6px 20px ${avatarColor}50`,
              }}>
                {selectedWaiter && `${selectedWaiter.first_name[0]}${selectedWaiter.last_name[0]}`.toUpperCase()}
              </div>
              <p style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '16px', color: '#fff', margin: '0 0 2px' }}>
                Hola, {selectedWaiter?.first_name}
              </p>
              <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
                Ingresá tu PIN
              </p>
            </div>

            {/* PIN dots — show min 6 or however many digits entered */}
            <div
              style={{
                display: 'flex', justifyContent: 'center', gap: '10px',
                marginBottom: '28px',
                animation: pinError ? 'ml-shake 0.5s ease' : 'none',
              }}
            >
              {Array.from({ length: Math.max(6, pin.length) }, (_, i) => i).map(i => (
                <div key={i} style={{
                  width: '14px', height: '14px', borderRadius: '50%',
                  border: `2px solid ${pin.length > i ? avatarColor : 'rgba(255,255,255,0.2)'}`,
                  background: pin.length > i ? avatarColor : 'transparent',
                  transform: pin.length === i + 1 ? 'scale(1.15)' : 'scale(1)',
                  transition: 'all 0.15s cubic-bezier(0.34,1.56,0.64,1)',
                  boxShadow: pin.length > i ? `0 0 8px ${avatarColor}80` : 'none',
                }} />
              ))}
            </div>

            {/* Numpad */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(digit => (
                <NumKey
                  key={digit}
                  label={digit.toString()}
                  onClick={() => handlePinInput(digit.toString())}
                  disabled={loading}
                />
              ))}
              <NumKey label="⌫" onClick={handleDelete} disabled={loading} ghost />
              <NumKey label="0" onClick={() => handlePinInput('0')} disabled={loading} />
              <NumKey
                label={loading ? '…' : '✓'}
                onClick={handleSubmit}
                disabled={loading || pin.length < 4}
                accent
              />
            </div>

            <button
              onClick={handleBack}
              disabled={loading}
              style={{
                width: '100%', padding: '10px',
                background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '50px', color: 'rgba(255,255,255,0.4)',
                fontFamily: 'var(--font-jakarta)', fontSize: '13px', fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = 'rgba(255,255,255,0.65)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}
            >
              ← Volver
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function NumKey({ label, onClick, disabled, accent, ghost }: {
  label: string
  onClick: () => void
  disabled?: boolean
  accent?: boolean
  ghost?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        height: '58px', borderRadius: '50%',
        border: 'none',
        background: accent
          ? (disabled ? 'rgba(244,112,90,0.3)' : 'var(--ml-salmon)')
          : ghost
            ? 'rgba(255,255,255,0.04)'
            : 'rgba(255,255,255,0.07)',
        color: accent ? '#fff' : 'rgba(255,255,255,0.8)',
        fontSize: accent ? '18px' : '20px',
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: accent ? 'var(--font-syne)' : 'var(--font-jakarta)',
        transition: 'all 0.15s',
        userSelect: 'none',
        boxShadow: accent && !disabled ? '0 4px 16px rgba(244,112,90,0.3)' : 'none',
      }}
      onMouseEnter={e => {
        if (!disabled) {
          e.currentTarget.style.transform = 'scale(1.06)'
          if (!accent) e.currentTarget.style.background = 'rgba(255,255,255,0.12)'
          if (accent) e.currentTarget.style.boxShadow = '0 0 20px rgba(244,112,90,0.5)'
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = ''
        if (!accent) e.currentTarget.style.background = ghost ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.07)'
        if (accent) e.currentTarget.style.boxShadow = disabled ? 'none' : '0 4px 16px rgba(244,112,90,0.3)'
      }}
    >
      {label}
    </button>
  )
}

const AVATAR_COLORS = ['#F4705A', '#6C63FF', '#22C55E', '#3B82F6', '#F59E0B', '#EC4899', '#14B8A6', '#8B5CF6']
function getColor(id: string) {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) & 0xff
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}
