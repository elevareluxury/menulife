import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { publicRpc } from '@/lib/publicRpc'
import { isSystemUsername } from '@/lib/reservedUsernames'
import { fetchPublicProfile, trackProfileEvent } from '../lib/profileApi'
import { tr, ui } from '../lib/profileI18n'
import { useAppLang } from '@/i18n/app/store'
import { setLocalLanguage } from '@/lib/prefs'
import { LOOK_PAGE_BG, lookVars, profileLook, type ProfileLook } from '../lib/profileLook'
import type { ProfileLang, ProfileLookup } from '../lib/profileTypes'
import { firstScreenImages, preloadImages } from '../lib/profilePrefetch'
import { ProfileView } from '../components/ProfileView'
import { preloadProfileView } from '../components/profileLayouts'
import '../profile.css'

// El campo "Elegí tu nombre" sólo se baja cuando hace falta (no pesa en un perfil que existe)
const FreeName = lazy(() => import('@/components/claim/FreeName').then(m => ({ default: m.FreeName })))

type LoadState = { kind: 'loading' } | { kind: 'error' } | ProfileLookup

function setMeta(name: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.name = name
    document.head.appendChild(el)
  }
  el.content = content
}

export function ProfilePublicPage() {
  const { slug = '', space } = useParams<{ slug: string; space?: string }>()
  // "ana" o "ana/estudio" (Space secundario, Fase 10)
  const handle = space ? `${slug}/${space}` : slug
  const navigate = useNavigate()
  // El resultado se guarda junto a la clave que lo pidió: si cambia el slug, vuelve a "loading" sin setState en el effect
  const [loaded, setLoaded] = useState<{ key: string; state: LoadState } | null>(null)
  // Idioma del visitante: el elegido en este dispositivo o el del navegador
  const lang = useAppLang(s => s.lang)
  const [toast, setToast] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (isSystemUsername(slug)) { navigate('/', { replace: true }); return }
    let cancelled = false
    const key = `${handle}#${attempt}`
    fetchPublicProfile(handle)
      .then(async result => {
        if (cancelled) return
        if (result.kind === 'redirect') {
          navigate(`/${result.username}${window.location.search}`, { replace: true })
          return
        }
        if (result.kind === 'found') {
          // Con el esqueleto a la vista: imágenes de la primera pantalla y los chunks de la estructura y los módulos.
          // El perfil aparece completo de una vez (sin saltos) y la imagen principal ya viene en camino (LCP).
          preloadImages(firstScreenImages(result.profile))
          await preloadProfileView(result.profile)
          if (cancelled) return
        }
        setLoaded({ key, state: result })
      })
      .catch(() => { if (!cancelled) setLoaded({ key, state: { kind: 'error' } }) })
    return () => { cancelled = true }
  }, [slug, handle, attempt, navigate])

  const state: LoadState = loaded?.key === `${handle}#${attempt}` ? loaded.state : { kind: 'loading' }

  const profile = state.kind === 'found' ? state.profile : null

  // Visita: una vez por perfil cargado (la RPC descarta bots, duplicados y al dueño)
  useEffect(() => {
    if (profile?.status === 'published') trackProfileEvent(profile.id, 'view')
  }, [profile?.id, profile?.status])

  // Título y descripción de la pestaña
  useEffect(() => {
    if (!profile) return
    const prevTitle = document.title
    const name = tr(profile.display_name, profile.translations, 'display_name', lang)
    document.title = `${name} · Mycen`
    setMeta('description', tr(profile.bio, profile.translations, 'bio', lang).slice(0, 160) || name)
    return () => { document.title = prevTitle }
  }, [profile, lang])

  // Un Space "no listado" se ve con el link, pero los buscadores no lo indexan; tampoco una dirección sin perfil
  const hidden = profile?.visibility === 'unlisted' || state.kind === 'not_found' || state.kind === 'unavailable'
  useEffect(() => {
    if (!hidden) return
    setMeta('robots', 'noindex')
    return () => { document.querySelector('meta[name="robots"]')?.remove() }
  }, [hidden])

  // Tema del perfil (V1: Universo / Amanecer). Mientras carga, Universo.
  const look = profileLook(profile?.theme)
  const pageBg = LOOK_PAGE_BG[look.mode]

  // Fondo del body acorde al tema (evita bordes blancos al hacer scroll)
  useEffect(() => {
    const prev = document.body.style.background
    document.body.style.background = pageBg
    return () => { document.body.style.background = prev }
  }, [pageBg])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2200)
  }, [])

  const changeLang = (next: ProfileLang) => setLocalLanguage(next)

  const t = ui(lang)

  if (state.kind === 'loading') return <ProfileSkeleton look={look} />
  // Una dirección principal sin perfil: si el nombre está libre, se ofrece ("mycen.id/juan está libre")
  if (state.kind === 'not_found' && !space) return <FreeNameOrMissing slug={slug} look={look} lang={lang} />
  if (state.kind !== 'found' || !profile) {
    const copy = state.kind === 'unavailable'
      ? { title: t.unavailableTitle, text: t.unavailableText }
      : state.kind === 'error'
        ? { title: t.errorTitle, text: t.errorText }
        : { title: t.notFoundTitle, text: t.notFoundText }
    return (
      <main className="mp-root my-profile" {...lookAttrs(look)}>
        <div className="mp-state">
          <h1>{copy.title}</h1>
          <p>{copy.text}</p>
          {state.kind === 'error'
            ? <button type="button" className="mp-primary" style={{ width: 'auto' }} onClick={() => setAttempt(a => a + 1)}>{t.retry}</button>
            : <Link className="mp-primary" style={{ width: 'auto' }} to="/register">{t.createYours}</Link>}
        </div>
      </main>
    )
  }

  return (
    <ProfileView
      profile={profile} lang={lang} onLang={changeLang}
      onToast={showToast} toast={toast}
    />
  )
}

/** Perfil que no existe: si el nombre está libre, la invitación a tomarlo con el campo ya completo; si no (reservado,
 *  de un perfil sin publicar o de un nombre viejo), el aviso de siempre. Mientras consulta, el esqueleto. */
function FreeNameOrMissing({ slug, look, lang }: { slug: string; look: ProfileLook; lang: ProfileLang }) {
  const [free, setFree] = useState<{ slug: string; free: boolean } | null>(null)
  useEffect(() => {
    let cancelled = false
    void publicRpc<string>('check_username', { p_username: slug.toLowerCase() })
      .then(r => { if (!cancelled) setFree({ slug, free: r.data === 'available' }) })
    return () => { cancelled = true }
  }, [slug])
  const t = ui(lang)
  if (free?.slug !== slug) return <ProfileSkeleton look={look} />
  return (
    <main className="mp-root my-profile" {...lookAttrs(look)}>
      <div className="mp-state">
        {free.free ? (
          <Suspense fallback={null}>
            <FreeName slug={slug.toLowerCase()} theme={look.mode} accent={look.accent} lang={lang} />
          </Suspense>
        ) : (
          <>
            <h1>{t.notFoundTitle}</h1>
            <p>{t.notFoundText}</p>
            <Link className="mp-primary" style={{ width: 'auto' }} to="/register">{t.createYours}</Link>
          </>
        )}
      </div>
    </main>
  )
}

/** Tema y acento del sistema de diseño en la raíz (las pantallas de carga y de error usan el mismo aspecto) */
function lookAttrs(look: ProfileLook) {
  return { 'data-mycen-theme': look.mode, 'data-mycen-accent': look.accent, style: lookVars(look) }
}

function ProfileSkeleton({ look }: { look: ProfileLook }) {
  return (
    <main className="mp-root my-profile" {...lookAttrs(look)} aria-busy="true">
      <div className="mp-container" style={{ paddingTop: 72 }}>
        <div className="mp-skeleton" style={{ width: 104, height: 104, borderRadius: '50%', margin: '0 auto 18px' }} />
        <div className="mp-skeleton" style={{ width: '60%', height: 34, margin: '0 auto 10px' }} />
        <div className="mp-skeleton" style={{ width: '40%', height: 16, margin: '0 auto 28px' }} />
        <div className="mp-skeleton" style={{ height: 56, marginBottom: 12 }} />
        <div className="mp-skeleton" style={{ height: 64, marginBottom: 12 }} />
        <div className="mp-skeleton" style={{ height: 64 }} />
      </div>
    </main>
  )
}
