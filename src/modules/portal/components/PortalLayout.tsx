import { useNavigate, useLocation } from 'react-router-dom'
import { Home, Calendar, Star, FileText, User } from 'lucide-react'
import { usePortalCtx } from '../PortalApp'

const TABS = [
  { label: 'Inicio',     icon: Home,     path: ''           },
  { label: 'Reservas',   icon: Calendar, path: 'reservas'   },
  { label: 'Membresías', icon: Star,     path: 'membresias' },
  { label: 'Documentos', icon: FileText, path: 'documentos' },
  { label: 'Perfil',     icon: User,     path: 'perfil'     },
]

interface Props { children: React.ReactNode }

export function PortalLayout({ children }: Props) {
  const { restaurantId } = usePortalCtx()
  const navigate  = useNavigate()
  const location  = useLocation()

  const basePath = `/portal/${restaurantId}`

  const activePath = location.pathname.replace(basePath, '').replace(/^\//, '')

  const isActive = (path: string) =>
    path === ''
      ? activePath === '' || activePath === '/'
      : activePath.startsWith(path)

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: '#0F1115', maxWidth: 430, margin: '0 auto' }}
    >
      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pt-5 pb-24">
        {children}
      </div>

      {/* Bottom Nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 flex"
        style={{
          background: 'rgba(13,15,20,0.96)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(20px)',
          paddingBottom: 'env(safe-area-inset-bottom, 8px)',
          maxWidth: 430,
          margin: '0 auto',
          zIndex: 50,
        }}
      >
        {TABS.map(({ label, icon: Icon, path }) => {
          const active = isActive(path)
          return (
            <button
              key={path}
              onClick={() => navigate(path ? `${basePath}/${path}` : basePath)}
              className="flex-1 flex flex-col items-center gap-1 pt-3 pb-2 transition-opacity"
              style={{ opacity: active ? 1 : 0.4 }}
            >
              <Icon
                className="w-5 h-5"
                style={{ color: active ? '#F4705A' : 'rgba(255,255,255,0.6)' }}
                strokeWidth={active ? 2.5 : 1.75}
              />
              <span
                className="text-[10px] font-semibold"
                style={{ color: active ? '#F4705A' : 'rgba(255,255,255,0.5)' }}
              >
                {label}
              </span>
              {active && (
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full"
                  style={{ background: '#F4705A' }}
                />
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
