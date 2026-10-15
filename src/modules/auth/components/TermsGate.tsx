import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { needsTerms, TERMS_FREE_PATHS } from '@/modules/auth/lib/googleSignIn'

/** Una cuenta creada con Google desde el login no entra a la app hasta aceptar Términos y Privacidad. */
export function TermsGate() {
  const user = useAuthStore(s => s.user)
  const { pathname } = useLocation()
  if (!needsTerms(user) || TERMS_FREE_PATHS.includes(pathname)) return null
  return <Navigate to="/auth/terms" replace />
}
