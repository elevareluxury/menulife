import { Bell, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGreeting } from '@/hooks/useGreeting'

type OperationalStatus = 'ok' | 'warning' | 'critical'

interface HeaderProps {
  businessName: string
  notificationCount?: number
  operationalStatus?: OperationalStatus
}

const statusConfig: Record<OperationalStatus, { text: string; cls: string }> = {
  ok:       { text: 'Todo funcionando correctamente', cls: 'text-ok' },
  warning:  { text: 'Hay pedidos pendientes',         cls: 'text-caution' },
  critical: { text: 'Requiere atención',               cls: 'text-danger' },
}

export function Header({ businessName, notificationCount = 0, operationalStatus = 'ok' }: HeaderProps) {
  const { text: greetingText, emoji } = useGreeting()
  const status = statusConfig[operationalStatus]

  return (
    <header className="px-4 pt-6 pb-2">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div
          className="w-10 h-10 rounded-full bg-surface-4 flex items-center justify-center flex-shrink-0 select-none"
          style={{ border: '1px solid var(--border-default)' }}
        >
          <span className="text-sm font-bold text-brand uppercase leading-none">
            {businessName.charAt(0)}
          </span>
        </div>

        {/* Saludo */}
        <div className="flex-1 min-w-0">
          <h1 className="text-[15px] font-semibold text-ink-1 leading-tight tracking-tight truncate">
            {greetingText}, {businessName} {emoji}
          </h1>
          <div className={cn('flex items-center gap-1.5 mt-0.5', status.cls)}>
            <span
              className="inline-block w-1.5 h-1.5 rounded-full bg-current opacity-80"
              style={{ flexShrink: 0 }}
            />
            <span className="text-[11px] font-medium">{status.text}</span>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            className="relative p-2 rounded-xl transition-colors hover:bg-surface-4 active:bg-surface-4"
            aria-label="Notificaciones"
          >
            <Bell className="w-5 h-5 text-ink-3" strokeWidth={2} />
            {notificationCount > 0 && (
              <span
                className="absolute top-1.5 right-1.5 min-w-[15px] h-[15px] bg-brand text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none"
                style={{ boxShadow: '0 0 8px rgba(255,107,122,0.5)' }}
              >
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </button>
          <button
            className="p-2 rounded-xl transition-colors hover:bg-surface-4 active:bg-surface-4"
            aria-label="Configuración"
          >
            <Settings className="w-5 h-5 text-ink-3" strokeWidth={2} />
          </button>
        </div>
      </div>
    </header>
  )
}
