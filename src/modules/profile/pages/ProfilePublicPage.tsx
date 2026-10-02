import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { isReservedUsername } from '@/lib/reservedUsernames'
import { fetchPublicProfile, trackProfileEvent } from '../lib/profileApi'
import { tr, ui } from '../lib/profileI18n'
import { useAppLang } from '@/i18n/app/store'
import { setLocalLanguage } from '@/lib/prefs'
import { QUIET, themeVars } from '../lib/profileTheme'
import type { ProfileLang, ProfileLookup } from '../lib/profileTypes'
import { ProfileView } from '../components/ProfileView'
import '../profile.css'

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
  const { slug = '' } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  // El resultado se guarda junto a la clave que lo pidió: si cambia el slug, vuelve a "loading" sin setState en el effect
  const [loaded, setLoaded] = useState<{ key: string; state: LoadState } | null>(null)
  // Idioma del visitante: el elegido en este dispositivo o el del navegador
  const lang = useAppLang(s => s.lang)
  const [toast, setToast] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (isReservedUsername(slug)) { navigate('/', { replace: true }); return }
    let cancelled = false
    const key = `${slug}#${attempt}`
    fetchPublicProfile(slug)
      .then(result => {
        if (cancelled) return
        if (result.kind === 'redirect') {
          navigate(`/${result.username}${window.location.search}`, { replace: true })
          return
        }
        setLoaded({ key, state: result })
      })
      .catch(() => { if (!cancelled) setLoaded({ key, state: { kind: 'error' } }) })
    return () => { cancelled = true }
  }, [slug, attempt, navigate])

  const state: LoadState = loaded?.key === `${slug}#${attempt}` ? loaded.state : { kind: 'loading' }

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

  // Fondo del body acorde al tema (evita bordes blancos al hacer scroll)
  useEffect(() => {
    const prev = document.body.style.background
    document.body.style.background = profile?.theme.mode === 'light' ? QUIET.ivory : QUIET.obsidian
    return () => { document.body.style.background = prev }
  }, [profile?.theme.mode])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2200)
  }, [])

  const changeLang = (next: ProfileLang) => setLocalLanguage(next)

  const vars = themeVars(profile?.theme)
  const t = ui(lang)

  if (state.kind === 'loading') return <ProfileSkeleton style={vars} />
  if (state.kind !== 'found' || !profile) {
    const copy = state.kind === 'unavailable'
      ? { title: t.unavailableTitle, text: t.unavailableText }
      : state.kind === 'error'
        ? { title: t.errorTitle, text: t.errorText }
        : { title: t.notFoundTitle, text: t.notFoundText }
    return (
      <main className="mp-root" style={vars}>
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
      profile={profile} lang={lang} onLang={changeLang} style={vars}
      onToast={showToast} toast={toast}
    />
  )
}

function ProfileSkeleton({ style }: { style: React.CSSProperties }) {
  return (
    <main className="mp-root" style={style} aria-busy="true">
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
