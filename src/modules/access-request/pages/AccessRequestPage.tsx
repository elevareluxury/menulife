import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface FormData {
  name: string
  email: string
  business_name: string
  phone: string
  city: string
  message: string
}

const EMPTY: FormData = { name: '', email: '', business_name: '', phone: '', city: '', message: '' }

function Field({
  label, name, type = 'text', placeholder, required, value, onChange, maxLength,
}: {
  label: string
  name: string
  type?: string
  placeholder?: string
  required?: boolean
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  maxLength?: number
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label} {required && <span className="text-orange-500">*</span>}
      </label>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        required={required}
        value={value}
        onChange={onChange}
        maxLength={maxLength}
        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition text-sm bg-white"
      />
    </div>
  )
}

export function AccessRequestPage() {
  const [form, setForm] = useState<FormData>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState('')

  const update = (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }))

  const validate = (): boolean => {
    if (form.name.trim().length < 2) {
      toast.error('El nombre debe tener al menos 2 caracteres')
      return false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      toast.error('Ingresá un email válido')
      return false
    }
    if (!form.business_name.trim()) {
      toast.error('El nombre del negocio es requerido')
      return false
    }
    if (form.message.length > 500) {
      toast.error('El mensaje no puede superar los 500 caracteres')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      const { error } = await supabase.from('access_requests').insert({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        business_name: form.business_name.trim(),
        phone: form.phone.trim() || null,
        city: form.city.trim() || null,
        message: form.message.trim() || null,
      })

      if (error) {
        if (error.code === '23505') {
          toast.error('Ya existe una solicitud con ese email. Te avisamos pronto.')
          return
        }
        throw error
      }

      setSubmittedEmail(form.email.trim().toLowerCase())
      setSubmitted(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al enviar la solicitud')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">¡Solicitud enviada!</h2>
          <p className="text-gray-500 mb-2">
            Revisamos tu solicitud en menos de 24 horas.
          </p>
          <p className="text-gray-500 mb-6">
            Te avisamos a: <span className="font-semibold text-gray-800">{submittedEmail}</span>
          </p>
          <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 mb-8">
            <p className="text-sm text-orange-700">
              Mientras tanto, seguinos en{' '}
              <a
                href="https://instagram.com/menulife.app"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline"
              >
                @menulife.app
              </a>
            </p>
          </div>
          <Link to="/" className="text-sm text-gray-400 hover:text-gray-600 transition">
            ← Volver al inicio
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header band */}
      <div className="bg-gray-900 py-10 px-4 text-center">
        <Link to="/" className="inline-flex items-center gap-2 mb-6">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-400 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            M
          </div>
          <span className="text-white font-bold text-xl">MenuLife</span>
        </Link>
        <h1 className="text-3xl font-bold text-white mb-2">
          Transformá tu negocio con
        </h1>
        <p className="text-orange-400 font-semibold text-xl">
          software digital inteligente
        </p>
        <p className="text-gray-400 text-sm mt-3 max-w-sm mx-auto">
          Menú digital, pedidos, mozos y más — todo en una sola plataforma.
          Completá el formulario y te contactamos en 24hs.
        </p>
      </div>

      {/* Form */}
      <div className="max-w-lg mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Solicitar acceso gratuito</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Field
              label="Tu nombre"
              name="name"
              placeholder="Juan Pérez"
              required
              value={form.name}
              onChange={e => update('name')(e as React.ChangeEvent<HTMLInputElement>)}
            />
            <Field
              label="Email"
              name="email"
              type="email"
              placeholder="juan@tucafe.com"
              required
              value={form.email}
              onChange={e => update('email')(e as React.ChangeEvent<HTMLInputElement>)}
            />
            <Field
              label="Nombre del negocio"
              name="business_name"
              placeholder="Forest Café"
              required
              value={form.business_name}
              onChange={e => update('business_name')(e as React.ChangeEvent<HTMLInputElement>)}
            />
            <Field
              label="Teléfono / WhatsApp"
              name="phone"
              type="tel"
              placeholder="+54 9 11 1234-5678"
              value={form.phone}
              onChange={e => update('phone')(e as React.ChangeEvent<HTMLInputElement>)}
            />
            <Field
              label="Ciudad"
              name="city"
              placeholder="Buenos Aires"
              value={form.city}
              onChange={e => update('city')(e as React.ChangeEvent<HTMLInputElement>)}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                ¿Algo más que quieras contarnos?
                <span className="text-gray-400 font-normal ml-1">({form.message.length}/500)</span>
              </label>
              <textarea
                value={form.message}
                onChange={update('message')}
                placeholder="Tenemos un café con 20 mesas y queremos digitalizar el servicio..."
                rows={4}
                maxLength={500}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition text-sm bg-white resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold rounded-xl transition text-base shadow-md shadow-orange-500/20"
            >
              {loading ? 'Enviando...' : 'Solicitar acceso gratuito'}
            </button>

            <p className="text-xs text-center text-gray-400">
              Sin tarjeta de crédito. 14 días de prueba gratis.
            </p>
          </form>
        </div>

        <p className="text-center mt-6 text-sm text-gray-500">
          ¿Ya tenés cuenta?{' '}
          <Link to="/login" className="text-orange-500 hover:underline font-medium">
            Iniciá sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
