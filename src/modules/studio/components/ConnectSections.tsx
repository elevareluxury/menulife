import { useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Check, Copy, Download, MessageCircle } from 'lucide-react'
import { useStudio } from '../StudioContext'
import { renderIdentityCard, type CardMode } from '../lib/identityCard'
import { useCopy } from '../lib/useCopy'
import { Button, TextField } from './ui'
import { useStudioT } from '@/i18n/app/studio'

// Connect (Identity Fase 7, decisión 1): compartir y guardar contacto, sin agenda ni CRM.

/** Tarjeta de identidad en PNG (clara u oscura) con QR al perfil (?src=card para medirla). */
export function IdentityCardSection() {
  const { profile, publicUrl, handle } = useStudio()
  const x = useStudioT().exchange
  const [mode, setMode] = useState<CardMode>(profile.theme?.mode === 'light' ? 'light' : 'dark')
  const [preview, setPreview] = useState<{ key: string; url: string } | null>(null)
  const [failed, setFailed] = useState(false)
  const qrRef = useRef<HTMLDivElement>(null)
  const blob = useRef<Blob | null>(null)
  const urlLabel = publicUrl.replace(/^https?:\/\//, '')
  const key = [mode, profile.display_name, profile.descriptor, profile.avatar_url, urlLabel].join('|')

  useEffect(() => {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return
    let cancelled = false
    let objectUrl: string | null = null
    const timer = window.setTimeout(() => {
      renderIdentityCard({
        name: profile.display_name || handle, descriptor: profile.descriptor, urlLabel,
        qrSvg: svg, avatarUrl: profile.avatar_url, mode,
      }).then(b => {
        if (cancelled) return
        blob.current = b
        objectUrl = URL.createObjectURL(b)
        setPreview({ key, url: objectUrl })
        setFailed(false)
      }, () => { if (!cancelled) setFailed(true) })
    }, 250)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [key, mode, profile.display_name, handle, profile.descriptor, profile.avatar_url, urlLabel])

  function download() {
    if (!blob.current) return
    const url = URL.createObjectURL(blob.current)
    const a = document.createElement('a')
    a.href = url
    a.download = `mycen-${handle.replace('/', '-')}-${mode === 'light' ? 'clara' : 'oscura'}.png`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const ready = preview?.key === key
  return (
    <section className="st-card st-stack" aria-labelledby="identity-card-title">
      <h2 id="identity-card-title" className="st-card-title" style={{ margin: 0 }}>{x.cardTitle}</h2>
      <p className="st-help" style={{ margin: 0 }}>{x.cardHelp}</p>
      <div className="st-segment" role="group" aria-label={x.cardStyle}>
        <button type="button" aria-pressed={mode === 'dark'} onClick={() => setMode('dark')}>{x.cardDark}</button>
        <button type="button" aria-pressed={mode === 'light'} onClick={() => setMode('light')}>{x.cardLight}</button>
      </div>
      {/* QR de la tarjeta: no se muestra, se dibuja dentro de la imagen */}
      <div ref={qrRef} hidden>
        <QRCodeSVG value={`${publicUrl}?src=card`} size={512} level="M" marginSize={0} />
      </div>
      <div className="st-card-preview" aria-busy={!ready}>
        {ready
          ? <img src={preview.url} alt={x.cardAlt(profile.display_name)} />
          : <span className="st-spinner" aria-hidden="true" />}
      </div>
      {failed && <p className="st-error" role="alert">{x.cardError}</p>}
      <div className="st-row">
        <Button size="sm" variant="primary" disabled={!ready} onClick={download}>
          <Download size={15} aria-hidden="true" /> {x.cardDownload}
        </Button>
      </div>
    </section>
  )
}

/** Presentación corta para copiar o mandar por WhatsApp. Se puede editar antes (no se guarda). */
export function IntroSection() {
  const { profile, publicUrl, handle } = useStudio()
  const x = useStudioT().exchange
  const { copied, copy } = useCopy()
  const hasBio = !!profile.bio?.trim()
  const [long, setLong] = useState(false)
  const generated = buildIntro(x, profile.display_name || handle, profile.descriptor, long && hasBio ? profile.bio : null, publicUrl)
  // Lo editado vale mientras no cambie el texto generado (ej. al cambiar entre corta/con bio)
  const [edit, setEdit] = useState<{ base: string; text: string } | null>(null)
  const text = edit?.base === generated ? edit.text : generated

  return (
    <section className="st-card st-stack" aria-labelledby="intro-title">
      <h2 id="intro-title" className="st-card-title" style={{ margin: 0 }}>{x.introTitle}</h2>
      <p className="st-help" style={{ margin: 0 }}>{x.introHelp}</p>
      {hasBio && (
        <div className="st-segment" role="group" aria-label={x.introTitle}>
          <button type="button" aria-pressed={!long} onClick={() => setLong(false)}>{x.introShort}</button>
          <button type="button" aria-pressed={long} onClick={() => setLong(true)}>{x.introLong}</button>
        </div>
      )}
      <TextField label={x.introLabel} multiline value={text} maxLength={1000}
        onChange={v => setEdit({ base: generated, text: v })} />
      <div className="st-row" style={{ flexWrap: 'wrap' }}>
        <Button size="sm" onClick={() => copy(text)}>
          {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />} {copied ? x.copied : x.introCopy}
        </Button>
        <a className="st-btn st-btn-secondary st-btn-sm" href={`https://wa.me/?text=${encodeURIComponent(text)}`}
          target="_blank" rel="noopener noreferrer">
          <MessageCircle size={15} aria-hidden="true" /> {x.introWhatsapp}
        </a>
      </div>
    </section>
  )
}

function buildIntro(x: ReturnType<typeof useStudioT>['exchange'], name: string, descriptor: string | null, bio: string | null, url: string): string {
  const hello = descriptor?.trim() ? x.introHelloRole(name, descriptor.trim()) : x.introHello(name)
  return [hello, bio?.trim(), x.introLink(url)].filter(Boolean).join('\n\n')
}
