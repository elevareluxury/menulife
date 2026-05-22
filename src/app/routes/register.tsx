import { Link } from 'react-router-dom'
import { RegisterForm } from '@/modules/auth/components/RegisterForm'
import { Card } from '@/components/ui/Card'

export function RegisterPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">menulife</h1>
          <p className="text-gray-600">Creá tu cuenta</p>
        </div>

        <RegisterForm />

        <p className="mt-6 text-center text-sm text-gray-600">
          ¿Ya tenés cuenta?{' '}
          <Link to="/login" className="text-emerald-600 hover:underline font-medium">
            Iniciá sesión
          </Link>
        </p>
      </Card>
    </div>
  )
}
