import { Navigate } from 'react-router-dom'

// Direct registration is disabled — new users must request access first.
// Approved users receive a magic link to log in directly.
export function RegisterPage() {
  return <Navigate to="/solicitar-acceso" replace />
}
