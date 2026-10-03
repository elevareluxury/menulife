import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Globe, Share2 } from 'lucide-react'
import { APP_LANGS, LANG_INFO, langDir } from '@/i18n/app/languages'
import { tr, ui } from '../lib/profileI18n'
import { safeHref } from '../lib/safeUrl'
import { ensureProfileFont } from '../lib/profileTheme'
import type { ProfileLang } from '../lib/profileTypes'
import type { PublicProject } from '../lib/projectTypes'
import { ProjectBlocks } from './ProjectBlocks'
import { SafeImage } from './SafeImage'
import '../profile.css'

/** Página de un proyecto: /{username}/projects/{slug}. */
export function ProjectView({ project, lang, onLang, style, onToast, toast }: {
  project: PublicProject
  lang: ProfileLang
  onLang: (l: ProfileLang) => void
  style: React.CSSProperties
  onToast: (msg: string) => void
  toast: string | null
}) {
  const t = ui(lang)
  const space = project.space
  const owner = tr(space.display_name, space.translations, 'display_name', lang) || space.username
  const title = tr(project.title, project.translations, 'title', lang)
  const summary = tr(project.summary, project.translations, 'summary', lang)
  const cover = safeHref(project.cover_url)
  const url = `${window.location.origin}/${space.username}/projects/${project.slug}`
  useEffect(() => { ensureProfileFont(space.theme?.title_font) }, [space.theme?.title_font])

  async function share() {
    if (navigator.share) {
      try { await navigator.share({ title, text: summary || title, url }) } catch { /* canceló */ }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      onToast(t.linkCopied)
    } catch { /* clipboard no disponible */ }
  }

  return (
    <main className="mp-root" style={style} lang={lang} dir={langDir(lang)}>
      {project.status !== 'published' && <div className="mp-banner" role="status">{t.projectDraftBanner}</div>}

      <header className="mp-topbar">
        <Link to="/" className="mp-brand" aria-label="Mycen">mycen.</Link>
        <div className="mp-topbar-actions">
          <label className="mp-lang-select" title={t.languageLabel}>
            <Globe size={15} aria-hidden="true" />
            <span aria-hidden="true">{lang.toUpperCase()}</span>
            <select value={lang} aria-label={t.languageLabel} onChange={e => onLang(e.target.value as ProfileLang)}>
              {APP_LANGS.map(code => <option key={code} value={code} lang={code}>{LANG_INFO[code].native}</option>)}
            </select>
          </label>
          <button type="button" className="mp-icon-btn" onClick={share} aria-label={t.share}>
            <Share2 size={17} aria-hidden="true" />
          </button>
        </div>
      </header>

      <article className="mp-container">
        <Link to={`/${space.username}`} className="mp-project-back" aria-label={`${t.backToProfile}: ${owner}`}>
          <span className="mp-avatar">
            <SafeImage src={safeHref(space.avatar_url) ?? undefined} alt=""
              fallback={<span aria-hidden="true">{owner.trim()[0]?.toUpperCase() ?? '·'}</span>} />
          </span>
          {owner}
        </Link>

        {cover && <SafeImage className="mp-project-hero" src={cover} alt="" />}
        <header className="mp-project-head">
          <h1>{title}</h1>
          {summary && <p>{summary}</p>}
        </header>

        <ProjectBlocks blocks={project.blocks ?? []} lang={lang} />

        <footer className="mp-footer">
          {t.footer} · <Link to="/register">{t.createYours}</Link>
        </footer>
      </article>

      {toast && <div className="mp-toast" role="status">{toast}</div>}
    </main>
  )
}
