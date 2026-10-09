import { useMemo, type Ref } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { generateHuella, huellaToSvg, type HuellaVariant } from '@/lib/huella'
import { ACCENT_COLORS, QR_COLORS, SECONDARY_COLORS, type MycenAccent } from '@/design/themes'
import { HUELLA_QR_SIZE } from '../lib/huellaQr'

/** Pone un <svg> completo (texto) en (x, y) con el tamaño dado, dentro de otro SVG */
function placeSvg(svg: string, x: number, y: number, size: number): string {
  return svg.replace(/^<svg([^>]*?) width="[^"]*" height="[^"]*"/, `<svg$1 x="${x}" y="${y}" width="${size}" height="${size}"`)
}

/**
 * QR con huella (V1 · etapa 08): siempre oscuro sobre blanco (muchos lectores no leen un QR invertido), corrección de
 * errores alta (H) y zona de silencio blanca alrededor del código, para que la huella nunca lo toque.
 * Es un SVG completo: se muestra tal cual y se descarga como SVG o PNG (ExchangePage).
 */
export function HuellaQr({ url, seed, variant, accent, label, title, svgRef }: {
  url: string
  seed: string
  variant: HuellaVariant
  accent: MycenAccent
  /** Texto debajo del código (dominio/usuario) */
  label: string
  title: string
  svgRef?: Ref<SVGSVGElement>
}) {
  const huella = useMemo(() => placeSvg(huellaToSvg(generateHuella(seed, variant), {
    colorA: ACCENT_COLORS[accent].amanecer.accent, colorB: SECONDARY_COLORS.amanecer, size: 560,
  }), 20, 20, 560), [seed, variant, accent])
  const { width, height } = HUELLA_QR_SIZE

  return (
    <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}
      className="st-huella-qr">
      <rect width={width} height={height} rx={40} fill={QR_COLORS.bg} />
      <g dangerouslySetInnerHTML={{ __html: huella }} />
      {/* Zona de silencio: la huella no entra al código */}
      <rect x={156} y={156} width={288} height={288} rx={28} fill={QR_COLORS.bg} />
      <QRCodeSVG value={url} level="H" size={240} x={180} y={180} marginSize={0}
        bgColor={QR_COLORS.bg} fgColor={QR_COLORS.fg} />
      <text x={width / 2} y={645} textAnchor="middle" fontSize={label.length > 28 ? 26 : 32} fontWeight={600}
        fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" fill={QR_COLORS.fg}>{label}</text>
    </svg>
  )
}
