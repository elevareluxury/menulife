import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useDeliveryAuthStore } from '@/store/deliveryAuthStore'
import { useDrivers } from '../hooks/useDrivers'
import { DriverSelector } from '../components/DriverSelector'
import type { DeliveryDriver } from '@/types'
import toast from 'react-hot-toast'

const PIN_LENGTH = 4

export function DeliveryLogin() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { setAuth, isAuthenticated } = useDeliveryAuthStore()
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [restaurantName, setRestaurantName] = useState<string>('')
  const [step, setStep] = useState<'selector' | 'pin'>('selector')
  const [selectedDriver, setSelectedDriver] = useState<DeliveryDriver | null>(null)
  const [lastDriverId, setLastDriverId] = useState<string | null>(null)
  const [pinError, setPinError] = useState(false)

  const lastDriverKey = `menulife-last-driver-${slug}`
  const { drivers, loading: loadingDrivers } = useDrivers(restaurantId ?? undefined)
  const activeDrivers = drivers.filter(d => d.is_active)

  useEffect(() => {
    if (isAuthenticated()) {
      navigate(`/delivery/${slug}/app`, { replace: true })
    }
  }, [isAuthenticated, navigate, slug])

  useEffect(() => {
    if (!slug) return
    supabase
      .from('restaurants')
      .select('id, name')
      .eq('slug', slug)
      .single()
      .then(({ data }) => {
        if (data) {
          setRestaurantId(data.id)
          setRestaurantName(data.name ?? '')
        }
      })
    setLastDriverId(localStorage.getItem(lastDriverKey))
  }, [slug, lastDriverKey])

  const handleSelectDriver = (driver: DeliveryDriver) => {
    setSelectedDriver(driver)
    setPin('')
    setStep('pin')
  }

  const handleBack = () => {
    setStep('selector')
    setSelectedDriver(null)
    setPin('')
  }

  const handlePinInput = (digit: string) => {
    if (pin.length < 10) setPin(p => p + digit)
  }

  const handleDelete = () => setPin(p => p.slice(0, -1))

  const loginDirect = async (currentPin: string) => {
    if (!restaurantId || !selectedDriver) throw new Error('Datos incompletos')

    // Server-side PIN verification via DB RPC (hash never leaves DB)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: isValid, error: rpcError } = await (supabase as any).rpc('verify_staff_pin', {
      p_table: 'delivery_drivers',
      p_id: selectedDriver.id,
      p_pin: currentPin,
    })

    if (rpcError || !isValid) throw new Error('PIN incorrecto')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: driverRow, error } = await (supabase as any)
      .from('delivery_drivers')
      .select('id, first_name, last_name, phone, is_available')
      .eq('id', selectedDriver.id)
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .single()

    if (error || !driverRow) throw new Error('PIN incorrecto')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('delivery_drivers')
      .update({ is_available: true, last_login: new Date().toISOString() })
      .eq('id', driverRow.id)

    localStorage.setItem(lastDriverKey, selectedDriver.id)
    setAuth(`direct-${Date.now()}`, { ...driverRow, restaurant_id: restaurantId }, slug ?? '')
    toast.success(`Bienvenido ${driverRow.first_name}!`)
    navigate(`/delivery/${slug}/app`)
  }

  const handleSubmit = async () => {
    if (pin.length < PIN_LENGTH || pin.length > 10 || !restaurantId || !selectedDriver) {
      toast.error(`Ingresá tu PIN`)
      return
    }
    setLoading(true)
    try {
      await loginDirect(pin)
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

  useEffect(() => {
    if (pin.length === PIN_LENGTH && step === 'pin' && !loading) {
      handleSubmit()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin])

  const avatarColor = selectedDriver ? getColor(selectedDriver.id) : '#F77F00'

  return (
    <div style={{
      minHeight: '100vh', background: '#0F1115',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'fixed', top: '-150px', left: '50%', transform: 'translateX(-50%)',
        width: '500px', height: '300px', borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(247,127,0,0.1) 0%, transparent 70%)',
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
            background: '#F77F00',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: '18px',
            margin: '0 auto 12px',
          }}>🛵</div>
          <p style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '17px', color: '#fff', margin: '0 0 4px' }}>
            Repartidores
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
              background: s === step ? '#F77F00' : 'rgba(255,255,255,0.15)',
              transition: 'all 0.3s ease',
            }} />
          ))}
        </div>

        {step === 'selector' ? (
          <>
            <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '14px', color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: '16px' }}>
              ¿Quién sos?
            </p>
            <DriverSelector
              drivers={activeDrivers}
              loading={loadingDrivers || !restaurantId}
              lastDriverId={lastDriverId}
              onSelect={handleSelectDriver}
            />
          </>
        ) : (
          <>
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
                {selectedDriver && `${selectedDriver.first_name[0]}${selectedDriver.last_name[0]}`.toUpperCase()}
              </div>
              <p style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '16px', color: '#fff', margin: '0 0 2px' }}>
                Hola, {selectedDriver?.first_name}
              </p>
              <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
                Ingresá tu PIN
              </p>
            </div>

            {/* PIN dots */}
            <div style={{
              display: 'flex', justifyContent: 'center', gap: '10px',
              marginBottom: '28px',
              animation: pinError ? 'ml-shake 0.5s ease' : 'none',
            }}>
              {Array.from({ length: Math.max(PIN_LENGTH, pin.length) }, (_, i) => i).map((i) => (
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(digit => (
                <NumKey key={digit} label={digit.toString()} onClick={() => handlePinInput(digit.toString())} disabled={loading} accentColor={avatarColor} />
              ))}
              <NumKey label="⌫" onClick={handleDelete} disabled={loading} ghost accentColor={avatarColor} />
              <NumKey label="0" onClick={() => handlePinInput('0')} disabled={loading} accentColor={avatarColor} />
              <NumKey label={loading ? '…' : '✓'} onClick={handleSubmit} disabled={loading || pin.length < PIN_LENGTH} accent accentColor={avatarColor} />
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

function NumKey({ label, onClick, disabled, accent, ghost, accentColor }: {
  label: string
  onClick: () => void
  disabled?: boolean
  accent?: boolean
  ghost?: boolean
  accentColor: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        height: '58px', borderRadius: '50%', border: 'none',
        background: accent
          ? (disabled ? `${accentColor}4D` : accentColor)
          : ghost ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.07)',
        color: accent ? '#fff' : 'rgba(255,255,255,0.8)',
        fontSize: accent ? '18px' : '20px',
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: accent ? 'var(--font-syne)' : 'var(--font-jakarta)',
        transition: 'all 0.15s',
        userSelect: 'none',
        boxShadow: accent && !disabled ? `0 4px 16px ${accentColor}4D` : 'none',
      }}
      onMouseEnter={e => {
        if (!disabled) {
          e.currentTarget.style.transform = 'scale(1.06)'
          if (!accent) e.currentTarget.style.background = 'rgba(255,255,255,0.12)'
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = ''
        if (!accent) e.currentTarget.style.background = ghost ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.07)'
      }}
    >
      {label}
    </button>
  )
}

const AVATAR_COLORS = ['#F77F00', '#6C63FF', '#22C55E', '#3B82F6', '#F59E0B', '#EC4899', '#14B8A6', '#8B5CF6']
function getColor(id: string) {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) & 0xff
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}
