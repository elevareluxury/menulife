import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  BarChart3, Eye, Home, LayoutGrid, LogOut, MoreHorizontal, Palette, PenLine, Settings, Share2, UserRound,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { StudioContext, type StudioContextValue } from './StudioContext'
import {
  friendlyError, loadBusiness, loadModules, loadMyProfile, updateProfile,
} from './lib/studioApi'
import { publicBaseUrl, toPublicProfile } from './lib/preview'
import type { ProfilePatch, SaveState, StudioBusiness, StudioModule, StudioProfile } from './lib/studioTypes'
import { PreviewPane } from './components/PreviewPane'
import { CreateProfileScreen } from './components/CreateProfileScreen'
import { Button } from './components/ui'
import './studio.css'

const NAV = [
  { to: '/studio',            label: 'Inicio',      icon: Home, end: true },
  { to: '/studio/identity',   label: 'Mi identidad', icon: UserRound },
  { to: '/studio/modules',    label: 'Módulos',     icon: LayoutGrid },
  { to: '/studio/appearance', label: 'Apariencia',  icon: Palette },
  { to: '/studio/exchange',   label: 'Compartir',   icon: Share2 },
  { to: '/studio/analytics',  label: 'Analítica',   icon: BarChart3 },
  { to: '/studio/settings',   label: 'Ajustes',     icon: Settings },
]

const MOBILE_NAV = [
  { to: '/studio',          label: 'Inicio',       icon: Home, end: true },
  { to: '/studio/identity', label: 'Editar',       icon: PenLine },
  { to: '/studio/preview',  label: 'Vista previa', icon: Eye },
  { to: '/studio/exchange', label: 'Compartir',    icon: Share2 },
  { to: '/studio/more',     label: 'Más',          icon: MoreHorizontal },
]

type Load =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'empty' }
  | { kind: 'ready'; profile: StudioProfile; modules: StudioModule[]; business: StudioBusiness | null }

export function StudioShell() {
  const { user, initialized, loading } = useAuthStore()
  const [load, setLoad] = useState<Load>({ kind: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const userId = user?.id

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    ;(async () => {
      try {
        const profile = await loadMyProfile(userId)
        if (cancelled) return
        if (!profile) { setLoad({ kind: 'empty' }); return }
        const [modules, business] = await Promise.all([loadModules(profile.id), loadBusiness(profile.restaurant_id)])
        if (!cancelled) setLoad({ kind: 'ready', profile, modules, business })
      } catch (e) {
        if (!cancelled) setLoad({ kind: 'error', message: friendlyError(e) })
      }
    })()
    return () => { cancelled = true }
  }, [userId, attempt])

  // Fondo oscuro sin flashes
  useEffect(() => {
    const prev = document.body.style.background
    document.body.style.background = '#111311'
    return () => { document.body.style.background = prev }
  }, [])

  if (!initialized || loading) return <Centered><span className="st-spinner" aria-label="Cargando" /></Centered>
  if (!user) return <Navigate to="/login" replace />

  if (load.kind === 'loading') return <Centered><span className="st-spinner" aria-label="Cargando" /></Centered>
  if (load.kind === 'error') {
    return (
      <Centered>
        <div className="st-stack" style={{ alignItems: 'center', textAlign: 'center' }}>
          <p>{load.message}</p>
          <Button variant="primary" onClick={() => { setLoad({ kind: 'loading' }); setAttempt(a => a + 1) }}>Reintentar</Button>
        </div>
      </Centered>
    )
  }
  if (load.kind === 'empty') {
    return (
      <div className="st-root">
        <CreateProfileScreen userId={user.id} onCreated={profile => setLoad({ kind: 'ready', profile, modules: [], business: null })} />
      </div>
    )
  }

  return <StudioReady key={load.profile.id} userId={user.id} initial={load} />
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="st-root"><div className="st-center">{children}</div></div>
}

function StudioReady({ userId, initial }: {
  userId: string
  initial: { profile: StudioProfile; modules: StudioModule[]; business: StudioBusiness | null }
}) {
  const [profile, setProfile] = useState(initial.profile)
  const [modules, setModulesState] = useState(initial.modules)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const pending = useRef<ProfilePatch>({})
  const timer = useRef<number | null>(null)
  const inFlight = useRef(false)
  const flushRef = useRef<() => Promise<void>>(async () => undefined)
  const location = useLocation()
  const signOut = useAuthStore(s => s.signOut)

  const flush = useCallback(async () => {
    if (timer.current) { window.clearTimeout(timer.current); timer.current = null }
    if (inFlight.current || Object.keys(pending.current).length === 0) return
    const toSave = pending.current
    pending.current = {}
    inFlight.current = true
    setSaveState('saving')
    try {
      const saved = await updateProfile(initial.profile.id, toSave)
      setProfile(p => ({ ...p, updated_at: saved.updated_at, published_at: saved.published_at }))
      inFlight.current = false
      // Si se editó mientras se guardaba, guardar lo nuevo
      if (Object.keys(pending.current).length) void flushRef.current()
      else setSaveState('saved')
    } catch (e) {
      inFlight.current = false
      pending.current = { ...toSave, ...pending.current }
      setSaveError(friendlyError(e))
      setSaveState('error')
    }
  }, [initial.profile.id])

  useEffect(() => { flushRef.current = flush }, [flush])

  const patchProfile = useCallback((patch: ProfilePatch) => {
    setProfile(p => ({ ...p, ...patch }))
    pending.current = { ...pending.current, ...patch }
    setSaveState('saving')
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => { void flush() }, 700)
  }, [flush])

  // No perder cambios: guardar al salir de Studio y avisar si se cierra la pestaña con cambios pendientes
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (Object.keys(pending.current).length || inFlight.current) e.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      void flush()
    }
  }, [flush])

  const setModules = useCallback((updater: (prev: StudioModule[]) => StudioModule[]) => setModulesState(updater), [])

  const value = useMemo<StudioContextValue>(() => ({
    userId,
    profile,
    modules,
    business: initial.business,
    saveState,
    saveError,
    patchProfile,
    retrySave: () => { void flush() },
    replaceProfile: setProfile,
    setModules,
    publicUrl: `${publicBaseUrl()}/${profile.username}`,
    previewProfile: toPublicProfile(profile, modules, initial.business),
  }), [userId, profile, modules, initial.business, saveState, saveError, patchProfile, flush, setModules])

  const showPane = location.pathname !== '/studio/preview'

  return (
    <StudioContext.Provider value={value}>
      <div className="st-root">
        <div className="st-layout">
          <nav className="st-sidebar" aria-label="Studio">
            <a className="st-logo" href="/studio">mycen.<small>Studio</small></a>
            {NAV.map(item => (
              <NavLink key={item.to} to={item.to} end={item.end} className="st-nav-item">
                <item.icon size={18} aria-hidden="true" /> {item.label}
              </NavLink>
            ))}
            <div className="st-sidebar-footer">
              {initial.business && (
                <a className="st-nav-item" href="/dashboard"><LayoutGrid size={18} aria-hidden="true" /> Mycen Business</a>
              )}
              <a className="st-nav-item" href="/life"><UserRound size={18} aria-hidden="true" /> Life OS</a>
              <button type="button" className="st-nav-item" style={{ border: 0, background: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                onClick={() => { void signOut() }}>
                <LogOut size={18} aria-hidden="true" /> Cerrar sesión
              </button>
            </div>
          </nav>

          <main className="st-main">
            <div className="st-main-inner">
              <Outlet />
            </div>
          </main>

          {showPane && <PreviewPane />}
        </div>

        <nav className="st-bottom-nav" aria-label="Studio">
          {MOBILE_NAV.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end}>
              <item.icon size={20} aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </StudioContext.Provider>
  )
}
