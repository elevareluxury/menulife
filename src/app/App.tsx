import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { LandingPage } from '@/modules/landing/pages/LandingPage'
import { LoginPage } from './routes/login'
import { RegisterPage } from './routes/register'
import { DashboardPage } from './routes/dashboard'
import { SuperAdminPage } from './routes/super-admin'

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />

      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/super-admin" element={<SuperAdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
