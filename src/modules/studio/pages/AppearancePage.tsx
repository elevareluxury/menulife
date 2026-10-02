import { useEffect, useId } from 'react'
import { AlertTriangle } from 'lucide-react'
import { ensureProfileFont, QUIET } from '@/modules/profile/lib/profileTheme'
import type { ProfileTheme } from '@/modules/profile/lib/profileTypes'
import { useStudio } from '../StudioContext'
import { PageHeader, Toggle } from '../components/ui'
import { EditTabs, ProfileSaveIndicator } from '../components/shared'
import { useStudioT } from '@/i18n/app/studio'

const ACCENTS = [
  { value: QUIET.ivory, key: 'ivory' },
  { value: QUIET.obsidian, key: 'obsidian' },
  { value: '#F4705A', key: 'coral' },
  { value: '#F59E0B', key: 'amber' },
  { value: '#22C55E', key: 'green' },
  { value: '#3B82F6', key: 'blue' },
  { value: '#A78BFA', key: 'lavender' },
  { value: '#EC4899', key: 'pink' },
] as const

const FONTS = [
  { value: 'geist', label: 'Geist', family: "'Geist', sans-serif" },
  { value: 'instrument', label: 'Instrument Serif', family: "'Instrument Serif', serif" },
  { value: 'space-grotesk', label: 'Space Grotesk', family: "'Space Grotesk', sans-serif" },
  { value: 'playfair', label: 'Playfair', family: "'Playfair Display', serif" },
  { value: 'bebas', label: 'Bebas Neue', family: "'Bebas Neue', sans-serif" },
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
  const a = useStudioT().appearance
  const theme: ProfileTheme = profile.theme ?? {}
  const mode = theme.mode === 'light' ? 'light' : 'dark'
  const accent = theme.accent ?? QUIET.ivory
  const bg = mode === 'light' ? QUIET.ivory : QUIET.obsidian
  const ratio = contrastRatio(accent, bg)
  const lowContrast = ratio != null && ratio < 3
  const customId = useId()
  // Cargar las fuentes de las opciones para mostrarlas tal cual se verán
  useEffect(() => { FONTS.forEach(f => ensureProfileFont(f.value)) }, [])

  const setTheme = (patch: Partial<ProfileTheme>) => patchProfile({ theme: { ...theme, ...patch } })

  return (
    <>
      <EditTabs />
      <PageHeader title={a.title} subtitle={a.subtitle} actions={<ProfileSaveIndicator />} />

      <section className="st-card st-stack">
        <h2 className="st-card-title" style={{ margin: 0 }}>{a.theme}</h2>
        <div className="st-segment" role="group" aria-label={a.theme}>
          <button type="button" aria-pressed={mode === 'dark'} onClick={() => setTheme({ mode: 'dark' })}>{a.dark}</button>
          <button type="button" aria-pressed={mode === 'light'} onClick={() => setTheme({ mode: 'light' })}>{a.light}</button>
        </div>
      </section>

      <section className="st-card st-stack">
        <h2 className="st-card-title" style={{ margin: 0 }}>{a.accent}</h2>
        <p className="st-help" style={{ margin: 0 }}>{a.accentHelp}</p>
        <div className="st-swatches" role="group" aria-label={a.accent}>
          {ACCENTS.map(c => (
            <button key={c.value} type="button" className="st-swatch" style={{ background: c.value }}
              aria-pressed={accent.toLowerCase() === c.value.toLowerCase()} aria-label={a.accents[c.key]} title={a.accents[c.key]}
              onClick={() => setTheme({ accent: c.value })} />
          ))}
          <label htmlFor={customId} className="st-swatch" title={a.otherColor}
            style={{ background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)', position: 'relative', overflow: 'hidden' }}>
            <span className="st-sr-only">{a.chooseOther}</span>
            <input id={customId} type="color" value={/^#[0-9a-f]{6}$/i.test(accent) ? accent : '#ffffff'}
              onChange={e => setTheme({ accent: e.target.value })}
              style={{ opacity: 0, position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
          </label>
        </div>
        {lowContrast && (
          <p className="st-error" role="status" style={{ color: '#FBBF24' }}>
            <AlertTriangle size={14} aria-hidden="true" />
            {a.lowContrast(mode === 'light')}
          </p>
        )}
      </section>

      <section className="st-card st-stack">
        <h2 className="st-card-title" style={{ margin: 0 }}>{a.font}</h2>
        <div className="st-stack" style={{ gap: 8 }} role="radiogroup" aria-label={a.font}>
          {FONTS.map(f => {
            const current = FONTS.some(x => x.value === theme.title_font) ? theme.title_font : 'geist'
            const selected = current === f.value
            return (
              <button key={f.value} type="button" role="radio" aria-checked={selected}
                onClick={() => setTheme({ title_font: f.value })}
                className="st-module" style={{ cursor: 'pointer', justifyContent: 'space-between', borderColor: selected ? 'var(--st-text)' : undefined, color: 'inherit' }}>
                <span style={{ fontFamily: f.family, fontSize: 20, fontWeight: 700 }}>{profile.display_name || a.yourName}</span>
                <span className="st-help">{a.fonts[f.value]}</span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="st-card">
        <Toggle label={a.openStatus} description={a.openStatusHelp}
          checked={theme.show_open_status !== false} onChange={v => setTheme({ show_open_status: v })} />
      </section>
    </>
  )
}
