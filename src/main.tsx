import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App'
import ErrorBoundary from './components/ErrorBoundary'
import { installErrorReporting } from './lib/errorReporter'
import './i18n'
import './lib/fonts'
import './index.css'

// Errores que nadie atrapa → registro propio (L5, /super-admin/errores)
installErrorReporting()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
