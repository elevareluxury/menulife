import { useAuth } from '@/modules/auth/hooks/useAuth'

// Mounts auth listener and initializes store state at app root.
export function AuthInit() {
  useAuth()
  return null
}
