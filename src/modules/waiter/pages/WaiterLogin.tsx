import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
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
  const [step, setStep] = useState<'selector' | 'pin'>('selector')
  const [selectedWaiter, setSelectedWaiter] = useState<Waiter | null>(null)
  const [lastWaiterId, setLastWaiterId] = useState<string | null>(null)

  const lastWaiterKey = `menulife-last-waiter-${slug}`
  const { waiters, loading: loadingWaiters } = useWaiters(restaurantId ?? undefined)
  const activeWaiters = waiters.filter(w => w.is_active)

  useEffect(() => {
    if (isAuthenticated()) {
      navigate(`/waiter/${slug}/dashboard`, { replace: true })
    }
  }, [isAuthenticated, navigate, slug])

  useEffect(() => {
    if (!slug) return
    supabase
      .from('restaurants')
      .select('id')
      .eq('slug', slug)
      .single()
      .then(({ data }) => { if (data) setRestaurantId(data.id) })
    setLastWaiterId(localStorage.getItem(lastWaiterKey))
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
    if (pin.length < 6) setPin(p => p + digit)
  }

  const handleSubmit = async () => {
    if (pin.length !== 6 || !restaurantId || !selectedWaiter) {
      toast.error('Ingresa un PIN de 6 dígitos')
      return
    }
    setLoading(true)
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
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Error al iniciar sesión')

      localStorage.setItem(lastWaiterKey, selectedWaiter.id)
      setAuth(data.token, data.mozo)
      toast.success(`Bienvenido ${data.mozo.first_name}!`)

      // Request notification permission and register SW after successful login
      requestNotificationPermission()
      registerServiceWorker()

      navigate(`/waiter/${slug}/dashboard`)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'PIN incorrecto')
      setPin('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-600 to-emerald-900 flex items-center justify-center p-4">
      <Card className="max-w-sm w-full p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-emerald-600 mb-2">menulife</h1>
          <p className="text-gray-600">
            {step === 'selector' ? '¿Quién sos?' : `Hola, ${selectedWaiter?.first_name}`}
          </p>
        </div>

        {step === 'selector' ? (
          <WaiterSelector
            waiters={activeWaiters}
            loading={loadingWaiters || !restaurantId}
            lastWaiterId={lastWaiterId}
            onSelect={handleSelectWaiter}
          />
        ) : (
          <>
            {/* PIN Display */}
            <div className="flex justify-center gap-2 mb-8">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center text-xl font-bold transition-colors ${
                    pin.length > i
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : 'border-gray-300 bg-gray-50'
                  }`}
                >
                  {pin.length > i ? '•' : ''}
                </div>
              ))}
            </div>

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                <button
                  key={digit}
                  onClick={() => handlePinInput(digit.toString())}
                  disabled={loading}
                  className="h-16 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-xl text-2xl font-semibold transition-colors disabled:opacity-50 select-none"
                >
                  {digit}
                </button>
              ))}
              <button
                onClick={() => setPin(p => p.slice(0, -1))}
                disabled={loading}
                className="h-16 bg-gray-100 hover:bg-gray-200 rounded-xl text-xl font-semibold transition-colors disabled:opacity-50 select-none"
              >
                ⌫
              </button>
              <button
                onClick={() => handlePinInput('0')}
                disabled={loading}
                className="h-16 bg-gray-100 hover:bg-gray-200 rounded-xl text-2xl font-semibold transition-colors disabled:opacity-50 select-none"
              >
                0
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || pin.length !== 6}
                className="h-16 bg-emerald-500 text-white rounded-xl text-xl font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed select-none"
              >
                {loading ? '…' : '✓'}
              </button>
            </div>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={handleBack}
                disabled={loading}
                className="flex-1"
              >
                ← Volver
              </Button>
              <Button
                variant="ghost"
                onClick={() => setPin('')}
                disabled={loading}
                className="flex-1"
              >
                Limpiar
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
