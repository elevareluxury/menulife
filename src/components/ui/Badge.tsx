import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  pulse?: boolean
  className?: string
  children: ReactNode
}

const variantClasses = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  error: 'bg-red-100 text-red-600',
  info: 'bg-blue-100 text-blue-700',
}

export function Badge({ variant = 'default', pulse = false, className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold',
        variantClasses[variant],
        pulse && 'animate-pulse',
        className
      )}
    >
      {children}
    </span>
  )
}
