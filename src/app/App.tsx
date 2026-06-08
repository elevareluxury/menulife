import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { HubPublicPage } from '@/modules/public/pages/HubPublicPage'
import { Toaster } from 'react-hot-toast'
import { AuthInit } from '@/app/AuthInit'
import { OfflineBanner } from '@/components/ui/OfflineBanner'
import { LandingPage } from '@/modules/landing/pages/LandingPage'
import { LoginPage } from './routes/login'
import { RegisterPage } from './routes/register'
import { DashboardPage, DashboardHome } from './routes/dashboard'
import { SuperAdminPage } from './routes/super-admin'
import { MenuManagement } from '@/modules/menu/pages/MenuManagement'
import { QRGenerator } from '@/modules/menu/pages/QRGenerator'
import { PublicMenu } from '@/modules/public/pages/PublicMenu'
import { KitchenDisplay } from '@/modules/kitchen/pages/KitchenDisplay'
import { OrdersManagement } from '@/modules/orders/pages/OrdersManagement'
import { WaitersManagement } from '@/modules/waiters/pages/WaitersManagement'
import { TablesConfiguration } from '@/modules/waiters/pages/TablesConfiguration'
import { WaiterLogin } from '@/modules/waiter/pages/WaiterLogin'
import { WaiterApp } from '@/modules/waiter/pages/WaiterApp'
import { TableBill } from '@/modules/waiter/pages/TableBill'
import { BusinessSettings } from '@/modules/settings/pages/BusinessSettings'
import { DriversManagement } from '@/modules/delivery/pages/DriversManagement'
import { DeliveryLogin } from '@/modules/delivery/pages/DeliveryLogin'
import { DriverDashboard } from '@/modules/delivery/pages/DriverDashboard'
import { AccessRequestPage } from '@/modules/access-request/pages/AccessRequestPage'
import { OnboardingFlow } from '@/modules/onboarding/pages/OnboardingFlow'
import { OrderTracking } from '@/modules/public/pages/OrderTracking'
import { AuthCallback } from '@/pages/AuthCallback'
import { ForgotPassword } from '@/pages/ForgotPassword'
import { ResetPassword } from '@/pages/ResetPassword'
import { ReservationFormPage } from '@/modules/public/pages/ReservationFormPage'
import { CRMPage } from '@/modules/crm/pages/CRMPage'
import { EstadisticasPage } from '@/modules/stats/pages/EstadisticasPage'
import { NotificacionesPage } from '@/modules/dashboard/pages/NotificacionesPage'
import { CajaPage } from '@/modules/pos/pages/CajaPage'
import { TicketsPage } from '@/modules/pos/pages/TicketsPage'
import { GastosPage } from '@/modules/pos/pages/GastosPage'
import InventarioPage from '@/modules/inventory/pages/InventarioPage'
import CatalogoPage from '@/modules/catalog/pages/CatalogoPage'
import HubPage from '@/modules/hub/pages/HubPage'

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
          <Route path="menu" element={<MenuManagement />} />
          <Route path="qr" element={<QRGenerator />} />
          <Route path="orders" element={<OrdersManagement />} />
          <Route path="waiters" element={<WaitersManagement />} />
          <Route path="tables" element={<TablesConfiguration />} />
          <Route path="settings" element={<BusinessSettings />} />
          <Route path="repartidores" element={<DriversManagement />} />
          <Route path="clientes" element={<CRMPage />} />
          <Route path="estadisticas"    element={<EstadisticasPage />} />
          <Route path="notificaciones" element={<NotificacionesPage />} />
          <Route path="caja"           element={<CajaPage />} />
          <Route path="tickets"        element={<TicketsPage />} />
          <Route path="gastos"         element={<GastosPage />} />
          <Route path="inventario"     element={<InventarioPage />} />
          <Route path="catalogo"       element={<CatalogoPage />} />
          <Route path="hub"            element={<HubPage />} />
        </Route>
        <Route path="/r/:slug/reservar" element={<ReservationFormPage />} />
        <Route path="/r/:slug/pedido/:orderId" element={<OrderTracking />} />
        <Route path="/r/:slug" element={<PublicMenu />} />
        <Route path="/kitchen/:slug" element={<KitchenDisplay />} />
        {/* Rutas mozo nueva app */}
        <Route path="/mozo/:slug" element={<WaiterLogin />} />
        <Route path="/mozo/:slug/app" element={<WaiterApp />} />
        {/* Rutas waiter legacy — backward compat */}
        <Route path="/waiter/:slug/login" element={<WaiterLegacyRedirect />} />
        <Route path="/waiter/:slug/dashboard" element={<WaiterLegacyRedirect />} />
        <Route path="/waiter/:slug/table/:tableNumber" element={<TableBill />} />
        <Route path="/delivery/:slug" element={<DeliveryLogin />} />
        <Route path="/delivery/:slug/login" element={<DeliveryLogin />} />
        <Route path="/delivery/:slug/app" element={<DriverDashboard />} />
        <Route path="/super-admin/*" element={<SuperAdminPage />} />
        {/* Alias sin guión — por si alguien tipea /superadmin */}
        <Route path="/superadmin/*" element={<Navigate to="/super-admin" replace />} />
        {/* Hub Público — /:slug debe ir antes del catch-all */}
        <Route path="/:slug" element={<HubPublicPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
