import { createContext, useContext } from 'react'
import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import { usePortalAuth } from './hooks/usePortalAuth'
import type { PortalSession } from './portalTypes'
import { PortalLayout }       from './components/PortalLayout'
import { PortalLogin }        from './pages/PortalLogin'
import { PortalHome }         from './pages/PortalHome'
import { PortalBookings }     from './pages/PortalBookings'
import { PortalMemberships }  from './pages/PortalMemberships'
import { PortalDocuments }    from './pages/PortalDocuments'
import { PortalProfile }      from './pages/PortalProfile'

// ─── Context ──────────────────────────────────────────────────────────────────
interface PortalCtxType {
  session:      PortalSession
  restaurantId: string
  logout:       () => void
}

const PortalCtx = createContext<PortalCtxType | null>(null)

export function usePortalCtx(): PortalCtxType {
  const ctx = useContext(PortalCtx)
  if (!ctx) throw new Error('usePortalCtx must be used inside PortalApp')
  return ctx
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export function PortalApp() {
  const { restaurantId } = useParams<{ restaurantId: string }>()
  const auth = usePortalAuth(restaurantId)

  if (!auth.session) {
    return (
      <PortalLogin
        restaurantId={restaurantId ?? ''}
        auth={auth}
      />
    )
  }

  return (
    <PortalCtx.Provider value={{ session: auth.session, restaurantId: restaurantId!, logout: auth.logout }}>
      <PortalLayout>
        <Routes>
          <Route index               element={<PortalHome />} />
          <Route path="reservas"     element={<PortalBookings />} />
          <Route path="membresias"   element={<PortalMemberships />} />
          <Route path="documentos"   element={<PortalDocuments />} />
          <Route path="perfil"       element={<PortalProfile />} />
          <Route path="*"            element={<Navigate to="" replace />} />
        </Routes>
      </PortalLayout>
    </PortalCtx.Provider>
  )
}
