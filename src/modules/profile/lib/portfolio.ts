// Portfolio profesional (modelos, actores, influencers, músicos y creativos): reglas puras de los 6 módulos nuevos.
// La página vuelve a validar todo lo guardado al dibujarlo (`read*`); Studio usa los mismos límites. Nada se inventa:
// lo que no se cargó no se muestra, y los números de audiencia llevan la fecha en que los informó la persona.

import { safeHref } from './safeUrl'

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')
const clip = (v: unknown, max: number) => str(v).slice(0, max)
const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v)

// ── Medidas (modelos y actores) ──────────────────────────────────────────────

/** Medidas en centímetros (se muestran también en pulgadas) */
export const MEASURE_CM = ['height', 'bust', 'waist', 'hips', 'chest', 'inseam'] as const
/** Talles y rasgos en texto corto ("38", "M", "Castaño") */
export const MEASURE_TEXT = ['shoe', 'dress', 'suit', 'hair', 'eyes'] as const
export type MeasureCm = typeof MEASURE_CM[number]
export type MeasureText = typeof MEASURE_TEXT[number]

export interface Measurement { key: MeasureCm | MeasureText; cm?: number; text?: string }

/** Lo cargado, en orden fijo; centímetros entre 20 y 260, textos de hasta 24 caracteres */
export function readMeasurements(content: Record<string, unknown>): Measurement[] {
  const out: Measurement[] = []
  for (const key of MEASURE_CM) {
    const n = Number(String(content[key] ?? '').replace(',', '.'))
    if (Number.isFinite(n) && n >= 20 && n <= 260) out.push({ key, cm: Math.round(n * 10) / 10 })
  }
  for (const key of MEASURE_TEXT) {
    const t = clip(content[key], 24)
    if (t) out.push({ key, text: t })
  }
  return out
}

/** 170 cm → 5'7" (altura) o 34" (contornos) */
export function inches(key: MeasureCm, cm: number): string {
  const total = cm / 2.54
  if (key === 'height') {
    const ft = Math.floor(total / 12)
    const inch = Math.round(total - ft * 12)
    return inch === 12 ? `${ft + 1}'0"` : `${ft}'${inch}"`
  }
  return `${Math.round(total)}"`
}

// ── Audiencia (media kit) ────────────────────────────────────────────────────

export const AUDIENCE_PLATFORMS = ['instagram', 'tiktok', 'youtube', 'x', 'twitch', 'spotify', 'facebook', 'threads', 'linkedin', 'pinterest', 'kick', 'other'] as const
export type AudiencePlatform = typeof AUDIENCE_PLATFORMS[number]

export interface AudienceRow { platform: AudiencePlatform; handle?: string; followers?: number; avg_views?: number; engagement?: number; url?: string }

/** Seguidores y vistas son enteros: "120.000", "120,000" y "120 000" son 120000 (se descarta todo lo que no es dígito) */
const count = (v: unknown, max = 10_000_000_000) => {
  const n = Number(String(v ?? '').replace(/\D/g, '') || 'x')
  return Number.isFinite(n) && n > 0 && n <= max ? Math.round(n) : undefined
}

/** Hasta 12 redes; cada una necesita al menos seguidores o vistas promedio */
export function readAudience(content: Record<string, unknown>): AudienceRow[] {
  const items = Array.isArray(content.items) ? content.items : []
  const out: AudienceRow[] = []
  for (const raw of items.slice(0, 12)) {
    if (!raw || typeof raw !== 'object') continue
    const i = raw as Record<string, unknown>
    const platform = (AUDIENCE_PLATFORMS as readonly string[]).includes(str(i.platform)) ? str(i.platform) as AudiencePlatform : 'other'
    const followers = count(i.followers)
    const avg_views = count(i.avg_views)
    const eng = Number(String(i.engagement ?? '').replace(',', '.'))
    if (!followers && !avg_views) continue
    out.push({
      platform, followers, avg_views,
      handle: clip(i.handle, 60).replace(/^@/, '') || undefined,
      engagement: Number.isFinite(eng) && eng > 0 && eng <= 100 ? Math.round(eng * 10) / 10 : undefined,
      url: safeHref(i.url) ?? undefined,
    })
  }
  return out
}

/** Frescura de los números: < 90 días al día; hasta un año "puede estar desactualizado"; más de un año, no se muestran */
export function audienceFreshness(asOf: unknown, today = new Date()): 'fresh' | 'stale' | 'expired' | 'missing' {
  const d = str(asOf)
  if (!isDate(d)) return 'missing'
  const days = (today.getTime() - new Date(`${d}T12:00:00`).getTime()) / 86_400_000
  if (days < -1) return 'missing'
  if (days > 365) return 'expired'
  return days > 90 ? 'stale' : 'fresh'
}

/** 1234 → "1,2 K" en el idioma de quien mira */
export function compact(n: number, lang: string): string {
  try {
    return new Intl.NumberFormat(lang, { notation: 'compact', maximumFractionDigits: 1 }).format(n)
  } catch {
    return String(n)
  }
}

// ── Marcas, prensa, créditos y representación ─────────────────────────────────

export interface BrandItem { name: string; logo_url?: string; url?: string; year?: string }
export interface PressItem { quote: string; outlet: string; url?: string; date?: string }
export interface CreditItem { title: string; role?: string; year?: string; company?: string; url?: string }

export const REP_ROLES = ['agency', 'mother_agency', 'booking', 'management', 'label', 'publicist', 'other'] as const
export type RepRole = typeof REP_ROLES[number]
export interface RepItem { role: RepRole; name: string; city?: string; email?: string; phone?: string; url?: string }

const list = (content: Record<string, unknown>, max: number) =>
  (Array.isArray(content.items) ? content.items : []).slice(0, max)
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
const year = (v: unknown) => (/^(19|20)\d{2}$/.test(str(v)) ? str(v) : undefined)

export function readBrands(content: Record<string, unknown>): BrandItem[] {
  return list(content, 40).map(i => ({
    name: clip(i.name, 60), logo_url: safeHref(i.logo_url) ?? undefined, url: safeHref(i.url) ?? undefined, year: year(i.year),
  })).filter(i => i.name || i.logo_url)
}

export function readPress(content: Record<string, unknown>): PressItem[] {
  return list(content, 20).map(i => ({
    quote: clip(i.quote, 400), outlet: clip(i.outlet, 80), url: safeHref(i.url) ?? undefined,
    date: isDate(str(i.date)) ? str(i.date) : undefined,
  })).filter(i => i.quote && i.outlet)
}

export function readCredits(content: Record<string, unknown>): CreditItem[] {
  return list(content, 60).map(i => ({
    title: clip(i.title, 120), role: clip(i.role, 80) || undefined, year: year(i.year),
    company: clip(i.company, 80) || undefined, url: safeHref(i.url) ?? undefined,
  })).filter(i => i.title)
}

const email = (v: unknown) => {
  const e = clip(v, 254)
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) ? e : undefined
}
const phone = (v: unknown) => {
  const p = clip(v, 30)
  return /^\+?[\d\s().-]{6,30}$/.test(p) ? p : undefined
}

export function readRepresentation(content: Record<string, unknown>): RepItem[] {
  return list(content, 12).map(i => ({
    role: (REP_ROLES as readonly string[]).includes(str(i.role)) ? str(i.role) as RepRole : 'other',
    name: clip(i.name, 80), city: clip(i.city, 60) || undefined,
    email: email(i.email), phone: phone(i.phone), url: safeHref(i.url) ?? undefined,
  })).filter(i => i.name)
}
