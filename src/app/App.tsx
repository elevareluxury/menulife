import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
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

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />

      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<DashboardPage />}>
          <Route index element={<DashboardHome />} />
          <Route path="menu" element={<MenuManagement />} />
          <Route path="qr" element={<QRGenerator />} />
          <Route path="orders" element={<OrdersManagement />} />
          <Route path="waiters" element={<WaitersManagement />} />
          <Route path="tables" element={<TablesConfiguration />} />
        </Route>
        <Route path="/r/:slug" element={<PublicMenu />} />
        <Route path="/kitchen/:slug" element={<KitchenDisplay />} />
        <Route path="/waiter/:slug/login" element={<WaiterLogin />} />
        <Route path="/waiter/:slug/dashboard" element={<WaiterDashboard />} />
        <Route path="/waiter/:slug/table/:tableNumber" element={<TableBill />} />
        <Route path="/super-admin" element={<SuperAdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
