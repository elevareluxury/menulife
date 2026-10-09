import { useEffect, useState } from 'react'
import type { ComponentType } from 'react'
import { GlassPanel } from '@/design/components/GlassPanel'
import { Huella } from '@/design/components/Huella'
import type { LayoutParts } from './types'
import { ModuleStack } from './ModuleStack'

type QrProps = { value: string; size: number; level: 'M'; bgColor: string; fgColor: string; className?: string }

/** QR de la credencial: la librería se baja aparte, después de mostrar el perfil (no pesa en la carga inicial). */
function CredentialQr({ url }: { url: string }) {
  const [Qr, setQr] = useState<ComponentType<QrProps> | null>(null)
  useEffect(() => {
    let alive = true
    import('qrcode.react').then(m => { if (alive) setQr(() => m.QRCodeSVG as ComponentType<QrProps>) }).catch(() => undefined)
    return () => { alive = false }
  }, [])
  return (
    <div className="mp-cred-qr" aria-hidden="true">
      {Qr && <Qr value={url} size={76} level="M" bgColor="transparent" fgColor="currentColor" />}
    </div>
  )
}

/** Credencial: tarjeta de identidad flotante con huella, nombre, estado y QR. Debajo, la acción principal y los módulos. */
export default function Credencial(p: LayoutParts) {
  return (
    <div className="my-enter">
      {p.identity(<>
        <GlassPanel as="section" variant="hero" className="mp-header mp-cred my-float my-float-1">
          <Huella seed={p.seed} variant={p.look.huellaVariant} spin draw className="mp-cred-huella" />
          <div className="mp-cred-top">
            <div className="mp-avatar mp-cred-avatar">{p.avatar}</div>
            <CredentialQr url={`${p.profileUrl}?src=qr`} />
          </div>
          <h1 className="mp-name mp-cred-name">{p.name}</h1>
          {p.descriptor && <p className="mp-descriptor">{p.descriptor}</p>}
          {p.chips}
          {p.tags}
          <p className="mp-cred-handle">{p.profileUrl.replace(/^https?:\/\//, '')}</p>
        </GlassPanel>
        {p.bio && <p className="mp-bio mp-cred-bio my-enter-item" style={{ '--my-i': 1 } as React.CSSProperties}>{p.bio}</p>}
        <div className="mp-actions my-enter-item" style={{ '--my-i': 2 } as React.CSSProperties}>
          {p.primary}
          {p.secondary}
        </div>
      </>)}
      <ModuleStack blocks={p.blocks} />
    </div>
  )
}
