import { Link } from 'react-router-dom'
import { LoginForm } from '@/modules/auth/components/LoginForm'
import { Card } from '@/components/ui/Card'

export function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">menulife</h1>
          <p className="text-gray-600">Iniciá sesión en tu cuenta</p>
        </div>

        <LoginForm />

        <p className="mt-6 text-center text-sm text-gray-600">
          ¿Querés unirte?{' '}
          <Link to="/solicitar-acceso" className="text-emerald-600 hover:underline font-medium">
            Solicitar acceso
          </Link>
        </p>

        {/* Acceso superadmin — discreto al pie */}
        <div className="mt-6 pt-4 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400">
            ¿Sos del equipo MenuLife?{' '}
            <Link to="/super-admin" className="text-gray-400 hover:text-gray-600 underline underline-offset-2">
              Acceder como admin →
            </Link>
          </p>
        </div>
      </Card>
    </div>
  )
}
