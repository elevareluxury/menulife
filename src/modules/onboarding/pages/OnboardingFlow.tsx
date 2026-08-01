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
import type { HubTemplateId } from '@/modules/hub/lib/hubTemplates'
import { HubTypeSelector } from '../components/HubTypeSelector'
import { createHubFromTemplate } from '@/modules/hub/lib/createHubFromTemplate'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

const TOTAL_STEPS = 5
const LS_STEP_KEY     = 'menulife_setup_step'
const LS_BTYPE_KEY    = 'menulife_setup_btype'
const LS_HTEMPLATE_KEY = 'menulife_setup_htemplate'

// Step numbers — named constants to avoid magic numbers
const STEP_BTYPE   = 1
const STEP_INFO    = 2
const STEP_HUBTYPE = 3
const STEP_SECTION = 4
const STEP_DONE    = 5

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 flex-1">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
              i + 1 < step  ? 'bg-emerald-500 text-white'
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
  const updateRestaurant = useRestaurantStore(s => s.updateRestaurant)

  // Resume from saved step
  const [step, setStep] = useState(() => {
    const saved = parseInt(localStorage.getItem(LS_STEP_KEY) ?? '1', 10)
    return isNaN(saved) || saved < 1 || saved > TOTAL_STEPS ? 1 : saved
  })
  const [saving, setSaving] = useState(false)

  // Step 1: business type
  const [businessType, setBusinessType] = useState<'gastronomy' | 'retail' | 'services'>(() =>
    (localStorage.getItem(LS_BTYPE_KEY) as 'gastronomy' | 'retail' | 'services' | null) ?? 'gastronomy'
  )

  // Step 2: basic info
  const [businessName, setBusinessName] = useState('')
  const [city, setCity]                 = useState('')
  const [phone, setPhone]               = useState('')

  // Step 3: hub template
  const [hubTemplate, setHubTemplate] = useState<HubTemplateId | null>(() => {
    const saved = localStorage.getItem(LS_HTEMPLATE_KEY)
    const valid: HubTemplateId[] = [
      'restaurant', 'services_pro', 'retail', 'artist',
      'coach', 'gym', 'individual'
    ]
    if (saved && valid.includes(saved as HubTemplateId)) {
      return saved as HubTemplateId
    }
    return null
  })

  // Step 4: first section / category
  const [firstName, setFirstName] = useState('')

  // Pre-fill from restaurant when loaded
  useEffect(() => {
    if (restaurant?.name)          setBusinessName(restaurant.name)
    if (restaurant?.city)          setCity(restaurant.city)
    if (restaurant?.phone)         setPhone(restaurant.phone)
    if (restaurant?.business_type) setBusinessType(restaurant.business_type as 'gastronomy' | 'retail' | 'services')
  }, [restaurant])

  // Persist step to localStorage
  useEffect(() => {
    localStorage.setItem(LS_STEP_KEY, String(step))
  }, [step])

  // Persist hub template selection
  useEffect(() => {
    if (hubTemplate) {
      localStorage.setItem(LS_HTEMPLATE_KEY, hubTemplate)
    }
  }, [hubTemplate])

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
      updateRestaurant({ business_type: businessType })
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
          name:       businessName.trim(),
          city:       city.trim() || null,
          phone:      phone.trim() || null,
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

  // Step 3 (hub type) — no DB write here, guardamos todo al finalizar
  const saveStep3 = () => {
    if (!hubTemplate) {
      toast.error('Elegí el tipo de Hub para continuar')
      return false
    }
    return true
  }

  const saveStep4 = async () => {
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
      localStorage.removeItem(LS_HTEMPLATE_KEY)
    } catch { /* non-fatal */ }
    finally { setSaving(false) }
  }

  const handleNext = async () => {
    let ok: boolean = true
    if (step === STEP_BTYPE)   ok = await saveStep1()
    if (step === STEP_INFO)    ok = await saveStep2()
    if (step === STEP_HUBTYPE) ok = saveStep3()
    if (step === STEP_SECTION) ok = await saveStep4()
    if (ok) setStep(s => s + 1)
  }

  const handleFinish = async () => {
    setSaving(true)
    try {
      await completeOnboarding()

      // Aplicar el template al Hub — non-blocking si falla
      if (hubTemplate && restaurant) {
        const result = await createHubFromTemplate(hubTemplate, restaurant.id)
        if (!result.success) {
          console.error('Error aplicando template de Hub:', result.error)
          // No bloquear al usuario — el Hub queda vacío y puede configurarse
          // manualmente desde el editor de bloques
        }
      }

      updateRestaurant({
        onboarding_completed: true,
        ...(hubTemplate ? { hub_category: hubTemplate } : {}),
      })

      navigate('/life')
    } finally {
      setSaving(false)
    }
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
          {step === STEP_BTYPE && (
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
                      background:  businessType === mode ? 'rgba(244,112,90,0.05)' : '#fff',
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
          {step === STEP_INFO && (
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
                <Button variant="secondary" onClick={() => setStep(STEP_BTYPE)} className="flex-1">Atrás</Button>
                <Button onClick={handleNext} isLoading={saving} className="flex-1">
                  Continuar <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Tipo de Hub ── */}
          {step === STEP_HUBTYPE && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">¿Qué tipo de Hub es?</h2>
              <p className="text-sm text-gray-500 mb-6">
                Vamos a preconfigurar tu ID con los bloques correctos para tu tipo de creador.
              </p>

              <HubTypeSelector value={hubTemplate} onChange={setHubTemplate} />

              <div className="flex gap-3 mt-6">
                <Button variant="secondary" onClick={() => setStep(STEP_INFO)} className="flex-1">Atrás</Button>
                <Button
                  onClick={handleNext}
                  disabled={!hubTemplate}
                  className="flex-1"
                >
                  Continuar <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* ── STEP 4: Primera sección / categoría ── */}
          {step === STEP_SECTION && (
            <div>
              {businessType === 'services' ? (
                <>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">¡Tu espacio está listo!</h2>
                  <p className="text-sm text-gray-500 mb-6">
                    Configurá tu agenda, servicios y clientes desde el panel. Todo en un solo lugar.
                  </p>
                  <div className="space-y-2">
                    {[
                      { icon: '📅', label: 'Agenda inteligente',    desc: 'Gestioná turnos y disponibilidad' },
                      { icon: '👥', label: 'Gestión de clientes',   desc: 'Historial y seguimiento completo' },
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
                <Button variant="secondary" onClick={() => setStep(STEP_HUBTYPE)} className="flex-1">Atrás</Button>
                <Button onClick={handleNext} isLoading={saving} className="flex-1">
                  Continuar <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* ── STEP 5: Done ── */}
          {step === STEP_DONE && (
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
