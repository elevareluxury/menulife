import { lazy, Suspense } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

// La verificación en dos pasos (Mfa.tsx, con Supabase) se baja sólo con sesión y en una pantalla privada: quien abre un
// perfil público o la landing no la descarga.
const MfaGate = lazy(() => import('./Mfa').then(m => ({ default: m.MfaGate })))

// /super-admin tiene su propia puerta (AdminMfaGate, obligatoria)
export const MFA_PRIVATE_PREFIXES = ['/life', '/studio', '/dashboard', '/onboarding']

export const isPrivatePath = (pathname: string) => MFA_PRIVATE_PREFIXES.some(p => pathname === p || pathname.startsWith(`${p}/`))

export function MfaGateLoader() {
  const user = useAuthStore(s => s.user)
  const { pathname } = useLocation()
  if (!user || !isPrivatePath(pathname)) return null
  return <Suspense fallback={null}><MfaGate /></Suspense>
}
