import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthInit } from '@/app/AuthInit'
import ErrorBoundary from '@/components/ErrorBoundary'
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
import { OnboardingFlow } from '@/modules/onboarding/pages/OnboardingFlow'
import { OrderTracking } from '@/modules/public/pages/OrderTracking'
import { AuthCallback } from '@/pages/AuthCallback'
import { ForgotPassword } from '@/pages/ForgotPassword'
import { ResetPassword } from '@/pages/ResetPassword'
import { ReservationFormPage } from '@/modules/public/pages/ReservationFormPage'
import { RequirePlan } from '@/app/RequirePlan'

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
const HubPage                = lazy(() => import('@/modules/hub/pages/HubPage'))
const ServicesClientesPage   = lazy(() => import('@/modules/services/pages/ServicesClientesPage').then(m => ({ default: m.ServicesClientesPage })))
const CustomerProfilePage    = lazy(() => import('@/modules/services/pages/CustomerProfilePage').then(m => ({ default: m.CustomerProfilePage })))
const ServicesAgendaPage     = lazy(() => import('@/modules/services/pages/ServicesAgendaPage').then(m => ({ default: m.ServicesAgendaPage })))
const ServicesServiciosPage  = lazy(() => import('@/modules/services/pages/ServicesServiciosPage').then(m => ({ default: m.ServicesServiciosPage })))
const ServicesRecursosPage   = lazy(() => import('@/modules/services/pages/ServicesRecursosPage').then(m => ({ default: m.ServicesRecursosPage })))
const ServicesVentasPage     = lazy(() => import('@/modules/services/pages/ServicesVentasPage').then(m => ({ default: m.ServicesVentasPage })))
const ServicesReportesPage   = lazy(() => import('@/modules/services/pages/ServicesReportesPage').then(m => ({ default: m.ServicesReportesPage })))
const ServicesMembresiasPage = lazy(() => import('@/modules/services/pages/ServicesMembresiasPage').then(m => ({ default: m.ServicesMembresiasPage })))
const ServicesPackagesPage   = lazy(() => import('@/modules/services/pages/ServicesPackagesPage').then(m => ({ default: m.ServicesPackagesPage })))
const ServicesFormsPage         = lazy(() => import('@/modules/services/pages/ServicesFormsPage').then(m => ({ default: m.ServicesFormsPage })))
const FormBuilderPage           = lazy(() => import('@/modules/services/pages/FormBuilderPage').then(m => ({ default: m.FormBuilderPage })))
const ServicesPresupuestosPage  = lazy(() => import('@/modules/services/pages/ServicesPresupuestosPage').then(m => ({ default: m.ServicesPresupuestosPage })))
const QuotePublicPage           = lazy(() => import('@/modules/public/pages/QuotePublicPage').then(m => ({ default: m.QuotePublicPage })))
const PortalApp                 = lazy(() => import('@/modules/portal/PortalApp').then(m => ({ default: m.PortalApp })))
const LifeShell     = lazy(() => import('@/modules/life/LifeShell').then(m => ({ default: m.LifeShell })))
const LifePage      = lazy(() => import('@/modules/life/pages/LifePage').then(m => ({ default: m.LifePage })))
const LifeMoneyPage  = lazy(() => import('@/modules/life/pages/LifeMoneyPage').then(m => ({ default: m.LifeMoneyPage })))
const LifeGoalsPage  = lazy(() => import('@/modules/life/pages/LifeGoalsPage').then(m => ({ default: m.LifeGoalsPage })))
const LifeHabitsPage = lazy(() => import('@/modules/life/pages/LifeHabitsPage').then(m => ({ default: m.LifeHabitsPage })))
const LifeBrainPage  = lazy(() => import('@/modules/life/pages/LifeBrainPage').then(m => ({ default: m.LifeBrainPage })))

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
          <Route path="/solicitar-acceso" element={<Navigate to="/register" replace />} />
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
            {/* ── Servicios routes — all require os_full plan ── */}
            <Route path="services/clientes"     element={<RequirePlan feature="services_catalog"><ServicesClientesPage /></RequirePlan>} />
            <Route path="services/clientes/:id" element={<RequirePlan feature="services_catalog"><CustomerProfilePage /></RequirePlan>} />
            <Route path="services/agenda"       element={<RequirePlan feature="agenda"><ServicesAgendaPage /></RequirePlan>} />
            <Route path="services/servicios"    element={<RequirePlan feature="services_catalog"><ServicesServiciosPage /></RequirePlan>} />
            <Route path="services/recursos"     element={<RequirePlan feature="resources"><ServicesRecursosPage /></RequirePlan>} />
            <Route path="services/ventas"       element={<RequirePlan feature="services_catalog"><ServicesVentasPage /></RequirePlan>} />
            <Route path="services/reportes"     element={<RequirePlan feature="analytics_advanced"><ServicesReportesPage /></RequirePlan>} />
            <Route path="services/membresias"   element={<RequirePlan feature="services_catalog"><ServicesMembresiasPage /></RequirePlan>} />
            <Route path="services/paquetes"     element={<RequirePlan feature="services_catalog"><ServicesPackagesPage /></RequirePlan>} />
            <Route path="services/presupuestos" element={<RequirePlan feature="services_catalog"><ServicesPresupuestosPage /></RequirePlan>} />
            <Route path="services/forms"              element={<RequirePlan feature="services_catalog"><ServicesFormsPage /></RequirePlan>} />
            <Route path="services/forms/:id/builder"  element={<RequirePlan feature="services_catalog"><FormBuilderPage /></RequirePlan>} />
          </Route>
          {/* ── Life OS — capa personal, no requiere restaurant ── */}
          <Route path="/life" element={<LifeShell />}>
            <Route index element={<LifePage />} />
            <Route path="money"  element={<LifeMoneyPage />}  />
            <Route path="goals"  element={<LifeGoalsPage />}  />
            <Route path="habits" element={<LifeHabitsPage />} />
            <Route path="brain"  element={<LifeBrainPage />}  />
          </Route>
          {/* Portal del cliente */}
          <Route path="/portal/:restaurantId/*" element={<PortalApp />} />
          {/* Cotizaciones públicas por token */}
          <Route path="/q/:token" element={<QuotePublicPage />} />
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
          <Route path="/:slug" element={<ErrorBoundary><HubPublicPage /></ErrorBoundary>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
