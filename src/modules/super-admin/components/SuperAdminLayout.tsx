import { type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { Shield, LogOut, LayoutDashboard, Store } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/super-admin' },
  { label: 'Restaurantes', icon: Store, to: '/super-admin/restaurants' },
]

export function SuperAdminLayout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuthStore()

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="flex h-screen w-64 flex-col border-r border-gray-800 bg-gray-900 text-white">
        <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-700">
          <Shield className="h-5 w-5 text-emerald-400" />
          <span className="text-sm font-bold uppercase tracking-wider text-emerald-400">Super Admin</span>
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
                  isActive ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white',
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-gray-700 p-4">
          <p className="text-xs text-gray-500 mb-2 truncate">{user?.email}</p>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-gray-50 p-8">
        {children}
      </main>
    </div>
  )
}
