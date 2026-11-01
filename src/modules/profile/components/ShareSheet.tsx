import { useEffect, useState, type ComponentType } from 'react'
import { Copy, MessageCircle, QrCode, Share2, UserPlus } from 'lucide-react'
import { Sheet } from '@/design/components/Sheet'
import type { UiStrings } from '../lib/profileI18n'
import './ShareSheet.css'

type QrProps = { value: string; size: number; level: 'M'; marginSize: number; bgColor: string; fgColor: string }

/**
 * Hoja "Compartir" del perfil (chunk propio: sólo baja al tocar Compartir): copiar el link, mandarlo por WhatsApp,
 * mostrar el QR (con ?src=qr) y guardar el contacto. "Más opciones" abre el menú del sistema cuando existe.
 */
export default function ShareSheet({ open, onClose, url, name, t, canSaveContact, onCopy, onWhatsapp, onSaveContact, onNative, hasNative }: {
  open: boolean
  onClose: () => void
  url: string
  name: string
  t: UiStrings
  canSaveContact: boolean
  onCopy: () => void
  onWhatsapp: () => void
  onSaveContact: () => void
  onNative: () => void
  hasNative: boolean
}) {
  const [showQr, setShowQr] = useState(false)
  const [Qr, setQr] = useState<ComponentType<QrProps> | null>(null)
  useEffect(() => {
    if (!showQr || Qr) return
    let alive = true
    import('qrcode.react').then(m => { if (alive) setQr(() => m.QRCodeSVG as unknown as ComponentType<QrProps>) }).catch(() => undefined)
    return () => { alive = false }
  }, [showQr, Qr])
  const wa = `https://wa.me/?text=${encodeURIComponent(`${name} ${url}?src=whatsapp`)}`

  return (
    <Sheet open={open} onClose={onClose} title={t.share} closeLabel={t.close}>
      <div className="mp-share">
        <p className="mp-share-url">{url.replace(/^https?:\/\//, '')}</p>
        <div className="mp-share-grid" data-count={3 + Number(canSaveContact) + Number(hasNative)}>
          <button type="button" className="mp-share-btn" onClick={onCopy}>
            <span className="mp-share-ico" aria-hidden="true"><Copy size={20} /></span>{t.copyLink}
          </button>
          <a className="mp-share-btn" href={wa} target="_blank" rel="noopener noreferrer" onClick={onWhatsapp}>
            <span className="mp-share-ico" aria-hidden="true"><MessageCircle size={20} /></span>WhatsApp
          </a>
          <button type="button" className="mp-share-btn" aria-expanded={showQr} onClick={() => setShowQr(v => !v)}>
            <span className="mp-share-ico" aria-hidden="true"><QrCode size={20} /></span>{t.qrCode}
          </button>
          {canSaveContact && (
            <button type="button" className="mp-share-btn" onClick={onSaveContact}>
              <span className="mp-share-ico" aria-hidden="true"><UserPlus size={20} /></span>{t.saveContact}
            </button>
          )}
          {hasNative && (
            <button type="button" className="mp-share-btn" onClick={onNative}>
              <span className="mp-share-ico" aria-hidden="true"><Share2 size={20} /></span>{t.moreOptions}
            </button>
          )}
        </div>
        {showQr && (
          <div className="mp-share-qr" role="img" aria-label={`${t.qrCode}: ${url.replace(/^https?:\/\//, '')}`}>
            {Qr && <Qr value={`${url}?src=qr`} size={208} level="M" marginSize={2} bgColor="transparent" fgColor="currentColor" />}
          </div>
        )}
      </div>
    </Sheet>
  )
}
