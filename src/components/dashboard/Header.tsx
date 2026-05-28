import { Bell, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useGreeting } from '@/hooks/useGreeting'

type OperationalStatus = 'ok' | 'warning' | 'critical'

interface HeaderProps {
  businessName: string
  notificationCount?: number
  operationalStatus?: OperationalStatus
  coverImageUrl?: string
}

const statusConfig: Record<OperationalStatus, { text: string; cls: string }> = {
  ok:       { text: 'Todo funcionando correctamente', cls: 'text-ok' },
  warning:  { text: 'Hay pedidos pendientes',         cls: 'text-caution' },
  critical: { text: 'Requiere atención',               cls: 'text-danger' },
}

export function Header({ businessName, notificationCount = 0, operationalStatus = 'ok', coverImageUrl }: HeaderProps) {
  const { text: greetingText, emoji } = useGreeting()
  const navigate = useNavigate()
  const status = statusConfig[operationalStatus]

  const content = (
    <div className="flex items-center gap-3">
      {/* Avatar */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 select-none"
        style={{
          background: coverImageUrl ? 'rgba(255,255,255,0.15)' : undefined,
          backgroundColor: coverImageUrl ? undefined : 'var(--surface-4, #1e2433)',
          border: '1px solid var(--border-default)',
          backdropFilter: coverImageUrl ? 'blur(8px)' : undefined,
        }}
      >
        <span className={cn('text-sm font-bold uppercase leading-none', coverImageUrl ? 'text-white' : 'text-brand')}>
          {businessName.charAt(0)}
        </span>
      </div>

      {/* Saludo */}
      <div className="flex-1 min-w-0">
        <h1 className={cn(
          'text-[15px] font-semibold leading-tight tracking-tight truncate',
          coverImageUrl ? 'text-white' : 'text-ink-1',
        )}>
          {greetingText}, {businessName} {emoji}
        </h1>
        <div className={cn('flex items-center gap-1.5 mt-0.5', coverImageUrl ? 'text-white/70' : status.cls)}>
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-current opacity-80 flex-shrink-0" />
          <span className="text-[11px] font-medium">{status.text}</span>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <button
          className={cn(
            'relative p-2 rounded-xl transition-colors',
            coverImageUrl ? 'hover:bg-white/15 active:bg-white/15' : 'hover:bg-surface-4 active:bg-surface-4',
          )}
          aria-label="Notificaciones"
        >
          <Bell className={cn('w-5 h-5', coverImageUrl ? 'text-white/80' : 'text-ink-3')} strokeWidth={2} />
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
          className={cn(
            'p-2 rounded-xl transition-colors',
            coverImageUrl ? 'hover:bg-white/15 active:bg-white/15' : 'hover:bg-surface-4 active:bg-surface-4',
          )}
          aria-label="Configuración"
          onClick={() => navigate('/dashboard/settings')}
        >
          <Settings className={cn('w-5 h-5', coverImageUrl ? 'text-white/80' : 'text-ink-3')} strokeWidth={2} />
        </button>
      </div>
    </div>
  )

  if (coverImageUrl) {
    return (
      <header className="relative overflow-hidden rounded-2xl mx-4 mt-6 mb-2">
        {/* Cover image */}
        <img
          src={coverImageUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          aria-hidden="true"
        />
        {/* Dark overlay */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, rgba(15,17,21,0.82) 0%, rgba(15,17,21,0.65) 100%)' }}
        />
        {/* Content */}
        <div className="relative px-4 pt-5 pb-4">
          {content}
        </div>
      </header>
    )
  }

  return (
    <header className="px-4 pt-6 pb-2">
      {content}
    </header>
  )
}
