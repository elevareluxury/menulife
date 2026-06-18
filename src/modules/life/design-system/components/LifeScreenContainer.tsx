import type { ReactNode } from 'react'

interface LifeScreenContainerProps {
  children: ReactNode
  /** Extra top padding (e.g. for pages with status bar space) */
  paddingTop?: string
}

/** Max-width wrapper for all Life OS screens. Handles horizontal padding. */
export function LifeScreenContainer({ children, paddingTop = '16px' }: LifeScreenContainerProps) {
  return (
    <div style={{
      maxWidth: '480px',
      margin: '0 auto',
      padding: `${paddingTop} 16px 12px`,
    }}>
      {children}
    </div>
  )
}
