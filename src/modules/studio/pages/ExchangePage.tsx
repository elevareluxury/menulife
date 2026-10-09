import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { Check, Copy, Download, ExternalLink, Globe2, Share2 } from 'lucide-react'
import { useStudio } from '../StudioContext'
import type { ContactCardSettings } from '../lib/studioTypes'
import { useCopy } from '../lib/useCopy'
import { Button, PageHeader, TextField, Toggle } from '../components/ui'
import { ProfileSaveIndicator } from '../components/shared'
import { IdentityCardSection, IntroSection } from '../components/ConnectSections'
import { useStudioT } from '@/i18n/app/studio'
import { huellaSeed } from '@/lib/huella'
import { QR_COLORS } from '@/design/themes'
import { profileLook } from '@/modules/profile/lib/profileLook'
import { HuellaQr } from '../components/HuellaQr'
import { HUELLA_QR_SIZE } from '../lib/huellaQr'
import { useEverywhereT } from '@/i18n/app/share/everywhere'

function svgToPng(svg: SVGSVGElement, width: number, height: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const data = new XMLSerializer().serializeToString(svg)
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('canvas')); return }
      ctx.fillStyle = QR_COLORS.bg
      ctx.fillRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = reject
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(data)))
  })
}

function download(href: string, filename: string) {
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export function ExchangePage() {
  const { profile, publicUrl, patchProfile, handle } = useStudio()
  const qrRef = useRef<SVGSVGElement>(null)
  const everywhere = useEverywhereT()
  const look = profileLook(profile.theme)
  const { copied, copy } = useCopy()
  const x = useStudioT().exchange
  // El QR lleva ?src=qr para medir cuántas visitas llegan por QR
  const qrUrl = `${publicUrl}?src=qr`
  const card = profile.contact_card ?? { enabled: false }
  const setCard = (patch: Partial<ContactCardSettings>) => patchProfile({ contact_card: { ...card, ...patch } })
  const isPublished = profile.status === 'published'

  async function share() {
    if (navigator.share) {
      try { await navigator.share({ title: profile.display_name, url: publicUrl }) } catch { /* cancelado */ }
    } else {
      await copy(publicUrl)
    }
  }

  async function downloadPng() {
    const svg = qrRef.current
    // 2× el tamaño de la pieza: nítido para imprimir en tamaño tarjeta
    if (svg) download(await svgToPng(svg, HUELLA_QR_SIZE.width * 2, HUELLA_QR_SIZE.height * 2), `mycen-${handle.replace('/', '-')}-qr.png`)
  }

  function downloadSvg() {
    const svg = qrRef.current
    if (!svg) return
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    download(url, `mycen-${handle.replace('/', '-')}-qr.svg`)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <>
      <PageHeader title={x.title} subtitle={x.subtitle} actions={<ProfileSaveIndicator />} />

      {!isPublished && (
        <p className="st-card st-help" role="status" style={{ marginTop: 0 }}>
          {x.unpublished}
        </p>
      )}

      <section className="st-card st-stack">
        <h2 className="st-card-title" style={{ margin: 0 }}>{x.yourLink}</h2>
        <div className="st-row">
          <span className="st-url" title={publicUrl}>{publicUrl.replace(/^https?:\/\//, '')}</span>
        </div>
        <div className="st-row" style={{ flexWrap: 'wrap' }}>
          <Button size="sm" onClick={() => copy(publicUrl)}>
            {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />} {copied ? x.copied : x.copyLink}
          </Button>
          <Button size="sm" onClick={share}><Share2 size={15} aria-hidden="true" /> {x.share}</Button>
          <a className="st-btn st-btn-ghost st-btn-sm" href={publicUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={15} aria-hidden="true" /> {x.openProfile}
          </a>
        </div>
        <Link to="/studio/everywhere" className="st-btn st-btn-secondary st-btn-sm" style={{ alignSelf: 'flex-start' }}>
          <Globe2 size={15} aria-hidden="true" /> {everywhere.title}
        </Link>
      </section>

      <section className="st-card st-stack" style={{ alignItems: 'center', textAlign: 'center' }}>
        <h2 className="st-card-title" style={{ margin: 0, alignSelf: 'flex-start' }}>{x.qr}</h2>
        <HuellaQr svgRef={qrRef} url={qrUrl} seed={huellaSeed(profile)} variant={look.huellaVariant} accent={look.accent}
          label={publicUrl.replace(/^https?:\/\//, '')} title={x.qrOf(profile.display_name)} />
        <p className="st-help" style={{ margin: 0 }}>{x.leadsTo(publicUrl.replace(/^https?:\/\//, ''))}</p>
        <div className="st-row">
          <Button size="sm" onClick={downloadPng}><Download size={15} aria-hidden="true" /> PNG</Button>
          <Button size="sm" onClick={downloadSvg}><Download size={15} aria-hidden="true" /> {x.svgPrint}</Button>
        </div>
      </section>

      <IdentityCardSection />
      <IntroSection />

      <section className="st-card st-stack">
        <Toggle label={x.saveContact}
          description={x.saveContactHelp}
          checked={!!card.enabled} onChange={v => setCard({ enabled: v })} />
        {card.enabled && (
          <div className="st-grid-2">
            <TextField label={x.name} required value={card.name ?? ''} onChange={v => setCard({ name: v })}
              placeholder={profile.display_name} maxLength={80} />
            <TextField label={x.jobTitle} value={card.title ?? ''} onChange={v => setCard({ title: v })} maxLength={80} />
            <TextField label={x.company} value={card.organization ?? ''} onChange={v => setCard({ organization: v })} maxLength={80} />
            <TextField label={x.email} type="email" value={card.email ?? ''} onChange={v => setCard({ email: v })} />
            <TextField label={x.phone} type="tel" value={card.phone ?? ''} onChange={v => setCard({ phone: v })} />
            <TextField label={x.whatsapp} type="tel" value={card.whatsapp ?? ''} onChange={v => setCard({ whatsapp: v })} />
            <TextField label={x.web} type="url" value={card.website ?? ''} onChange={v => setCard({ website: v })} />
          </div>
        )}
        {card.enabled && (
          <p className="st-help" style={{ margin: 0 }}>
            {x.privacyNote}
          </p>
        )}
      </section>
    </>
  )
}
