import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { Spinner } from '@/components/ui/Spinner'
import { SuperAdminLayout } from '@/modules/super-admin/components/SuperAdminLayout'
import { SuperDashboard }    from '@/modules/super-admin/pages/SuperDashboard'
import { AccessRequestsTab } from '@/modules/super-admin/pages/AccessRequestsTab'
import { RestaurantsTab }    from '@/modules/super-admin/pages/RestaurantsTab'
import { MetricasTab }       from '@/modules/super-admin/pages/MetricasTab'
import { PlanesTab }         from '@/modules/super-admin/pages/PlanesTab'
import { SistemaTab }        from '@/modules/super-admin/pages/SistemaTab'
import { FeatureFlagsTab }   from '@/modules/super-admin/pages/FeatureFlagsTab'
import { LandingConfigTab }  from '@/modules/super-admin/pages/LandingConfigTab'
import { TesterTab }         from '@/modules/super-admin/pages/TesterTab'
import { ROUTES } from '@/lib/constants'

export function SuperAdminPage() {
  const { loading, initialized, isAuthenticated, isSuperAdmin } = useAuth()
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 5_000)
    return () => clearTimeout(t)
  }, [])

  if ((!initialized || loading) && !timedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0F1115' }}>
        <Spinner size="lg" />
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to={ROUTES.LOGIN} replace />
  if (!isSuperAdmin)    return <Navigate to={ROUTES.DASHBOARD} replace />

  return (
    <SuperAdminLayout>
      <Routes>
        <Route index                    element={<SuperDashboard />} />
        <Route path="solicitudes"       element={<AccessRequestsTab />} />
        <Route path="negocios"          element={<RestaurantsTab />} />
        <Route path="metricas"          element={<MetricasTab />} />
        <Route path="planes"            element={<PlanesTab />} />
        <Route path="sistema"           element={<SistemaTab />} />
        <Route path="feature-flags"     element={<FeatureFlagsTab />} />
        <Route path="landing"           element={<LandingConfigTab />} />
        <Route path="tester"            element={<TesterTab />} />
        {/* Legacy aliases */}
        <Route path="requests"          element={<Navigate to="/super-admin/solicitudes" replace />} />
        <Route path="restaurants"       element={<Navigate to="/super-admin/negocios"    replace />} />
      </Routes>
    </SuperAdminLayout>
  )
}
