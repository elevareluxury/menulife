import { lazy, Suspense } from 'react'
import { FEATURES } from '@/lib/features'
import { BrowserRouter, Routes, Route, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthInit } from '@/app/AuthInit'
import { PrefsInit } from '@/app/PrefsInit'
import ErrorBoundary from '@/components/ErrorBoundary'
import { OfflineBanner } from '@/components/ui/OfflineBanner'
import { ScrollToTop } from '@/components/ScrollToTop'
import { RequirePlan } from '@/app/RequirePlan'
import { RequireStaffAuth } from '@/app/RequireStaffAuth'

// Todo se carga al entrar a su ruta: quien abre un perfil público no descarga la landing ni Mycen Business (Lanzamiento L1)
const LandingPage = lazy(() => import('@/modules/landing/pages/LandingPage').then(m => ({ default: m.LandingPage })))
const LoginPage = lazy(() => import('./routes/login').then(m => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('./routes/register').then(m => ({ default: m.RegisterPage })))
const MenuManagement = lazy(() => import('@/modules/menu/pages/MenuManagement').then(m => ({ default: m.MenuManagement })))
const QRGenerator = lazy(() => import('@/modules/menu/pages/QRGenerator').then(m => ({ default: m.QRGenerator })))
const PublicMenu = lazy(() => import('@/modules/public/pages/PublicMenu').then(m => ({ default: m.PublicMenu })))
const WaiterLogin = lazy(() => import('@/modules/waiter/pages/WaiterLogin').then(m => ({ default: m.WaiterLogin })))
const WaiterApp = lazy(() => import('@/modules/waiter/pages/WaiterApp').then(m => ({ default: m.WaiterApp })))
const TableBill = lazy(() => import('@/modules/waiter/pages/TableBill').then(m => ({ default: m.TableBill })))
const OnboardingFlow = lazy(() => import('@/modules/onboarding/pages/OnboardingFlow').then(m => ({ default: m.OnboardingFlow })))
const OrderTracking = lazy(() => import('@/modules/public/pages/OrderTracking').then(m => ({ default: m.OrderTracking })))
const AuthCallback = lazy(() => import('@/pages/AuthCallback').then(m => ({ default: m.AuthCallback })))
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword').then(m => ({ default: m.ForgotPassword })))
const ResetPassword = lazy(() => import('@/pages/ResetPassword').then(m => ({ default: m.ResetPassword })))
const ReservationFormPage = lazy(() => import('@/modules/public/pages/ReservationFormPage').then(m => ({ default: m.ReservationFormPage })))
const DashboardPage = lazy(() => import('./routes/dashboard').then(m => ({ default: m.DashboardPage })))
const DashboardHome = lazy(() => import('./routes/dashboard').then(m => ({ default: m.DashboardHome })))
const HubPublicPage    = lazy(() => import('@/modules/public/pages/HubPublicPage').then(m => ({ default: m.HubPublicPage })))
const ProfilePublicPage = lazy(() => import('@/modules/profile/pages/ProfilePublicPage').then(m => ({ default: m.ProfilePublicPage })))
const LegalPage       = lazy(() => import('@/modules/legal/LegalPage').then(m => ({ default: m.LegalPage })))
const ProjectPublicPage = lazy(() => import('@/modules/profile/pages/ProjectPublicPage').then(m => ({ default: m.ProjectPublicPage })))
const StudioShell     = lazy(() => import('@/modules/studio/StudioShell').then(m => ({ default: m.StudioShell })))
const StudioOverview  = lazy(() => import('@/modules/studio/pages/OverviewPage').then(m => ({ default: m.OverviewPage })))
const StudioIdentity  = lazy(() => import('@/modules/studio/pages/IdentityPage').then(m => ({ default: m.IdentityPage })))
const StudioModules   = lazy(() => import('@/modules/studio/pages/ModulesPage').then(m => ({ default: m.ModulesPage })))
const StudioAppearance = lazy(() => import('@/modules/studio/pages/AppearancePage').then(m => ({ default: m.AppearancePage })))
const StudioExchange  = lazy(() => import('@/modules/studio/pages/ExchangePage').then(m => ({ default: m.ExchangePage })))
const StudioAnalytics = lazy(() => import('@/modules/studio/pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })))
const StudioSettings  = lazy(() => import('@/modules/studio/pages/SettingsPage').then(m => ({ default: m.SettingsPage })))
const StudioProjects  = lazy(() => import('@/modules/studio/pages/ProjectsPage').then(m => ({ default: m.ProjectsPage })))
const StudioProject   = lazy(() => import('@/modules/studio/pages/ProjectEditorPage').then(m => ({ default: m.ProjectEditorPage })))
const StudioPreview   = lazy(() => import('@/modules/studio/pages/MiscPages').then(m => ({ default: m.PreviewPage })))
const StudioEditor    = lazy(() => import('@/modules/studio/pages/EditorPage').then(m => ({ default: m.EditorPage })))
const StudioMessages  = lazy(() => import('@/modules/studio/pages/MessagesPage').then(m => ({ default: m.MessagesPage })))
const StudioSpaces    = lazy(() => import('@/modules/studio/pages/SpacesPage').then(m => ({ default: m.SpacesPage })))
const StudioMore      = lazy(() => import('@/modules/studio/pages/MiscPages').then(m => ({ default: m.MorePage })))
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
// Muestra del sistema de diseño (V1): sólo en desarrollo, no entra en el build de producción
const DevDesignPage = import.meta.env.DEV ? lazy(() => import('@/design/DevDesignPage')) : null
const NotificacionesPage = lazy(() => import('@/modules/dashboard/pages/NotificacionesPage').then(m => ({ default: m.NotificacionesPage })))
const CajaPage         = lazy(() => import('@/modules/pos/pages/CajaPage').then(m => ({ default: m.CajaPage })))
const TicketsPage      = lazy(() => import('@/modules/pos/pages/TicketsPage').then(m => ({ default: m.TicketsPage })))
const GastosPage       = lazy(() => import('@/modules/pos/pages/GastosPage').then(m => ({ default: m.GastosPage })))
const InventarioPage   = lazy(() => import('@/modules/inventory/pages/InventarioPage'))
const CatalogoPage     = lazy(() => import('@/modules/catalog/pages/CatalogoPage'))
const CatalogoPublic   = lazy(() => import('@/modules/public/pages/CatalogoPublic'))
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
const LifeShell      = lazy(() => import('@/modules/life/LifeShell').then(m => ({ default: m.LifeShell })))
const LifePage       = lazy(() => import('@/modules/life/pages/LifePage').then(m => ({ default: m.LifePage })))
const LifeMoneyPage  = lazy(() => import('@/modules/life/pages/LifeMoneyPage').then(m => ({ default: m.LifeMoneyPage })))
const LifeGoalsPage  = lazy(() => import('@/modules/life/pages/LifeGoalsPage').then(m => ({ default: m.LifeGoalsPage })))
const LifeHabitsPage = lazy(() => import('@/modules/life/pages/LifeHabitsPage').then(m => ({ default: m.LifeHabitsPage })))
const LifeBrainPage  = lazy(() => import('@/modules/life/pages/LifeBrainPage').then(m => ({ default: m.LifeBrainPage })))
const LifeSettingsPage = lazy(() => import('@/modules/life/pages/LifeSettingsPage').then(m => ({ default: m.LifeSettingsPage })))
const LifeInsightsPage = lazy(() => import('@/modules/life/pages/LifeInsightsPage').then(m => ({ default: m.LifeInsightsPage })))
const LifeReplayPage = lazy(() => import('@/modules/life/pages/LifeReplayPage').then(m => ({ default: m.LifeReplayPage })))

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

// Mycen Identity: la página pública. El Hub viejo queda accesible con ?v=1
// como respaldo temporal durante la transición.
function PublicSlugRoute() {
  const [params] = useSearchParams()
  return params.get('v') === '1' ? <HubPublicPage /> : <ProfilePublicPage />
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AuthInit />
      <PrefsInit />
      <OfflineBanner />
      <Toaster position="top-right" containerStyle={{ bottom: 'calc(96px + env(safe-area-inset-bottom))' }} />

      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          {DevDesignPage && <Route path="/dev/design" element={<DevDesignPage />} />}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/auth/callback"    element={<AuthCallback />} />
          <Route path="/forgot-password"  element={<ForgotPassword />} />
          <Route path="/reset-password"   element={<ResetPassword />} />
          <Route path="/solicitar-acceso" element={<Navigate to="/register" replace />} />
          <Route path="/onboarding" element={<OnboardingFlow />} />
          <Route path="/dashboard" element={<ErrorBoundary label="dashboard"><DashboardPage /></ErrorBoundary>}>
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
            {/* El editor del Hub fue reemplazado por Mycen Studio */}
            <Route path="hub"           element={<Navigate to="/studio" replace />} />
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
          <Route path="/terminos"   element={<LegalPage doc="terms" />} />
          <Route path="/privacidad" element={<LegalPage doc="privacy" />} />
          {/* ── Mycen Studio — edición de la identidad (Profile) ── */}
          <Route path="/studio" element={<ErrorBoundary label="studio"><StudioShell /></ErrorBoundary>}>
            <Route index element={<StudioOverview />} />
            <Route path="identity"   element={<StudioIdentity />} />
            <Route path="modules"    element={<StudioModules />} />
            <Route path="projects"   element={<StudioProjects />} />
            <Route path="projects/:id" element={<StudioProject />} />
            <Route path="appearance" element={<StudioAppearance />} />
            <Route path="exchange"   element={<StudioExchange />} />
            <Route path="analytics"  element={<StudioAnalytics />} />
            <Route path="settings"   element={<StudioSettings />} />
            <Route path="preview"    element={<StudioPreview />} />
            <Route path="editor"     element={<StudioEditor />} />
            <Route path="spaces"     element={<StudioSpaces />} />
            <Route path="messages"   element={<StudioMessages />} />
            <Route path="more"       element={<StudioMore />} />
            <Route path="*"          element={<Navigate to="/studio" replace />} />
          </Route>
          {/* ── Life OS — capa personal, no requiere restaurant ── */}
          <Route path="/life" element={<ErrorBoundary label="life"><LifeShell /></ErrorBoundary>}>
            <Route index element={<LifePage />} />
            <Route path="money"  element={<LifeMoneyPage />}  />
            <Route path="goals"  element={<LifeGoalsPage />}  />
            <Route path="habits" element={<LifeHabitsPage />} />
            <Route path="brain"  element={<LifeBrainPage />}  />
            <Route path="hub"    element={<Navigate to="/studio" replace />} />
            <Route path="replay"   element={FEATURES.lifeReplay   ? <LifeReplayPage />   : <Navigate to="/life" replace />} />
            <Route path="insights" element={FEATURES.lifeInsights ? <LifeInsightsPage /> : <Navigate to="/life" replace />} />
            <Route path="settings" element={<LifeSettingsPage />} />
          </Route>
          {/* Portal del cliente */}
          <Route path="/portal/:restaurantId/*" element={<PortalApp />} />
          {/* Cotizaciones públicas por token */}
          <Route path="/q/:token" element={<QuotePublicPage />} />
          <Route path="/r/:slug/reservar"           element={<ReservationFormPage />} />
          <Route path="/r/:slug/pedido/:orderId"    element={<OrderTracking />} />
          <Route path="/r/:slug"                    element={<PublicMenu />} />
          <Route
            path="/kitchen/:slug"
            element={
              <RequireStaffAuth
                loginPath={(slug) => `/mozo/${slug}`}
                allowOwner={true}
                allowWaiter={true}
                allowDelivery={true}
              >
                <KitchenDisplay />
              </RequireStaffAuth>
            }
          />
          {/* Rutas mozo nueva app */}
          <Route path="/mozo/:slug"      element={<WaiterLogin />} />
          <Route
            path="/mozo/:slug/app"
            element={
              <RequireStaffAuth
                loginPath={(slug) => `/mozo/${slug}`}
                allowOwner={false}
                allowWaiter={true}
                allowDelivery={false}
              >
                <WaiterApp />
              </RequireStaffAuth>
            }
          />
          {/* Rutas waiter legacy — backward compat */}
          <Route path="/waiter/:slug/login"               element={<WaiterLegacyRedirect />} />
          <Route path="/waiter/:slug/dashboard"           element={<WaiterLegacyRedirect />} />
          <Route path="/waiter/:slug/table/:tableNumber"  element={<TableBill />} />
          <Route path="/delivery/:slug"       element={<DeliveryLogin />} />
          <Route path="/delivery/:slug/login" element={<DeliveryLogin />} />
          <Route
            path="/delivery/:slug/app"
            element={
              <RequireStaffAuth
                loginPath={(slug) => `/delivery/${slug}`}
                allowOwner={false}
                allowWaiter={false}
                allowDelivery={true}
              >
                <DriverDashboard />
              </RequireStaffAuth>
            }
          />
          <Route path="/super-admin/*" element={<SuperAdminPage />} />
          {/* Alias sin guión — por si alguien tipea /superadmin */}
          <Route path="/superadmin/*" element={<Navigate to="/super-admin" replace />} />
          {/* Catálogo retail público */}
          <Route path="/catalogo/:slug" element={<CatalogoPublic />} />
          {/* Hub Público — /:slug debe ir antes del catch-all */}
          <Route path="/:slug" element={<ErrorBoundary><PublicSlugRoute /></ErrorBoundary>} />
          <Route path="/:slug/projects/:projectSlug" element={<ErrorBoundary><ProjectPublicPage /></ErrorBoundary>} />
          {/* Space secundario dentro del principal: /ana/estudio (Identity Fase 10) */}
          <Route path="/:slug/:space" element={<ErrorBoundary><ProfilePublicPage /></ErrorBoundary>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
