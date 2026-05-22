import { NavLink } from 'react-router-dom'
import { LayoutDashboard, UtensilsCrossed, LogOut } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Inicio', icon: LayoutDashboard, to: '/dashboard' },
  { label: 'Menú', icon: UtensilsCrossed, to: '/dashboard/menu' },
]

export function Sidebar() {
  const { user, signOut } = useAuthStore()

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-gray-200 bg-white">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-100">
        <span className="text-xl font-bold text-gray-900">
          menu<span className="text-emerald-500">life</span>
        </span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ label, icon: Icon, to }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-gray-100 p-4">
        <p className="text-xs text-gray-400 mb-2 truncate">{user?.email}</p>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
