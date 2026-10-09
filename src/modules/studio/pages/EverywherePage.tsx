import { Check, Copy } from 'lucide-react'
import { useStudio } from '../StudioContext'
import { useCopy } from '../lib/useCopy'
import { Button, PageHeader } from '../components/ui'
import { PLATFORMS, PLATFORM_SRC, useEverywhereT, type Platform } from '@/i18n/app/share/everywhere'
import { trackEvent } from '@/lib/productEvents'

/**
 * "Poné tu Mycen en todos lados" (V1 · etapa 08): copiar el link y pasos breves por plataforma. Cada plataforma copia
 * su propio link con ?src= (Instagram → ig, WhatsApp → wa…), así los resultados de la semana muestran de dónde llegan.
 * Los textos están en un solo archivo (src/i18n/app/share/everywhere.ts) porque los menús de las apps cambian seguido.
 */
export function EverywherePage() {
  const { publicUrl } = useStudio()
  const t = useEverywhereT()
  const { copied, copy } = useCopy()
  const linkFor = (p: Platform) => `${publicUrl}?src=${PLATFORM_SRC[p]}`
  const shown = publicUrl.replace(/^https?:\/\//, '')

  return (
    <>
      <PageHeader title={t.title} subtitle={t.subtitle} />

      <section className="st-card st-stack">
        <h2 className="st-card-title" style={{ margin: 0 }}>{t.yourLink}</h2>
        <div className="st-row">
          <span className="st-url" title={publicUrl}>{shown}</span>
          <Button size="sm" variant="primary" onClick={() => copy(publicUrl)}>
            {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />} {copied ? t.copied : t.copyLink}
          </Button>
        </div>
        <p className="st-help" style={{ margin: 0 }}>{t.note}</p>
      </section>

      <ul className="st-everywhere" aria-label={t.title}>
        {PLATFORMS.map(p => (
          <li key={p} className="st-card st-stack">
            <h2 className="st-everywhere-name">{t.names[p]}</h2>
            <ol className="st-everywhere-steps">
              {t.steps[p].map(step => <li key={step}>{step}</li>)}
            </ol>
            <CopyFor label={t.copyFor(t.names[p])} done={t.copied} url={linkFor(p)} platform={p} />
          </li>
        ))}
      </ul>
    </>
  )
}

function CopyFor({ label, done, url, platform }: { label: string; done: string; url: string; platform: string }) {
  const { copied, copy } = useCopy()
  return (
    <Button size="sm" onClick={() => { trackEvent('share_tool_used', { platform }); void copy(url) }} aria-label={copied ? done : label} style={{ alignSelf: 'flex-start' }}>
      {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />} {copied ? done : label}
    </Button>
  )
}
