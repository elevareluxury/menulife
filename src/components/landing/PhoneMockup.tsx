import { ReactNode } from 'react'

interface PhoneMockupProps {
  children: ReactNode
  className?: string
}

export function PhoneMockup({ children, className = '' }: PhoneMockupProps) {
  return (
    <div className={`relative select-none ${className}`}>
      {/* Outer shell */}
      <div className="w-[200px] h-[400px] bg-brown-900 rounded-[40px] shadow-2xl p-[3px] border border-white/10">
        {/* Screen */}
        <div className="w-full h-full bg-cream rounded-[38px] overflow-hidden flex flex-col relative">
          {/* Notch */}
          <div className="w-20 h-5 bg-brown-900 rounded-b-2xl mx-auto shrink-0 z-10" />
          {/* Content */}
          <div className="flex-1 overflow-hidden relative">
            {children}
          </div>
        </div>
      </div>
      {/* Reflection shine */}
      <div className="absolute inset-0 rounded-[40px] bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
    </div>
  )
}
