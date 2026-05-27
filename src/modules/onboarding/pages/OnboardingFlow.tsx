import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, ArrowRight, Sparkles, ExternalLink } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRestaurant } from '@/modules/menu/hooks/useRestaurant'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { APP_URL } from '@/lib/constants'
import toast from 'react-hot-toast'

const TOTAL_STEPS = 4

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 flex-1">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
              i + 1 < step
                ? 'bg-emerald-500 text-white'
                : i + 1 === step
                ? 'bg-orange-500 text-white'
                : 'bg-gray-200 text-gray-400'
            }`}
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

export function OnboardingFlow() {
  const navigate = useNavigate()
  const { restaurant, loading: restaurantLoading } = useRestaurant()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)

  // Step 2 state
  const [businessName, setBusinessName] = useState('')
  const [city, setCity] = useState('')
  const [phone, setPhone] = useState('')
  const [description, setDescription] = useState('')

  // Step 3 state
  const [sectionName, setSectionName] = useState('')
  const [itemName, setItemName] = useState('')
  const [itemPrice, setItemPrice] = useState('')

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

  const saveStep2 = async () => {
    if (!businessName.trim()) { toast.error('Ingresá el nombre de tu negocio'); return false }
    setSaving(true)
    try {
      const { error } = await supabase
        .from('restaurants')
        .update({
          name: businessName.trim(),
          city: city.trim() || null,
          phone: phone.trim() || null,
          description: description.trim() || null,
        })
        .eq('id', restaurant.id)

      if (error) throw error
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error guardando datos')
      return false
    } finally {
      setSaving(false)
    }
  }

  const saveStep3 = async () => {
    if (!sectionName.trim()) { toast.error('Ingresá el nombre de la sección'); return false }
    if (!itemName.trim()) { toast.error('Ingresá el nombre del producto'); return false }
    const price = parseFloat(itemPrice)
    if (isNaN(price) || price < 0) { toast.error('Ingresá un precio válido'); return false }

    setSaving(true)
    try {
      // Create section
      const { data: sectionData, error: sectionError } = await supabase
        .from('menu_sections')
        .insert({
          restaurant_id: restaurant.id,
          name: sectionName.trim(),
          sort_order: 0,
        })
        .select()
        .single()

      if (sectionError) throw sectionError

      // Create first item
      const { error: itemError } = await supabase
        .from('menu_items')
        .insert({
          restaurant_id: restaurant.id,
          section_id: sectionData.id,
          name: itemName.trim(),
          price_ars: price,
          price_usd: 0,
          image_url: '',
          sort_order: 0,
          is_available: true,
          allergens: [],
          tags: [],
        })

      if (itemError) throw itemError
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error creando sección')
      return false
    } finally {
      setSaving(false)
    }
  }

  const completeOnboarding = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('restaurants')
        .update({ onboarding_completed: true })
        .eq('id', restaurant.id)
      if (error) throw error
    } catch {
      // Non-fatal: navigate anyway
    } finally {
      setSaving(false)
    }
  }

  const handleNext = async () => {
    if (step === 2) {
      const ok = await saveStep2()
      if (!ok) return
    }
    if (step === 3) {
      const ok = await saveStep3()
      if (!ok) return
    }
    setStep(s => s + 1)
  }

  const handleFinish = async () => {
    await completeOnboarding()
    navigate('/dashboard')
  }

  const menuUrl = `${APP_URL}/r/${restaurant.slug}`

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-400 rounded-lg flex items-center justify-center text-white font-bold text-sm">M</div>
            <span className="font-bold text-gray-900 text-lg">MenuLife</span>
            <span className="ml-auto text-sm text-gray-400">Paso {step} de {TOTAL_STEPS}</span>
          </div>

          <ProgressBar step={step} />

          {/* ─── Step 1: Welcome ─── */}
          {step === 1 && (
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <Sparkles className="w-8 h-8 text-orange-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                ¡Bienvenido a MenuLife!
              </h2>
              <p className="text-gray-500 mb-2">
                Hola, <strong className="text-gray-800">{restaurant.name}</strong>.
              </p>
              <p className="text-gray-500 mb-8">
                En 4 pasos rápidos dejamos tu negocio listo para el mundo digital.
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm mb-8">
                {[
                  { step: '1', label: 'Bienvenida', done: true },
                  { step: '2', label: 'Info básica', done: false },
                  { step: '3', label: 'Primer plato', done: false },
                  { step: '4', label: '¡Listo!', done: false },
                ].map(s => (
                  <div key={s.step} className={`p-3 rounded-xl border text-left ${s.done ? 'bg-orange-50 border-orange-100' : 'bg-gray-50 border-gray-100'}`}>
                    <span className={`text-xs font-bold ${s.done ? 'text-orange-500' : 'text-gray-400'}`}>Paso {s.step}</span>
                    <p className={`font-medium mt-0.5 ${s.done ? 'text-orange-700' : 'text-gray-600'}`}>{s.label}</p>
                  </div>
                ))}
              </div>
              <Button onClick={() => setStep(2)} className="w-full">
                Comenzar
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {/* ─── Step 2: Basic info ─── */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Información básica</h2>
              <p className="text-sm text-gray-500 mb-6">Completá los datos de tu negocio.</p>

              <div className="space-y-4">
                <Input
                  label="Nombre del negocio *"
                  placeholder={restaurant.name}
                  value={businessName || restaurant.name}
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Descripción breve</label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Un café con onda en el centro de Palermo..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none bg-white text-gray-900"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button variant="secondary" onClick={() => setStep(1)} className="flex-1">Atrás</Button>
                <Button onClick={handleNext} isLoading={saving} className="flex-1">
                  Continuar <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* ─── Step 3: First section + item ─── */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Tu primer plato</h2>
              <p className="text-sm text-gray-500 mb-6">
                Creá una sección y agrega tu primer producto para que el menú tenga contenido.
              </p>

              <div className="space-y-4">
                <div>
                  <Input
                    label="Nombre de la sección *"
                    placeholder="Principales"
                    value={sectionName}
                    onChange={e => setSectionName(e.target.value)}
                  />
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {['Entradas', 'Principales', 'Postres', 'Bebidas'].map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSectionName(s)}
                        className="px-3 py-1 text-xs rounded-full border border-gray-200 text-gray-600 hover:border-orange-400 hover:text-orange-500 transition"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <Input
                  label="Nombre del producto *"
                  placeholder="Milanesa napolitana"
                  value={itemName}
                  onChange={e => setItemName(e.target.value)}
                />
                <Input
                  label="Precio (ARS) *"
                  type="number"
                  placeholder="2500"
                  value={itemPrice}
                  onChange={e => setItemPrice(e.target.value)}
                />
              </div>

              <div className="flex gap-3 mt-6">
                <Button variant="secondary" onClick={() => setStep(2)} className="flex-1">Atrás</Button>
                <Button onClick={handleNext} isLoading={saving} className="flex-1">
                  Continuar <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* ─── Step 4: Done ─── */}
          {step === 4 && (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">¡Tu negocio está listo!</h2>
              <p className="text-gray-500 mb-6">
                Tu menú digital ya está online. Compartí el link con tus clientes.
              </p>

              <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-6">
                <p className="text-sm text-gray-500 mb-2">Tu link del menú:</p>
                <div className="flex items-center justify-center gap-2">
                  <code className="text-sm font-mono text-orange-700 bg-white px-3 py-1 rounded-lg border border-orange-200">
                    {menuUrl}
                  </code>
                  <a
                    href={menuUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-orange-500 hover:bg-orange-100 transition"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <a href={menuUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="secondary" className="w-full">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Ver mi menú
                  </Button>
                </a>
                <Button onClick={handleFinish} isLoading={saving} className="w-full">
                  Ir al dashboard →
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
