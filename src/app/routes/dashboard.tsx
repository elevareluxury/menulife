import { Outlet, NavLink, Navigate } from 'react-router-dom'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { useRestaurant } from '@/modules/menu/hooks/useRestaurant'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { LogOut, UtensilsCrossed, LayoutDashboard, QrCode, ShoppingBag, Users, LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils'

export function DashboardPage() {
  const { loading, initialized, isAuthenticated, user, signOut } = useAuth()

  if (!initialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />

  const tabs = [
    { to: '/dashboard', end: true, label: 'Inicio', icon: LayoutDashboard },
    { to: '/dashboard/menu', end: false, label: 'Menú', icon: UtensilsCrossed },
    { to: '/dashboard/orders', end: false, label: 'Pedidos', icon: ShoppingBag },
    { to: '/dashboard/waiters', end: false, label: 'Mozos', icon: Users },
    { to: '/dashboard/tables', end: false, label: 'Mesas', icon: LayoutGrid },
    { to: '/dashboard/qr', end: false, label: 'QR', icon: QrCode },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-emerald-500">menulife</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 hidden sm:block">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Salir
            </Button>
          </div>
        </div>

        <div className="container mx-auto px-4">
          <nav className="flex gap-1">
            {tabs.map(({ to, end, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                    isActive
                      ? 'border-emerald-500 text-emerald-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}

export function DashboardHome() {
  const { restaurant } = useRestaurant()
  const kdsHref = `/kitchen/${restaurant?.slug ?? 'demo'}`

  return (
    <div>
      <h2 className="text-3xl font-bold mb-6">Inicio</h2>
      <div className="grid md:grid-cols-3 gap-6">
        {[
          { emoji: '📋', label: 'Menú', desc: 'Gestioná tus secciones y platos', href: '/dashboard/menu', external: false },
          { emoji: '🛒', label: 'Pedidos', desc: 'Gestiona pedidos en tiempo real', href: '/dashboard/orders', external: false },
          { emoji: '📱', label: 'QR', desc: 'Generá tu código QR', href: '/dashboard/qr', external: false },
          { emoji: '🍳', label: 'Cocina (KDS)', desc: 'Pantalla para la cocina', href: kdsHref, external: true },
          { emoji: '👤', label: 'Mozos', desc: 'Gestiona tu equipo', href: '/dashboard/waiters', external: false },
          { emoji: '🪑', label: 'Mesas', desc: 'Configura tu salón', href: '/dashboard/tables', external: false },
        ].map(({ emoji, label, desc, href, external }) =>
          href ? (
            external ? (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer">
                  <div className="text-3xl mb-3">{emoji}</div>
                  <h3 className="text-lg font-semibold mb-1">{label}</h3>
                  <p className="text-gray-500 text-sm">{desc}</p>
                </div>
              </a>
            ) : (
              <NavLink key={label} to={href}>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer">
                  <div className="text-3xl mb-3">{emoji}</div>
                  <h3 className="text-lg font-semibold mb-1">{label}</h3>
                  <p className="text-gray-500 text-sm">{desc}</p>
                </div>
              </NavLink>
            )
          ) : (
            <div key={label} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 opacity-50">
              <div className="text-3xl mb-3">{emoji}</div>
              <h3 className="text-lg font-semibold mb-1">{label}</h3>
              <p className="text-gray-500 text-sm">{desc}</p>
            </div>
          )
        )}
      </div>
    </div>
  )
}
