import { NavLink } from 'react-router-dom'
import {
  Home, ShoppingBag, LayoutGrid, UtensilsCrossed,
  QrCode, Users, ChefHat, LogOut, type LucideIcon,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

interface NavItemDef {
  to: string
  icon: LucideIcon
  label: string
  exact?: boolean
}

const navItems: NavItemDef[] = [
  { to: '/dashboard',          icon: Home,            label: 'Inicio',  exact: true },
  { to: '/dashboard/orders',   icon: ShoppingBag,     label: 'Pedidos' },
  { to: '/dashboard/tables',   icon: LayoutGrid,      label: 'Mesas' },
  { to: '/dashboard/menu',     icon: UtensilsCrossed, label: 'Menú' },
  { to: '/dashboard/qr',       icon: QrCode,          label: 'QR' },
  { to: '/dashboard/waiters',  icon: Users,           label: 'Mozos' },
]

interface SidebarProps {
  restaurantSlug?: string
}

export function Sidebar({ restaurantSlug }: SidebarProps) {
  const { signOut } = useAuthStore()

  return (
    <aside
      className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-60 flex-col"
      style={{
        background: '#13161C',
        borderRight: '1px solid var(--border-subtle)',
      }}
    >
      {/* Logo */}
      <div
        className="px-5 py-5"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <span className="text-[18px] font-bold text-ink-1 tracking-tight">
          menu<span className="text-brand">life</span>
        </span>
        <p className="text-[10px] text-ink-3 mt-1 font-medium uppercase tracking-widest">
          Panel de control
        </p>
      </div>

      {/* Navegación */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors duration-150',
                isActive
                  ? 'bg-brand-dim text-brand'
                  : 'text-ink-3 hover:text-ink-1 hover:bg-surface-3'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={cn('w-[17px] h-[17px] flex-shrink-0', isActive ? 'text-brand' : 'text-ink-3')}
                  strokeWidth={isActive ? 2.2 : 2}
                />
                {label}
              </>
            )}
          </NavLink>
        ))}

        {/* Pantallas externas */}
        {restaurantSlug && (
          <>
            <p className="px-3 pt-5 pb-1.5 text-[10px] font-semibold text-ink-4 uppercase tracking-widest">
              Pantallas
            </p>
            <a
              href={`/kitchen/${restaurantSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-ink-3 hover:text-ink-1 hover:bg-surface-3 transition-colors duration-150"
            >
              <ChefHat className="w-[17px] h-[17px] flex-shrink-0" strokeWidth={2} />
              Cocina (KDS)
            </a>
          </>
        )}
      </nav>

      {/* Cerrar sesión */}
      <div
        className="px-3 py-4"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        <button
          onClick={() => signOut()}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-[13px] font-medium text-ink-3 hover:text-danger hover:bg-danger-dim transition-colors duration-150"
        >
          <LogOut className="w-[17px] h-[17px] flex-shrink-0" strokeWidth={2} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
