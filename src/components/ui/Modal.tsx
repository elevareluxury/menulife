import { type ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  dark?: boolean
}

const sizes = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

export function Modal({ isOpen, onClose, title, children, size = 'md', dark = false }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const panelBg      = dark ? 'bg-[#16181F]'                                        : 'bg-white'
  const panelBorder  = dark ? 'border border-[rgba(255,255,255,0.08)]'               : ''
  const headerBorder = dark ? 'border-b border-[rgba(255,255,255,0.08)]'             : 'border-b border-gray-200'
  const titleColor   = dark ? 'text-[#F5F7FA]'                                       : 'text-gray-900'
  const closeColor   = dark ? 'text-[rgba(255,255,255,0.4)] hover:text-white hover:bg-[rgba(255,255,255,0.07)]' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className={cn('relative w-full rounded-xl shadow-xl flex flex-col max-h-[90vh]', sizes[size], panelBg, panelBorder)}>
        {/* Header */}
        <div className={cn('flex items-center justify-between px-6 py-4 shrink-0', headerBorder)}>
          <h2 className={cn('text-lg font-semibold', titleColor)}>{title}</h2>
          <button
            onClick={onClose}
            className={cn('p-1 rounded-lg transition-colors', closeColor)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content — pb-6 ensures last element isn't clipped at bottom */}
        <div className="overflow-y-auto p-6 pb-8">
          {children}
        </div>
      </div>
    </div>
  )
}
