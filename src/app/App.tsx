import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthInit } from '@/app/AuthInit'
import { OfflineBanner } from '@/components/ui/OfflineBanner'
import { LandingPage } from '@/modules/landing/pages/LandingPage'
import { LoginPage } from './routes/login'
import { RegisterPage } from './routes/register'
import { DashboardPage, DashboardHome } from './routes/dashboard'
import { MenuManagement } from '@/modules/menu/pages/MenuManagement'
import { QRGenerator } from '@/modules/menu/pages/QRGenerator'
import { PublicMenu } from '@/modules/public/pages/PublicMenu'
import { WaiterLogin } from '@/modules/waiter/pages/WaiterLogin'
import { WaiterApp } from '@/modules/waiter/pages/WaiterApp'
import { TableBill } from '@/modules/waiter/pages/TableBill'
import { AccessRequestPage } from '@/modules/access-request/pages/AccessRequestPage'
import { OnboardingFlow } from '@/modules/onboarding/pages/OnboardingFlow'
import { OrderTracking } from '@/modules/public/pages/OrderTracking'
import { AuthCallback } from '@/pages/AuthCallback'
import { ForgotPassword } from '@/pages/ForgotPassword'
import { ResetPassword } from '@/pages/ResetPassword'
import { ReservationFormPage } from '@/modules/public/pages/ReservationFormPage'

// Heavy modules — lazy loaded
const HubPublicPage    = lazy(() => import('@/modules/public/pages/HubPublicPage').then(m => ({ default: m.HubPublicPage })))
const SuperAdminPage   = lazy(() => import('./routes/super-admin').then(m => ({ default: m.SuperAdminPage })))
const BusinessSettings = lazy(() => import('@/modules/settings/pages/BusinessSettings').then(m => ({ default: m.BusinessSettings })))
const OrdersManagement = lazy(() => import('@/modules/orders/pages/OrdersManagement').then(m => ({ default: m.OrdersManagement })))
const WaitersManagement = lazy(() => import('@/modules/waiters/pages/WaitersManagement').then(m => ({ default: m.WaitersManagement })))
const TablesConfiguration = lazy(() => import('@/modules/waiters/pages/TablesConfiguration').then(m => ({ default: m.TablesConfiguration })))
const DriversManagement = lazy(() => import('@/modules/delivery/pages/DriversManagement').then(m => ({ default: m.DriversManagement })))
const DeliveryLogin    = lazy(() => import('@/modules/delivery/pages/DeliveryLogin').then(m => ({ default: m.DeliveryLogin })))
const DriverDashboard  = lazy(() => import('@/modules/delivery/pages/DriverDashboard').then(m => ({ default: m.DriverDashboard })))
const KitchenDisplay   = lazy(() => import('@/modules/kitchen/pages/KitchenDisplay').then(m => ({ default: m.KitchenDisplay })))
const CRMPage          = lazy(() => import('@/modules/crm/pages/CRMPage').then(m => ({ default: m.CRMPage })))
const EstadisticasPage = lazy(() => import('@/modules/stats/pages/EstadisticasPage').then(m => ({ default: m.EstadisticasPage })))
const NotificacionesPage = lazy(() => import('@/modules/dashboard/pages/NotificacionesPage').then(m => ({ default: m.NotificacionesPage })))
const CajaPage         = lazy(() => import('@/modules/pos/pages/CajaPage').then(m => ({ default: m.CajaPage })))
const TicketsPage      = lazy(() => import('@/modules/pos/pages/TicketsPage').then(m => ({ default: m.TicketsPage })))
const GastosPage       = lazy(() => import('@/modules/pos/pages/GastosPage').then(m => ({ default: m.GastosPage })))
const InventarioPage   = lazy(() => import('@/modules/inventory/pages/InventarioPage'))
const CatalogoPage     = lazy(() => import('@/modules/catalog/pages/CatalogoPage'))
const CatalogoPublic   = lazy(() => import('@/modules/public/pages/CatalogoPublic'))
const HubPage          = lazy(() => import('@/modules/hub/pages/HubPage'))

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-screen" style={{ background: '#0F1115' }}>
      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#F4705A', borderTopColor: 'transparent' }} />
    </div>
  )
}

function WaiterLegacyRedirect() {
  const { slug } = useParams()
  return <Navigate to={`/mozo/${slug ?? ''}`} replace />
}

function App() {
  return (
    <BrowserRouter>
      <AuthInit />
      <OfflineBanner />
      <Toaster position="top-right" />

      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/auth/callback"    element={<AuthCallback />} />
          <Route path="/forgot-password"  element={<ForgotPassword />} />
          <Route path="/reset-password"   element={<ResetPassword />} />
          <Route path="/solicitar-acceso" element={<AccessRequestPage />} />
          <Route path="/onboarding" element={<OnboardingFlow />} />
          <Route path="/dashboard" element={<DashboardPage />}>
            <Route index element={<DashboardHome />} />
            <Route path="menu"          element={<MenuManagement />} />
            <Route path="qr"            element={<QRGenerator />} />
            <Route path="orders"        element={<OrdersManagement />} />
            <Route path="waiters"       element={<WaitersManagement />} />
            <Route path="tables"        element={<TablesConfiguration />} />
            <Route path="settings"      element={<BusinessSettings />} />
            <Route path="repartidores"  element={<DriversManagement />} />
            <Route path="clientes"      element={<CRMPage />} />
            <Route path="estadisticas"  element={<EstadisticasPage />} />
            <Route path="notificaciones" element={<NotificacionesPage />} />
            <Route path="caja"          element={<CajaPage />} />
            <Route path="tickets"       element={<TicketsPage />} />
            <Route path="gastos"        element={<GastosPage />} />
            <Route path="inventario"    element={<InventarioPage />} />
            <Route path="catalogo"      element={<CatalogoPage />} />
            <Route path="hub"           element={<HubPage />} />
          </Route>
          <Route path="/r/:slug/reservar"           element={<ReservationFormPage />} />
          <Route path="/r/:slug/pedido/:orderId"    element={<OrderTracking />} />
          <Route path="/r/:slug"                    element={<PublicMenu />} />
          <Route path="/kitchen/:slug"              element={<KitchenDisplay />} />
          {/* Rutas mozo nueva app */}
          <Route path="/mozo/:slug"      element={<WaiterLogin />} />
          <Route path="/mozo/:slug/app"  element={<WaiterApp />} />
          {/* Rutas waiter legacy — backward compat */}
          <Route path="/waiter/:slug/login"               element={<WaiterLegacyRedirect />} />
          <Route path="/waiter/:slug/dashboard"           element={<WaiterLegacyRedirect />} />
          <Route path="/waiter/:slug/table/:tableNumber"  element={<TableBill />} />
          <Route path="/delivery/:slug"       element={<DeliveryLogin />} />
          <Route path="/delivery/:slug/login" element={<DeliveryLogin />} />
          <Route path="/delivery/:slug/app"   element={<DriverDashboard />} />
          <Route path="/super-admin/*" element={<SuperAdminPage />} />
          {/* Alias sin guión — por si alguien tipea /superadmin */}
          <Route path="/superadmin/*" element={<Navigate to="/super-admin" replace />} />
          {/* Catálogo retail público */}
          <Route path="/catalogo/:slug" element={<CatalogoPublic />} />
          {/* Hub Público — /:slug debe ir antes del catch-all */}
          <Route path="/:slug" element={<HubPublicPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
