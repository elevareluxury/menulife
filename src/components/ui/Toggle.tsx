import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
}

export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(
  ({ label, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <label htmlFor={inputId} className={cn('inline-flex items-center gap-3 cursor-pointer', className)}>
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            className="sr-only peer"
            {...props}
          />
          <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-emerald-500 transition-colors" />
          <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
        </div>
        {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
      </label>
    )
  }
)

Toggle.displayName = 'Toggle'
