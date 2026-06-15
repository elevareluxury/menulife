import type { LucideIcon } from 'lucide-react'

interface ServiceEmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
}

export function ServiceEmptyState({ icon: Icon, title, description, action }: ServiceEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'rgba(244,112,90,0.10)' }}
      >
        <Icon className="w-7 h-7" style={{ color: '#F4705A' }} />
      </div>
      <p className="text-sm font-semibold text-white mb-1">{title}</p>
      {description && (
        <p className="text-xs max-w-[220px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold transition-opacity hover:opacity-80"
          style={{ background: '#F4705A', color: '#fff' }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
