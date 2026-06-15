import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, ArrowRight, UtensilsCrossed, ShoppingBag, Briefcase } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRestaurant } from '@/modules/menu/hooks/useRestaurant'
import { useRestaurantStore } from '@/store/restaurantStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import toast from 'react-hot-toast'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

const TOTAL_STEPS = 4
const LS_STEP_KEY = 'menulife_setup_step'
const LS_BTYPE_KEY = 'menulife_setup_btype'

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 flex-1">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
              i + 1 < step ? 'bg-emerald-500 text-white'
              : i + 1 === step ? 'text-white'
              : 'bg-gray-200 text-gray-400'
            }`}
            style={i + 1 === step ? { background: '#F4705A' } : undefined}
          >
            {i + 1 < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
          </div>
          {i < TOTAL_STEPS - 1 && (
            <div className={`h-1 flex-1 rounded-full transition-all ${i + 1 < step ? 'bg-emerald-500' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OnboardingFlow() {
  const navigate = useNavigate()
  const { restaurant, loading: restaurantLoading } = useRestaurant()
  const setStoreBusinessType = useRestaurantStore(s => s.setBusinessType)

  // Resume from saved step
  const [step, setStep] = useState(() => {
    const saved = parseInt(localStorage.getItem(LS_STEP_KEY) ?? '1', 10)
    return isNaN(saved) || saved < 1 || saved > 4 ? 1 : saved
  })
  const [saving, setSaving] = useState(false)

  // Step 1: business type
  const [businessType, setBusinessType] = useState<'gastronomy' | 'retail' | 'services'>(() =>
    (localStorage.getItem(LS_BTYPE_KEY) as 'gastronomy' | 'retail' | 'services' | null) ?? 'gastronomy'
  )

  // Step 2: basic info
  const [businessName, setBusinessName] = useState('')
  const [city, setCity] = useState('')
  const [phone, setPhone] = useState('')

  // Step 3: first section / category
  const [firstName, setFirstName] = useState('')

  // Pre-fill name from restaurant when loaded
  useEffect(() => {
    if (restaurant?.name) setBusinessName(restaurant.name)
    if (restaurant?.city) setCity(restaurant.city)
    if (restaurant?.phone) setPhone(restaurant.phone)
    if (restaurant?.business_type) setBusinessType(restaurant.business_type as 'gastronomy' | 'retail' | 'services')
  }, [restaurant])

  // Persist step to localStorage
  useEffect(() => {
    localStorage.setItem(LS_STEP_KEY, String(step))
  }, [step])

  // ── Save handlers ──────────────────────────────────────────────────────────

  const saveStep1 = async () => {
    if (!restaurant) return false
    setSaving(true)
    try {
      const { error } = await db
        .from('restaurants')
        .update({ business_type: businessType, setup_step: 1 })
        .eq('id', restaurant.id)
      if (error) throw error
      setStoreBusinessType(businessType)
      localStorage.setItem(LS_BTYPE_KEY, businessType)
      return true
    } catch {
      toast.error('Error al guardar tipo de negocio')
      return false
    } finally {
      setSaving(false)
    }
  }

  const saveStep2 = async () => {
    if (!businessName.trim()) { toast.error('Ingresá el nombre de tu negocio'); return false }
    if (!restaurant) return false
    setSaving(true)
    try {
      const { error } = await db
        .from('restaurants')
        .update({
          name: businessName.trim(),
          city: city.trim() || null,
          phone: phone.trim() || null,
          setup_step: 2,
        })
        .eq('id', restaurant.id)
      if (error) throw error
      return true
    } catch {
      toast.error('Error guardando datos')
      return false
    } finally {
      setSaving(false)
    }
  }

  const saveStep3 = async () => {
    if (!restaurant) return false
    setSaving(true)
    try {
      if (businessType === 'services') {
        await db.from('restaurants').update({ setup_step: 3 }).eq('id', restaurant.id)
        return true
      }
      if (!firstName.trim()) {
        toast.error(businessType === 'retail'
          ? 'Ingresá el nombre de la categoría'
          : 'Ingresá el nombre de la sección')
        setSaving(false)
        return false
      }
      if (businessType === 'retail') {
        const { error } = await db
          .from('product_categories')
          .insert({ restaurant_id: restaurant.id, name: firstName.trim(), sort_order: 0, is_active: true })
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('menu_sections')
          .insert({ restaurant_id: restaurant.id, name: firstName.trim(), sort_order: 0 })
        if (error) throw error
      }
      await db.from('restaurants').update({ setup_step: 3 }).eq('id', restaurant.id)
      return true
    } catch {
      toast.error('Error al crear el primer elemento')
      return false
    } finally {
      setSaving(false)
    }
  }

  const completeOnboarding = async () => {
    setSaving(true)
    try {
      await supabase
        .from('restaurants')
        .update({ onboarding_completed: true })
        .eq('id', restaurant!.id)
      localStorage.removeItem(LS_STEP_KEY)
      localStorage.removeItem(LS_BTYPE_KEY)
    } catch { /* non-fatal */ }
    finally { setSaving(false) }
  }

  const handleNext = async () => {
    let ok = true
    if (step === 1) ok = await saveStep1()
    if (step === 2) ok = await saveStep2()
    if (step === 3) ok = await saveStep3()
    if (ok) setStep(s => s + 1)
  }

  const handleFinish = async () => {
    await completeOnboarding()
    navigate('/dashboard')
  }

  // ── Guards ─────────────────────────────────────────────────────────────────

  if (restaurantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-1">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-1">
        <p className="text-gray-400">No se encontró el restaurante.</p>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

          {/* Header */}
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ background: '#F4705A' }}>M</div>
            <span className="font-bold text-gray-900 text-lg">MenuLife</span>
            <span className="ml-auto text-sm text-gray-400">Paso {step} de {TOTAL_STEPS}</span>
          </div>

          <ProgressBar step={step} />

          {/* ── STEP 1: Tipo de negocio ── */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">¿Qué tipo de negocio tenés?</h2>
              <p className="text-sm text-gray-500 mb-6">
                Esto personaliza tu panel de control y las herramientas disponibles.
              </p>

              <div className="grid grid-cols-1 gap-3 mb-6">
                {([
                  { mode: 'gastronomy' as const, icon: UtensilsCrossed, label: 'Gastronomía',  desc: 'Restaurante, bar, café, dark kitchen' },
                  { mode: 'retail'     as const, icon: ShoppingBag,     label: 'Retail',       desc: 'Tienda, comercio, showroom' },
                  { mode: 'services'   as const, icon: Briefcase,       label: 'Servicios',    desc: 'Psicólogos, coaches, gimnasios, estudios, talleres' },
                ] as const).map(({ mode, icon: Icon, label, desc }) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setBusinessType(mode)}
                    className="flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all"
                    style={{
                      borderColor: businessType === mode ? '#F4705A' : '#E5E7EB',
                      background: businessType === mode ? 'rgba(244,112,90,0.05)' : '#fff',
                    }}
                  >
                    <Icon className="w-6 h-6 flex-shrink-0" style={{ color: '#F4705A' }} />
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>

              <Button onClick={handleNext} isLoading={saving} className="w-full">
                Continuar <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {/* ── STEP 2: Info básica ── */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Información básica</h2>
              <p className="text-sm text-gray-500 mb-6">Completá los datos de tu negocio.</p>

              <div className="space-y-4">
                <Input
                  label="Nombre del negocio *"
                  placeholder="Ej: Forest Café"
                  value={businessName}
                  onChange={e => setBusinessName(e.target.value)}
                />
                <Input
                  label="Ciudad"
                  placeholder="Buenos Aires"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                />
                <Input
                  label="Teléfono / WhatsApp"
                  type="tel"
                  placeholder="+54 9 11 1234-5678"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>

              <div className="flex gap-3 mt-6">
                <Button variant="secondary" onClick={() => setStep(1)} className="flex-1">Atrás</Button>
                <Button onClick={handleNext} isLoading={saving} className="flex-1">
                  Continuar <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* ── STEP 3: First content ── */}
          {step === 3 && (
            <div>
              {businessType === 'services' ? (
                <>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">¡Tu espacio está listo!</h2>
                  <p className="text-sm text-gray-500 mb-6">
                    Configurá tu agenda, servicios y clientes desde el panel. Todo en un solo lugar.
                  </p>
                  <div className="space-y-2">
                    {[
                      { icon: '📅', label: 'Agenda inteligente', desc: 'Gestioná turnos y disponibilidad' },
                      { icon: '👥', label: 'Gestión de clientes', desc: 'Historial y seguimiento completo' },
                      { icon: '💼', label: 'Catálogo de servicios', desc: 'Definí duraciones y precios' },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50">
                        <span className="text-xl">{item.icon}</span>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                          <p className="text-xs text-gray-400">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : businessType === 'retail' ? (
                <>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">Primera categoría</h2>
                  <p className="text-sm text-gray-500 mb-6">
                    Creá una categoría para organizar tus productos. Después podés agregar más.
                  </p>
                  <Input
                    label="Nombre de la categoría *"
                    placeholder="Ropa, Electrónica, Accesorios..."
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                  />
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {['Ropa', 'Calzado', 'Accesorios', 'Electrónica', 'Hogar'].map(s => (
                      <button key={s} type="button" onClick={() => setFirstName(s)}
                        className="px-3 py-1 text-xs rounded-full border border-gray-200 text-gray-600 hover:border-[#F4705A] hover:text-[#F4705A] transition"
                      >{s}</button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">Primera sección del menú</h2>
                  <p className="text-sm text-gray-500 mb-6">
                    Creá una sección para agrupar tus platos. Después podés agregar productos.
                  </p>
                  <Input
                    label="Nombre de la sección *"
                    placeholder="Principales"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                  />
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {['Entradas', 'Principales', 'Postres', 'Bebidas'].map(s => (
                      <button key={s} type="button" onClick={() => setFirstName(s)}
                        className="px-3 py-1 text-xs rounded-full border border-gray-200 text-gray-600 hover:border-[#F4705A] hover:text-[#F4705A] transition"
                      >{s}</button>
                    ))}
                  </div>
                </>
              )}

              <div className="flex gap-3 mt-6">
                <Button variant="secondary" onClick={() => setStep(2)} className="flex-1">Atrás</Button>
                <Button onClick={handleNext} isLoading={saving} className="flex-1">
                  Continuar <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* ── STEP 4: Done ── */}
          {step === 4 && (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">¡Tu negocio está listo!</h2>
              <p className="text-gray-500 mb-8">
                Todo configurado. Ya podés empezar a usar tu panel de control.
              </p>
              <Button onClick={handleFinish} isLoading={saving} className="w-full">
                Ir al panel →
              </Button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
