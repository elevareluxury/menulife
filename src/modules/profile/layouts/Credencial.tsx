import { useEffect, useState } from 'react'
import type { ComponentType } from 'react'
import { GlassPanel } from '@/design/components/GlassPanel'
import { Huella } from '@/design/components/Huella'
import type { LayoutParts } from './types'
import { ModuleStack } from './ModuleStack'
import { inAt } from './motion'

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
    <div>
      {p.identity(<>
        {/* La tarjeta entra entera (envoltorio) y después flota: dos animaciones de transform no van en el mismo elemento */}
        <div className="mp-in mp-in-card" style={inAt(0)}>
          <GlassPanel as="section" variant="hero" className="mp-header mp-cred my-float my-float-1">
            <Huella seed={p.seed} variant={p.look.huellaVariant} spin draw className="mp-cred-huella" />
            <div className="mp-cred-top">
              <div className="mp-avatar mp-cred-avatar mp-in mp-in-pop" style={inAt(1)}>{p.avatar}</div>
              <CredentialQr url={`${p.profileUrl}?src=qr`} />
            </div>
            <h1 className="mp-name mp-cred-name mp-in mp-in-name" style={inAt(2)}>{p.name}{p.verifiedBadge}</h1>
            {p.descriptor && <p className="mp-descriptor mp-in" style={inAt(3)}>{p.descriptor}</p>}
            {p.chips}
            {p.tags}
            <p className="mp-cred-handle mp-in" style={inAt(4)}>{p.profileUrl.replace(/^https?:\/\//, '')}</p>
          </GlassPanel>
        </div>
        {p.bio && <p className="mp-bio mp-cred-bio mp-in" style={inAt(5)}>{p.bio}</p>}
        <div className="mp-actions mp-in" style={inAt(6)}>
          {p.primary}
          {p.secondary}
        </div>
      </>)}
      <ModuleStack blocks={p.blocks} preview={p.preview} />
    </div>
  )
}
