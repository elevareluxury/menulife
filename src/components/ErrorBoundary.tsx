import { Component, ReactNode } from 'react'

class ErrorBoundary extends Component<
  { children: ReactNode; label?: string },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: any) {
    console.error(`[ErrorBoundary:${this.props.label ?? 'app'}]`, error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          background: '#06080F',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          color: 'white',
          fontFamily: 'DM Sans, sans-serif',
        }}>
          <h1 style={{ fontSize: '24px', marginBottom: '12px' }}>
            Algo salió mal
          </h1>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '16px' }}>
            Recargá la página para continuar.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px', borderRadius: '10px',
              background: '#F4705A', color: '#fff',
              fontSize: '14px', fontWeight: 600,
              border: 'none', cursor: 'pointer', marginBottom: '24px',
            }}
          >
            Recargar
          </button>
          <pre style={{
            background: 'rgba(255,255,255,0.05)',
            padding: '16px',
            borderRadius: '8px',
            fontSize: '11px',
            color: '#EF4444',
            maxWidth: '100%',
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
          }}>
            {this.state.error?.message}
            {'\n'}
            {this.state.error?.stack}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
