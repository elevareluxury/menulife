import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { isReservedUsername } from '@/lib/reservedUsernames'
import { useAppLang } from '@/i18n/app/store'
import { setLocalLanguage } from '@/lib/prefs'
import { fetchPublicProject } from '../lib/profileApi'
import { tr, ui } from '../lib/profileI18n'
import { themeVars } from '../lib/profileTheme'
import { usePrefersLight } from '../lib/usePrefersLight'
import type { ProjectLookup } from '../lib/projectTypes'
import { ProjectView } from '../components/ProjectView'
import '../profile.css'

type LoadState = { kind: 'loading' } | { kind: 'error' } | ProjectLookup

function setMeta(name: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.name = name
    document.head.appendChild(el)
  }
  el.content = content
}

/** /{username}/projects/{slug} */
export function ProjectPublicPage() {
  const { slug = '', projectSlug = '' } = useParams<{ slug: string; projectSlug: string }>()
  const navigate = useNavigate()
  const lang = useAppLang(s => s.lang)
  const [loaded, setLoaded] = useState<{ key: string; state: LoadState } | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const key = `${slug}/${projectSlug}#${attempt}`

  useEffect(() => {
    if (isReservedUsername(slug)) { navigate('/', { replace: true }); return }
    let cancelled = false
    fetchPublicProject(slug, projectSlug)
      .then(result => {
        if (cancelled) return
        if (result.kind === 'redirect') {
          navigate(`/${result.username}/projects/${projectSlug}${window.location.search}`, { replace: true })
          return
        }
        setLoaded({ key, state: result })
      })
      .catch(() => { if (!cancelled) setLoaded({ key, state: { kind: 'error' } }) })
    return () => { cancelled = true }
  }, [slug, projectSlug, key, navigate])

  const state: LoadState = loaded?.key === key ? loaded.state : { kind: 'loading' }
  const project = state.kind === 'found' ? state.project : null

  useEffect(() => {
    if (!project) return
    const prevTitle = document.title
    const title = tr(project.title, project.translations, 'title', lang)
    const owner = tr(project.space.display_name, project.space.translations, 'display_name', lang)
    document.title = owner ? `${title} · ${owner}` : title
    setMeta('description', tr(project.summary, project.translations, 'summary', lang).slice(0, 160) || title)
    return () => { document.title = prevTitle }
  }, [project, lang])

  // No listado (el proyecto o su Space): se ve con el link, sin indexar
  const noindex = !!project && (project.visibility === 'unlisted' || project.space.visibility === 'unlisted')
  useEffect(() => {
    if (!noindex) return
    setMeta('robots', 'noindex')
    return () => { document.querySelector('meta[name="robots"]')?.remove() }
  }, [noindex])

  const prefersLight = usePrefersLight()
  const vars = themeVars(project?.space.theme, prefersLight)
  const pageBg = String((vars as Record<string, string>)['--p-bg'])

  useEffect(() => {
    const prev = document.body.style.background
    document.body.style.background = pageBg
    return () => { document.body.style.background = prev }
  }, [pageBg])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2200)
  }, [])

  const t = ui(lang)

  if (state.kind === 'loading') {
    return (
      <main className="mp-root" style={vars} aria-busy="true">
        <div className="mp-container" style={{ paddingTop: 72 }}>
          <div className="mp-skeleton" style={{ aspectRatio: '16 / 9', marginBottom: 18 }} />
          <div className="mp-skeleton" style={{ width: '70%', height: 34, marginBottom: 12 }} />
          <div className="mp-skeleton" style={{ height: 64 }} />
        </div>
      </main>
    )
  }
  if (!project) {
    const copy = state.kind === 'unavailable'
      ? { title: t.projectUnavailableTitle, text: t.projectUnavailableText }
      : state.kind === 'error'
        ? { title: t.errorTitle, text: t.errorText }
        : { title: t.projectNotFoundTitle, text: t.projectNotFoundText }
    return (
      <main className="mp-root" style={vars}>
        <div className="mp-state">
          <h1>{copy.title}</h1>
          <p>{copy.text}</p>
          {state.kind === 'error'
            ? <button type="button" className="mp-primary" style={{ width: 'auto' }} onClick={() => setAttempt(a => a + 1)}>{t.retry}</button>
            : <Link className="mp-primary" style={{ width: 'auto' }} to={`/${slug}`}>{t.backToProfile}</Link>}
        </div>
      </main>
    )
  }

  return <ProjectView project={project} lang={lang} onLang={setLocalLanguage} style={vars} onToast={showToast} toast={toast} />
}
