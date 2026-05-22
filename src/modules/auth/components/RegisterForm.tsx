import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { generateSlug } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ROUTES } from '@/lib/constants'
import toast from 'react-hot-toast'

export function RegisterForm() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ email: '', password: '', restaurantName: '' })
  const [loading, setLoading] = useState(false)

  const update = (field: keyof typeof formData) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setFormData((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      })
      if (authError) throw authError
      if (!authData.user) throw new Error('No se pudo crear el usuario')

      const { error: restaurantError } = await supabase
        .from('restaurants')
        .insert({
          owner_id: authData.user.id,
          slug: generateSlug(formData.restaurantName),
          name: formData.restaurantName,
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        })
      if (restaurantError) throw restaurantError

      toast.success('¡Cuenta creada! Revisá tu email para confirmar.')
      navigate(ROUTES.DASHBOARD)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Error al registrarse')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Nombre del restaurante"
        placeholder="La Farola"
        value={formData.restaurantName}
        onChange={update('restaurantName')}
        required
      />
      <Input
        type="email"
        label="Email"
        placeholder="tu@email.com"
        value={formData.email}
        onChange={update('email')}
        required
        autoComplete="email"
      />
      <Input
        type="password"
        label="Contraseña"
        placeholder="••••••••"
        value={formData.password}
        onChange={update('password')}
        required
        minLength={6}
        autoComplete="new-password"
      />
      <Button type="submit" className="w-full" isLoading={loading}>
        Crear cuenta
      </Button>
      <p className="text-sm text-gray-500 text-center">
        14 días de prueba gratis. No necesitás tarjeta de crédito.
      </p>
    </form>
  )
}
