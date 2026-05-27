import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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
import { WaiterDashboard } from '@/modules/waiter/pages/WaiterDashboard'
import { TableBill } from '@/modules/waiter/pages/TableBill'
import { BusinessSettings } from '@/modules/settings/pages/BusinessSettings'
import { AccessRequestPage } from '@/modules/access-request/pages/AccessRequestPage'
import { OnboardingFlow } from '@/modules/onboarding/pages/OnboardingFlow'
import { OrderTracking } from '@/modules/public/pages/OrderTracking'
import { AuthCallback } from '@/pages/AuthCallback'
import { ForgotPassword } from '@/pages/ForgotPassword'
import { ResetPassword } from '@/pages/ResetPassword'

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
        </Route>
        <Route path="/r/:slug/pedido/:orderId" element={<OrderTracking />} />
        <Route path="/r/:slug" element={<PublicMenu />} />
        <Route path="/kitchen/:slug" element={<KitchenDisplay />} />
        <Route path="/waiter/:slug/login" element={<WaiterLogin />} />
        <Route path="/waiter/:slug/dashboard" element={<WaiterDashboard />} />
        <Route path="/waiter/:slug/table/:tableNumber" element={<TableBill />} />
        <Route path="/super-admin/*" element={<SuperAdminPage />} />
        {/* Alias sin guión — por si alguien tipea /superadmin */}
        <Route path="/superadmin/*" element={<Navigate to="/super-admin" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
