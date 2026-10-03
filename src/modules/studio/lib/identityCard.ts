// Tarjeta de identidad descargable (Identity Fase 7, Connect): una imagen 4:5 con foto, nombre,
// descripción, QR al perfil y la URL. Se dibuja en el navegador (canvas); no se sube a ningún lado.

export type CardMode = 'light' | 'dark'

export interface IdentityCardInput {
  name: string
  descriptor: string | null
  /** URL a mostrar, sin https:// */
  urlLabel: string
  /** SVG del QR (ya armado con ?src=card) */
  qrSvg: SVGSVGElement
  avatarUrl: string | null
  mode: CardMode
}

export const CARD_WIDTH = 1080
export const CARD_HEIGHT = 1350

const PALETTE: Record<CardMode, { bg: string; text: string; muted: string; ring: string }> = {
  dark: { bg: '#121412', text: '#F1F0E9', muted: '#9A9B92', ring: 'rgba(241,240,233,0.14)' },
  light: { bg: '#F4F1EA', text: '#161815', muted: '#5E5F58', ring: 'rgba(22,24,21,0.12)' },
}

const FONT = '"Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'

function loadImage(src: string, crossOrigin = false): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    if (crossOrigin) img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image'))
    img.src = src
  })
}

function svgDataUrl(svg: SVGSVGElement): string {
  const data = new XMLSerializer().serializeToString(svg)
  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(data)))
}

/** Parte el texto en líneas que entran en `max` px; corta con "…" si pasa de `maxLines`. */
function wrap(ctx: CanvasRenderingContext2D, text: string, max: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const next = line ? `${line} ${w}` : w
    if (ctx.measureText(next).width <= max || !line) line = next
    else { lines.push(line); line = w }
  }
  if (line) lines.push(line)
  if (lines.length <= maxLines) return lines
  const kept = lines.slice(0, maxLines)
  let last = kept[maxLines - 1]
  while (last && ctx.measureText(`${last}…`).width > max) last = last.slice(0, -1)
  kept[maxLines - 1] = `${last.trimEnd()}…`
  return kept
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

async function draw(input: IdentityCardInput, avatar: HTMLImageElement | null): Promise<HTMLCanvasElement> {
  const c = PALETTE[input.mode]
  const canvas = document.createElement('canvas')
  canvas.width = CARD_WIDTH
  canvas.height = CARD_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas')
  const cx = CARD_WIDTH / 2

  ctx.fillStyle = c.bg
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'

  // Foto (o inicial)
  const r = 110
  const ay = 120 + r
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, ay, r, 0, Math.PI * 2)
  ctx.closePath()
  ctx.fillStyle = c.ring
  ctx.fill()
  if (avatar) {
    ctx.clip()
    const side = Math.min(avatar.naturalWidth, avatar.naturalHeight)
    ctx.drawImage(avatar, (avatar.naturalWidth - side) / 2, (avatar.naturalHeight - side) / 2, side, side, cx - r, ay - r, r * 2, r * 2)
  } else {
    ctx.fillStyle = c.text
    ctx.font = `600 96px ${FONT}`
    ctx.textBaseline = 'middle'
    ctx.fillText(input.name.trim()[0]?.toUpperCase() ?? '·', cx, ay + 4)
    ctx.textBaseline = 'alphabetic'
  }
  ctx.restore()

  // Nombre y descripción
  let y = ay + r + 100
  ctx.fillStyle = c.text
  ctx.font = `700 72px ${FONT}`
  for (const line of wrap(ctx, input.name, 900, 2)) { ctx.fillText(line, cx, y); y += 84 }
  if (input.descriptor?.trim()) {
    ctx.fillStyle = c.muted
    ctx.font = `400 40px ${FONT}`
    y += 2
    for (const line of wrap(ctx, input.descriptor, 900, 2)) { ctx.fillText(line, cx, y); y += 52 }
  }

  // QR sobre blanco (siempre legible)
  const qrBox = 420
  const qy = Math.max(y + 30, 700)
  ctx.fillStyle = '#FFFFFF'
  roundRect(ctx, cx - qrBox / 2, qy, qrBox, qrBox, 36)
  ctx.fill()
  const qr = await loadImage(svgDataUrl(input.qrSvg))
  const pad = 40
  ctx.drawImage(qr, cx - qrBox / 2 + pad, qy + pad, qrBox - pad * 2, qrBox - pad * 2)

  // URL y marca
  ctx.fillStyle = c.text
  ctx.font = `600 40px ${FONT}`
  ctx.fillText(wrap(ctx, input.urlLabel, 960, 1)[0], cx, qy + qrBox + 80)
  ctx.fillStyle = c.muted
  ctx.font = `700 30px ${FONT}`
  ctx.fillText('mycen.', cx, CARD_HEIGHT - 56)
  return canvas
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error('blob'))), 'image/png')
    } catch (e) {
      reject(e) // canvas "manchado" por una imagen sin CORS
    }
  })
}

/** PNG de la tarjeta. Si la foto no se puede usar (CORS, error de red), sale con la inicial. */
export async function renderIdentityCard(input: IdentityCardInput): Promise<Blob> {
  await document.fonts?.ready
  let avatar: HTMLImageElement | null = null
  if (input.avatarUrl) {
    try { avatar = await loadImage(input.avatarUrl, true) } catch { avatar = null }
  }
  try {
    return await toBlob(await draw(input, avatar))
  } catch (e) {
    if (!avatar) throw e
    return toBlob(await draw(input, null))
  }
}
