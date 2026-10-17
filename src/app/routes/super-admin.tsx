import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { Spinner } from '@/components/ui/Spinner'
import { SuperAdminLayout } from '@/modules/super-admin/components/SuperAdminLayout'
import { AccessRequestsTab } from '@/modules/super-admin/pages/AccessRequestsTab'
import { RestaurantsTab }    from '@/modules/super-admin/pages/RestaurantsTab'
import { MetricasTab }       from '@/modules/super-admin/pages/MetricasTab'
import { PlanesTab }         from '@/modules/super-admin/pages/PlanesTab'
import { SistemaTab }        from '@/modules/super-admin/pages/SistemaTab'
import { FeatureFlagsTab }   from '@/modules/super-admin/pages/FeatureFlagsTab'
import { LandingConfigTab }  from '@/modules/super-admin/pages/LandingConfigTab'
import { TestimonialsTab }   from '@/modules/super-admin/pages/TestimonialsTab'
import { TesterTab }         from '@/modules/super-admin/pages/TesterTab'
import { ReportsTab }        from '@/modules/super-admin/pages/ReportsTab'
import { ErrorsTab }         from '@/modules/super-admin/pages/ErrorsTab'
import { ProductTab }        from '@/modules/super-admin/pages/ProductTab'
import { VerificationsTab }  from '@/modules/super-admin/pages/VerificationsTab'
import { HomeTab }           from '@/modules/super-admin/pages/HomeTab'
import { PeopleTab }         from '@/modules/super-admin/pages/PeopleTab'
import { ActivityTab }       from '@/modules/super-admin/pages/ActivityTab'
import { ROUTES } from '@/lib/constants'

export function SuperAdminPage() {
  const { loading, initialized, isAuthenticated, isSuperAdmin, role } = useAuth()
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    // Red de seguridad: sin sesión, 5 s; con sesión se espera más al rol (consulta aparte, con la red lenta tarda)
    const t = setTimeout(() => setTimedOut(true), isAuthenticated ? 15_000 : 5_000)
    return () => clearTimeout(t)
  }, [isAuthenticated])

  // Con sesión, el rol llega después (consulta aparte): esperarlo antes de decidir que no es del equipo
  if ((!initialized || loading || (isAuthenticated && role === null)) && !timedOut) {
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
        <Route index                    element={<HomeTab />} />
        <Route path="personas"          element={<PeopleTab />} />
        <Route path="actividad"         element={<ActivityTab />} />
        <Route path="solicitudes"       element={<AccessRequestsTab />} />
        <Route path="denuncias"         element={<ReportsTab />} />
        <Route path="verificaciones"    element={<VerificationsTab />} />
        <Route path="errores"           element={<ErrorsTab />} />
        <Route path="producto"          element={<ProductTab />} />
        <Route path="negocios"          element={<RestaurantsTab />} />
        <Route path="metricas"          element={<MetricasTab />} />
        <Route path="planes"            element={<PlanesTab />} />
        <Route path="sistema"           element={<SistemaTab />} />
        <Route path="feature-flags"     element={<FeatureFlagsTab />} />
        <Route path="landing"           element={<LandingConfigTab />} />
        <Route path="testimonios"       element={<TestimonialsTab />} />
        <Route path="tester"            element={<TesterTab />} />
        {/* Legacy aliases */}
        <Route path="requests"          element={<Navigate to="/super-admin/solicitudes" replace />} />
        <Route path="restaurants"       element={<Navigate to="/super-admin/negocios"    replace />} />
      </Routes>
    </SuperAdminLayout>
  )
}
