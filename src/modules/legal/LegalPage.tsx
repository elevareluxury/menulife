import { Fragment, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useLegalT, type LegalBlock } from '@/i18n/app/legal'
import { useAppLang } from '@/i18n/app/store'
import { langLocale } from '@/i18n/app/languages'
import { useLangDir } from '@/i18n/app/useLangDir'
import { LanguageSelect } from '@/components/ui/LanguageSelect'

// Términos y privacidad (Lanzamiento L4) en los 12 idiomas; el español es la versión de referencia.

type Doc = 'terms' | 'privacy'

const h1: React.CSSProperties = { fontSize: 30, letterSpacing: '-0.02em', margin: '28px 0 8px' }
const h2: React.CSSProperties = { fontSize: 18, margin: '32px 0 6px', scrollMarginTop: 16 }
const muted: React.CSSProperties = { color: '#C9C9BF' }

/** **negrita** dentro de un texto */
function Rich({ text }: { text: string }) {
  return <>{text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
    part.startsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>)}</>
}

function Block({ block }: { block: LegalBlock }) {
  if (typeof block === 'string') return <p><Rich text={block} /></p>
  return <ul style={{ paddingInlineStart: 22 }}>{block.list.map((item, i) => <li key={i} style={{ marginBottom: 6 }}><Rich text={item} /></li>)}</ul>
}

export function LegalPage({ doc }: { doc: Doc }) {
  const t = useLegalT()
  const lang = useAppLang(s => s.lang)
  useLangDir()
  const sections = doc === 'terms' ? t.terms : t.privacy
  const title = doc === 'terms' ? t.ui.termsTitle : t.ui.privacyTitle
  const updated = new Date(`${t.updated}T12:00:00`).toLocaleDateString(langLocale(lang), { dateStyle: 'long' })

  useEffect(() => {
    const prev = document.title
    document.title = `${title} · Mycen`
    return () => { document.title = prev }
  }, [title])

  // Los links con #ancla (ej. /terminos#reglas) bajan a la sección cuando ya cargó el idioma
  useEffect(() => {
    const id = window.location.hash.slice(1)
    if (id) document.getElementById(id)?.scrollIntoView()
  }, [sections])

  return (
    <main style={{ minHeight: '100svh', background: '#111311', color: '#F1F0E9', fontFamily: "'Geist', sans-serif" }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 20px 64px', lineHeight: 1.65, fontSize: 15.5 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <Link to="/" aria-label={t.ui.back} style={{ color: '#F1F0E9', fontWeight: 700, textDecoration: 'none', fontSize: 18 }}>mycen.</Link>
          <LanguageSelect label={t.ui.language} />
        </div>

        <h1 style={h1}>{title}</h1>
        <p style={muted}>{doc === 'terms' ? t.ui.termsIntro : t.ui.privacyIntro}</p>
        <p style={{ ...muted, fontSize: 13.5 }}>{t.ui.updated}: <time dateTime={t.updated}>{updated}</time></p>
        {lang !== 'es' && <p style={{ ...muted, fontSize: 13.5, borderInlineStart: '3px solid #F4705A', paddingInlineStart: 10 }}>{t.ui.reference}</p>}

        <nav aria-label={t.ui.contents} style={{ margin: '20px 0 8px', padding: '14px 18px', borderRadius: 12, background: 'rgba(255,255,255,0.04)' }}>
          <p style={{ margin: '0 0 6px', fontWeight: 600 }}>{t.ui.contents}</p>
          <ol style={{ margin: 0, paddingInlineStart: 20 }}>
            {sections.map(s => <li key={s.id}><a href={`#${s.id}`} style={{ color: '#F1F0E9' }}>{s.title}</a></li>)}
          </ol>
        </nav>

        {sections.map(s => (
          <section key={s.id} aria-labelledby={`h-${s.id}`}>
            <h2 id={s.id} style={h2}><span id={`h-${s.id}`}>{s.title}</span></h2>
            {s.body.map((b, i) => <Block key={i} block={b} />)}
          </section>
        ))}

        <p style={{ ...muted, fontSize: 13.5, marginTop: 40 }}>
          <Link to={doc === 'terms' ? '/privacidad' : '/terminos'} style={{ color: '#F1F0E9' }}>{t.ui.seeOther[doc]}</Link>
          {' · '}
          <a href="mailto:team@mycen.id" style={{ color: '#F1F0E9' }}>team@mycen.id</a>
        </p>
      </div>
    </main>
  )
}
