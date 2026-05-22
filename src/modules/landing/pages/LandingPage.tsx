import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-emerald-500 to-blue-500 bg-clip-text text-transparent">
            menulife
          </h1>

          <p className="text-2xl text-gray-700 mb-8">
            Tu menú digital, siempre actualizado
          </p>

          <p className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto">
            El sistema de menú digital más completo para restaurantes argentinos.
            Actualizá precios en segundos, gestioná pedidos, mozos y delivery.
          </p>

          <div className="flex gap-4 justify-center mb-16">
            <Link to="/register">
              <Button size="lg">Prueba gratis 14 días</Button>
            </Link>
            <Link to="/login">
              <Button variant="secondary" size="lg">Iniciar sesión</Button>
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mt-16">
            {[
              { emoji: '📱', title: 'Sin app necesaria', desc: 'Tus clientes escanean el QR y ya están viendo el menú' },
              { emoji: '⚡', title: 'Actualización instantánea', desc: 'Cambiá precios y disponibilidad en segundos desde cualquier dispositivo' },
              { emoji: '🍽️', title: 'Sistema completo', desc: 'Pedidos, cocina, mozos, mesas y delivery en una sola plataforma' },
            ].map(({ emoji, title, desc }) => (
              <div key={title} className="bg-white p-6 rounded-lg shadow-sm">
                <div className="text-4xl mb-4">{emoji}</div>
                <h3 className="text-xl font-semibold mb-2">{title}</h3>
                <p className="text-gray-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
