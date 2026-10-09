import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom'
import { BarChart3, FolderOpen, Home, Inbox, Layers, LayoutGrid, LogOut, MoreHorizontal, Palette, PanelsLeftRight, PenLine, Settings, Share2, UserRound } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { StudioContext, type StudioContextValue } from './StudioContext'
import {
  friendlyError, loadBusiness, loadModules, loadMySpaces, loadProfile, loadPublishState, publishSpace,
  restoreSpaceVersion, updateProfile,
} from './lib/studioApi'
import { pickSpace, primarySpace, readActiveSpace, spaceHandle, writeActiveSpace, type SpaceSummary } from './lib/spaces'
import { SpaceSwitcher } from './components/SpaceSwitcher'
import { publicBaseUrl, toPublicProfile } from './lib/preview'
import type { ProfilePatch, PublishState, SaveState, StudioBusiness, StudioModule, StudioProfile, StudioProject } from './lib/studioTypes'
import { listProjects } from './lib/projectsApi'
import { PreviewPane } from './components/PreviewPane'
import { OnboardingWizard } from './components/OnboardingWizard'
import { Button } from './components/ui'
import { PublishBar } from './components/PublishBar'
import { useStudioSurface, useStudioTheme } from './lib/useStudioTheme'
import { useStudioT, type StudioDict } from '@/i18n/app/studio'
import { useAppLang } from '@/i18n/app/store'
import { langDir } from '@/i18n/app/languages'
import { useUnreadMessages } from './lib/useUnreadMessages'
import './studio.css'

type NavKey = keyof StudioDict['nav']

interface HistoryEntry { keys: string[]; before: ProfilePatch; after: ProfilePatch; at: number }
/** Cambios que no se deshacen con Ctrl+Z (se manejan con su propia confirmación). */
const UNDOABLE_SKIP = new Set<keyof ProfilePatch>(['status', 'onboarding_step', 'visibility'])

const NAV: { to: string; label: NavKey; icon: typeof Home; end?: boolean; desktopOnly?: boolean }[] = [
  { to: '/studio',            label: 'home',       icon: Home, end: true },
  { to: '/studio/identity',   label: 'identity',   icon: UserRound },
  { to: '/studio/modules',    label: 'modules',    icon: LayoutGrid },
  { to: '/studio/editor',     label: 'editor',     icon: PanelsLeftRight, desktopOnly: true },
  { to: '/studio/projects',   label: 'projects',   icon: FolderOpen },
  { to: '/studio/appearance', label: 'appearance', icon: Palette },
  { to: '/studio/exchange',   label: 'exchange',   icon: Share2 },
  { to: '/studio/messages',   label: 'messages',   icon: Inbox },
  { to: '/studio/analytics',  label: 'analytics',  icon: BarChart3 },
  { to: '/studio/settings',   label: 'settings',   icon: Settings },
  { to: '/studio/spaces',     label: 'spaces',     icon: Layers },
]

const MOBILE_NAV: { to: string; label: NavKey; icon: typeof Home; end?: boolean }[] = [
  { to: '/studio',          label: 'home',     icon: Home, end: true },
  { to: '/studio/identity', label: 'edit',     icon: PenLine },
  { to: '/studio/spaces',   label: 'spaces',   icon: Layers },
  { to: '/studio/exchange', label: 'exchange', icon: Share2 },
  { to: '/studio/more',     label: 'more',     icon: MoreHorizontal },
]

type Load =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'empty' }
  | { kind: 'ready'; profile: StudioProfile; modules: StudioModule[]; business: StudioBusiness | null; spaces: SpaceSummary[] }

export function StudioShell() {
  const { user, initialized, loading } = useAuthStore()
  const [load, setLoad] = useState<Load>({ kind: 'loading' })
  const [attempt, setAttempt] = useState(0)
  // Space elegido en esta sesión (Fase 10); si no, el recordado en este dispositivo o el principal
  const [chosen, setChosen] = useState<string | null>(null)
  const userId = user?.id
  const t = useStudioT()
  const dir = langDir(useAppLang(s => s.lang))

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    ;(async () => {
      try {
        const spaces = await loadMySpaces(userId)
        if (cancelled) return
        const active = pickSpace(spaces, chosen ?? readActiveSpace(userId))
        if (!active) { setLoad({ kind: 'empty' }); return }
        const [profile, modules] = await Promise.all([loadProfile(active.id), loadModules(active.id)])
        const business = await loadBusiness(profile.restaurant_id)
        if (!cancelled) setLoad({ kind: 'ready', profile, modules, business, spaces })
      } catch (e) {
        if (!cancelled) setLoad({ kind: 'error', message: friendlyError(e) })
      }
    })()
    return () => { cancelled = true }
  }, [userId, attempt, chosen])

  // Cambiar de Space: lo pendiente se guarda al desmontar el editor (StudioReady) y se abre el otro
  const switchSpace = useCallback((id: string) => {
    if (!userId) return
    writeActiveSpace(userId, id)
    setLoad({ kind: 'loading' })
    setChosen(id)
    setAttempt(a => a + 1)
  }, [userId])

  // Tema del celular (Universo / Amanecer) y su fondo sin flashes
  const theme = useStudioSurface()

  if (!initialized || loading) return <Centered><span className="st-spinner" aria-label={t.nav.loading} /></Centered>
  if (!user) return <Navigate to="/login" replace />

  if (load.kind === 'loading') return <Centered><span className="st-spinner" aria-label={t.nav.loading} /></Centered>
  if (load.kind === 'error') {
    return (
      <Centered>
        <div className="st-stack" style={{ alignItems: 'center', textAlign: 'center' }}>
          <p>{load.message}</p>
          <Button variant="primary" onClick={() => { setLoad({ kind: 'loading' }); setAttempt(a => a + 1) }}>{t.nav.retry}</Button>
        </div>
      </Centered>
    )
  }
  // Onboarding guiado: sin perfil, o con un onboarding a medio terminar (pasos 3–4)
  const resuming = load.kind === 'ready' && (load.profile.onboarding_step === 3 || load.profile.onboarding_step === 4)
  if (load.kind === 'empty' || resuming) {
    const suggestedName = (user.user_metadata as { name?: string } | undefined)?.name
    return (
      <div className="st-root" data-mycen-theme={theme} data-scroll-root dir={dir}>
        <OnboardingWizard
          userId={user.id}
          initialProfile={load.kind === 'ready' ? load.profile : null}
          initialModules={load.kind === 'ready' ? load.modules : []}
          suggestedName={suggestedName}
          onDone={(profile, modules) => setLoad({
            kind: 'ready', profile, modules,
            business: load.kind === 'ready' ? load.business : null,
            spaces: load.kind === 'ready' ? load.spaces.map(s => (s.id === profile.id ? profile : s)) : [profile],
          })}
        />
      </div>
    )
  }

  return <StudioReady key={load.profile.id} userId={user.id} initial={load} switchSpace={switchSpace} />
}

/** Contador de mensajes sin leer junto a "Mensajes" (o "Más" en el celular) */
function UnreadBadge({ count, label }: { count: number; label: string }) {
  if (!count) return null
  return (
    <span className="st-unread" aria-label={label.replace('{n}', String(count))}>{count > 99 ? '99+' : count}</span>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  const dir = langDir(useAppLang(s => s.lang))
  const theme = useStudioTheme()
  return <div className="st-root" data-mycen-theme={theme} data-scroll-root dir={dir}><div className="st-center">{children}</div></div>
}

function StudioReady({ userId, initial, switchSpace }: {
  userId: string
  initial: { profile: StudioProfile; modules: StudioModule[]; business: StudioBusiness | null; spaces: SpaceSummary[] }
  switchSpace: (id: string) => void
}) {
  const [profile, setProfile] = useState(initial.profile)
  const [spaceList, setSpaceList] = useState(initial.spaces)
  const [modules, setModulesState] = useState(initial.modules)
  const [projects, setProjectsState] = useState<StudioProject[]>([])
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [conflict, setConflict] = useState(false)
  const [publishState, setPublishState] = useState<PublishState | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)
  const pending = useRef<ProfilePatch>({})
  // Revisión que conoce esta pestaña: si otra guardó antes, la base rechaza el guardado (Fase 3)
  const revision = useRef(initial.profile.revision ?? 0)
  const profileRef = useRef(initial.profile)
  useEffect(() => { profileRef.current = profile }, [profile])
  // Deshacer/rehacer de esta sesión (sólo campos del perfil; los módulos se confirman en su panel)
  const history = useRef<{ past: HistoryEntry[]; future: HistoryEntry[] }>({ past: [], future: [] })
  const [historyCounts, setHistoryCounts] = useState({ past: 0, future: 0 })
  const syncHistory = useCallback(() => setHistoryCounts({
    past: history.current.past.length, future: history.current.future.length,
  }), [])
  const timer = useRef<number | null>(null)
  const inFlight = useRef(false)
  const flushRef = useRef<() => Promise<void>>(async () => undefined)
  const location = useLocation()
  const signOut = useAuthStore(s => s.signOut)
  const t = useStudioT()
  // Mensajes sin leer del formulario de contacto (V1 · etapa 05): en la navegación y en el Inicio
  const { count: unread } = useUnreadMessages()
  const dir = langDir(useAppLang(s => s.lang))

  const flush = useCallback(async () => {
    if (timer.current) { window.clearTimeout(timer.current); timer.current = null }
    if (inFlight.current || Object.keys(pending.current).length === 0) return
    const toSave = pending.current
    pending.current = {}
    inFlight.current = true
    setSaveState('saving')
    try {
      const saved = await updateProfile(initial.profile.id, toSave, revision.current)
      revision.current = saved.revision
      setProfile(p => ({ ...p, updated_at: saved.updated_at, published_at: saved.published_at, revision: saved.revision }))
      inFlight.current = false
      // Si se editó mientras se guardaba, guardar lo nuevo
      if (Object.keys(pending.current).length) void flushRef.current()
      else setSaveState('saved')
    } catch (e) {
      inFlight.current = false
      pending.current = { ...toSave, ...pending.current }
      if ((e as Error)?.message === 'REVISION_CONFLICT') setConflict(true)
      setSaveError(friendlyError(e))
      setSaveState('error')
    }
  }, [initial.profile.id])

  useEffect(() => { flushRef.current = flush }, [flush])

  const applyPatch = useCallback((patch: ProfilePatch) => {
    setProfile(p => ({ ...p, ...patch }))
    pending.current = { ...pending.current, ...patch }
    setSaveState('saving')
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => { void flush() }, 700)
  }, [flush])

  const patchProfile = useCallback((patch: ProfilePatch) => {
    const keys = (Object.keys(patch) as (keyof ProfilePatch)[]).filter(k => !UNDOABLE_SKIP.has(k))
    if (keys.length) {
      const current = profileRef.current
      const before = Object.fromEntries(keys.map(k => [k, current[k]])) as ProfilePatch
      const after = Object.fromEntries(keys.map(k => [k, patch[k]])) as ProfilePatch
      const past = history.current.past
      const last = past[past.length - 1]
      const sameFields = last && last.keys.join() === keys.join() && Date.now() - last.at < 1200
      // Escribir seguido en el mismo campo cuenta como un solo paso
      if (sameFields) { last.after = after; last.at = Date.now() }
      else past.push({ keys: keys as string[], before, after, at: Date.now() })
      if (past.length > 100) past.shift()
      history.current.future = []
      syncHistory()
    }
    applyPatch(patch)
  }, [applyPatch, syncHistory])

  const undo = useCallback(() => {
    const entry = history.current.past.pop()
    if (!entry) return
    history.current.future.push(entry)
    syncHistory()
    applyPatch(entry.before)
  }, [applyPatch, syncHistory])

  const redo = useCallback(() => {
    const entry = history.current.future.pop()
    if (!entry) return
    history.current.past.push({ ...entry, at: 0 })
    syncHistory()
    applyPatch(entry.after)
  }, [applyPatch, syncHistory])

  // Ctrl/Cmd+Z y Ctrl/Cmd+Shift+Z fuera de los campos de texto (ahí manda el deshacer del navegador)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z') return
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return
      e.preventDefault()
      if (e.shiftKey) redo(); else undo()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])

  // ── Publicación ────────────────────────────────────────────────────────────
  const refreshPublishState = useCallback(async () => {
    try { setPublishState(await loadPublishState(initial.profile.id)) } catch { /* se reintenta en el próximo cambio */ }
  }, [initial.profile.id])

  // Después de cada guardado (perfil o módulos) se recalcula si hay cambios sin publicar
  useEffect(() => {
    if (saveState === 'saving') return
    const id = window.setTimeout(() => { void refreshPublishState() }, publishState ? 400 : 0)
    return () => window.clearTimeout(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- publishState sólo decide la demora inicial
  }, [profile.updated_at, profile.status, modules, saveState, refreshPublishState])

  const publish = useCallback(async () => {
    setPublishing(true); setPublishError(null)
    try {
      await flush()
      if (Object.keys(pending.current).length) throw new Error(saveError ?? 'SAVE_FAILED')
      await publishSpace(initial.profile.id)
      const fresh = await loadProfile(initial.profile.id)
      revision.current = fresh.revision
      setProfile(p => ({ ...p, status: fresh.status, published_at: fresh.published_at, published_version_id: fresh.published_version_id }))
      await refreshPublishState()
    } catch (e) {
      setPublishError(friendlyError(e))
    } finally { setPublishing(false) }
  }, [flush, initial.profile.id, refreshPublishState, saveError])

  const restoreVersion = useCallback(async (versionId: string) => {
    const res = await restoreSpaceVersion(versionId)
    const [fresh, mods] = await Promise.all([loadProfile(initial.profile.id), loadModules(initial.profile.id)])
    revision.current = fresh.revision
    pending.current = {}
    history.current = { past: [], future: [] }
    syncHistory()
    setProfile(fresh)
    setModulesState(mods)
    await refreshPublishState()
    return res.version_number
  }, [initial.profile.id, refreshPublishState, syncHistory])

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
  const setProjects = useCallback((updater: (prev: StudioProject[]) => StudioProject[]) => setProjectsState(updater), [])

  // Proyectos de la identidad (Fase 5): para elegirlos en los módulos y mostrarlos en la vista previa
  useEffect(() => {
    const identityId = initial.profile.identity_id
    if (!identityId) return
    let cancelled = false
    listProjects(identityId).then(list => { if (!cancelled) setProjectsState(list) }, () => undefined)
    return () => { cancelled = true }
  }, [initial.profile.identity_id])

  // Mis Spaces (Fase 10): la lista refleja al instante lo que se edita del Space abierto
  const spaces = useMemo(() => spaceList.map(s => (s.id === profile.id
    ? { ...s, display_name: profile.display_name, avatar_url: profile.avatar_url, status: profile.status,
        visibility: profile.visibility, username: profile.username, space_slug: profile.space_slug }
    : s)), [spaceList, profile.id, profile.display_name, profile.avatar_url, profile.status, profile.visibility,
    profile.username, profile.space_slug])
  const primaryUsername = primarySpace(spaces)?.username ?? profile.username ?? ''
  const handle = spaceHandle(profile, primaryUsername)
  const reloadSpaces = useCallback(async () => { setSpaceList(await loadMySpaces(userId)) }, [userId])

  const value = useMemo<StudioContextValue>(() => ({
    userId,
    profile,
    modules,
    business: initial.business,
    saveState,
    saveError,
    patchProfile,
    retrySave: () => { if (conflict) window.location.reload(); else void flush() },
    conflict,
    publishState,
    publishing,
    publishError,
    publish,
    restoreVersion,
    undo,
    redo,
    canUndo: historyCounts.past > 0,
    canRedo: historyCounts.future > 0,
    replaceProfile: setProfile,
    setModules,
    projects,
    setProjects,
    publicUrl: `${publicBaseUrl()}/${handle}`,
    previewProfile: toPublicProfile(profile, modules, initial.business, projects, handle),
    spaces,
    handle,
    primaryUsername,
    switchSpace,
    reloadSpaces,
  }), [userId, profile, modules, projects, setProjects, initial.business, saveState, saveError, patchProfile, flush, setModules,
      conflict, publishState, publishing, publishError, publish, restoreVersion, undo, redo, historyCounts,
      spaces, handle, primaryUsername, switchSpace, reloadSpaces])

  const theme = useStudioTheme()
  // El editor de escritorio (Fase 11) tiene su propia vista previa y usa todo el ancho
  const inDesktopEditor = location.pathname === '/studio/editor'
  const showPane = location.pathname !== '/studio/preview' && !inDesktopEditor
  // En el editor de un proyecto manda su propio estado de publicación (el del perfil confundiría)
  const inProjectEditor = /^\/studio\/projects\/[^/]+/.test(location.pathname)

  return (
    <StudioContext.Provider value={value}>
      <div className="st-root" data-mycen-theme={theme} data-scroll-root dir={dir}>
        <div className="st-layout">
          <nav className="st-sidebar" aria-label="Studio">
            <a className="st-logo" href="/studio">mycen.<small>Studio</small></a>
            {NAV.map(item => (
              <NavLink key={item.to} to={item.to} end={item.end} className={`st-nav-item${item.desktopOnly ? ' st-desktop-only' : ''}`}>
                <item.icon size={18} aria-hidden="true" /> {t.nav[item.label]}
                {item.label === 'messages' && <UnreadBadge count={unread} label={t.messages.unread} />}
              </NavLink>
            ))}
            <div className="st-sidebar-footer">
              {initial.business && (
                <a className="st-nav-item" href="/dashboard"><LayoutGrid size={18} aria-hidden="true" /> {t.nav.business}</a>
              )}
              <a className="st-nav-item" href="/life"><UserRound size={18} aria-hidden="true" /> {t.nav.life}</a>
              <button type="button" className="st-nav-item" style={{ border: 0, background: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                onClick={() => { void signOut() }}>
                <LogOut size={18} aria-hidden="true" className="flip-rtl" /> {t.nav.signOut}
              </button>
            </div>
          </nav>

          <main className="st-main">
            <div className={`st-main-inner${inDesktopEditor ? ' is-wide' : ''}`}>
              {profile.suspended_at && (
                <div className="st-card st-suspended" role="alert">
                  <strong>{t.moderation.suspendedTitle}</strong>
                  <p>{t.moderation.suspendedText}</p>
                  {profile.suspension_reason && <p>{t.moderation.suspendedReason(profile.suspension_reason)}</p>}
                  <a href="/terminos#reglas" target="_blank" rel="noopener noreferrer">{t.moderation.rules}</a>
                </div>
              )}
              {/* Los proyectos son de la identidad: en su editor no hay Space activo */}
              {!inProjectEditor && <SpaceSwitcher />}
              {!inProjectEditor && <PublishBar />}
              <Outlet />
            </div>
          </main>

          {showPane && <PreviewPane />}
        </div>

        {/* En un portal a <body>: ningún contenedor puede alterar su position: fixed */}
        {createPortal(<nav className="st-bottom-nav" aria-label="Studio" data-mycen-theme={theme} dir={dir}>
          {MOBILE_NAV.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end} title={t.nav[item.label]}
              aria-label={item.label === 'more' && unread ? `${t.nav.more}, ${t.messages.unread.replace('{n}', String(unread))}` : t.nav[item.label]}>
              <item.icon size={21} aria-hidden="true" />
              <span className="st-nav-label">{t.nav[item.label]}</span>
              {/* En el celular, Mensajes está en "Más": el contador va ahí */}
              {item.label === 'more' && <UnreadBadge count={unread} label={t.messages.unread} />}
            </NavLink>
          ))}
        </nav>, document.body)}
      </div>
    </StudioContext.Provider>
  )
}
