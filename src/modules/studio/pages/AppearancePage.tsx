import { useId } from 'react'
import { AlertTriangle } from 'lucide-react'
import { QUIET } from '@/modules/profile/lib/profileTheme'
import type { ProfileTheme } from '@/modules/profile/lib/profileTypes'
import { useStudio } from '../StudioContext'
import { PageHeader, Toggle } from '../components/ui'
import { EditTabs, ProfileSaveIndicator } from '../components/shared'

const ACCENTS = [
  { value: QUIET.ivory, label: 'Marfil' },
  { value: QUIET.obsidian, label: 'Obsidiana' },
  { value: '#F4705A', label: 'Coral' },
  { value: '#F59E0B', label: 'Ámbar' },
  { value: '#22C55E', label: 'Verde' },
  { value: '#3B82F6', label: 'Azul' },
  { value: '#A78BFA', label: 'Lavanda' },
  { value: '#EC4899', label: 'Rosa' },
]

const FONTS = [
  { value: 'geist', label: 'Geist', family: "'Geist', sans-serif", note: 'Sistema' },
  { value: 'syne', label: 'Syne', family: "'Syne', sans-serif", note: 'Moderno' },
  { value: 'playfair', label: 'Playfair', family: "'Playfair Display', serif", note: 'Editorial' },
  { value: 'space-grotesk', label: 'Space Grotesk', family: "'Space Grotesk', sans-serif", note: 'Técnico' },
  { value: 'dm-sans', label: 'DM Sans', family: "'DM Sans', sans-serif", note: 'Limpio' },
  { value: 'bebas', label: 'Bebas Neue', family: "'Bebas Neue', sans-serif", note: 'Impacto' },
]

function luminance(hex: string): number | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return null
  const n = parseInt(m[1], 16)
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}

function contrastRatio(a: string, b: string): number | null {
  const la = luminance(a), lb = luminance(b)
  if (la == null || lb == null) return null
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

export function AppearancePage() {
  const { profile, patchProfile } = useStudio()
  const theme: ProfileTheme = profile.theme ?? {}
  const mode = theme.mode === 'light' ? 'light' : 'dark'
  const accent = theme.accent ?? QUIET.ivory
  const bg = mode === 'light' ? QUIET.ivory : QUIET.obsidian
  const ratio = contrastRatio(accent, bg)
  const lowContrast = ratio != null && ratio < 3
  const customId = useId()

  const setTheme = (patch: Partial<ProfileTheme>) => patchProfile({ theme: { ...theme, ...patch } })

  return (
    <>
      <EditTabs />
      <PageHeader title="Apariencia" subtitle="Libertad estética dentro de un sistema que siempre se lee bien." actions={<ProfileSaveIndicator />} />

      <section className="st-card st-stack">
        <h2 className="st-card-title" style={{ margin: 0 }}>Tema</h2>
        <div className="st-segment" role="group" aria-label="Tema">
          <button type="button" aria-pressed={mode === 'dark'} onClick={() => setTheme({ mode: 'dark' })}>Oscuro</button>
          <button type="button" aria-pressed={mode === 'light'} onClick={() => setTheme({ mode: 'light' })}>Claro</button>
        </div>
      </section>

      <section className="st-card st-stack">
        <h2 className="st-card-title" style={{ margin: 0 }}>Color de acento</h2>
        <p className="st-help" style={{ margin: 0 }}>Se usa en el botón de tu acción principal.</p>
        <div className="st-swatches" role="group" aria-label="Color de acento">
          {ACCENTS.map(a => (
            <button key={a.value} type="button" className="st-swatch" style={{ background: a.value }}
              aria-pressed={accent.toLowerCase() === a.value.toLowerCase()} aria-label={a.label} title={a.label}
              onClick={() => setTheme({ accent: a.value })} />
          ))}
          <label htmlFor={customId} className="st-swatch" title="Otro color"
            style={{ background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)', position: 'relative', overflow: 'hidden' }}>
            <span className="st-sr-only">Elegir otro color</span>
            <input id={customId} type="color" value={/^#[0-9a-f]{6}$/i.test(accent) ? accent : '#ffffff'}
              onChange={e => setTheme({ accent: e.target.value })}
              style={{ opacity: 0, position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
          </label>
        </div>
        {lowContrast && (
          <p className="st-error" role="status" style={{ color: '#FBBF24' }}>
            <AlertTriangle size={14} aria-hidden="true" />
            Este color no se lee bien sobre el tema {mode === 'light' ? 'claro' : 'oscuro'}: en tu perfil se va a usar
            {mode === 'light' ? ' negro' : ' marfil'} para mantener la legibilidad.
          </p>
        )}
      </section>

      <section className="st-card st-stack">
        <h2 className="st-card-title" style={{ margin: 0 }}>Tipografía del nombre</h2>
        <div className="st-stack" style={{ gap: 8 }} role="radiogroup" aria-label="Tipografía">
          {FONTS.map(f => {
            const selected = (theme.title_font ?? 'geist') === f.value
            return (
              <button key={f.value} type="button" role="radio" aria-checked={selected}
                onClick={() => setTheme({ title_font: f.value })}
                className="st-module" style={{ cursor: 'pointer', justifyContent: 'space-between', borderColor: selected ? 'var(--st-text)' : undefined, color: 'inherit' }}>
                <span style={{ fontFamily: f.family, fontSize: 20, fontWeight: 700 }}>{profile.display_name || 'Tu nombre'}</span>
                <span className="st-help">{f.note}</span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="st-card">
        <Toggle label='Mostrar "Abierto ahora"' description="Sólo aparece si tenés un módulo de Horarios."
          checked={theme.show_open_status !== false} onChange={v => setTheme({ show_open_status: v })} />
      </section>
    </>
  )
}
