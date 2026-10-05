import { useEffect, useId } from 'react'
import { AlertTriangle, Check, X } from 'lucide-react'
import {
  BACKGROUNDS, CARD_STYLES, CORNERS, contrastReport, ensureProfileFont, QUIET, themePalette, type ResolvedMode,
} from '@/modules/profile/lib/profileTheme'
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

/** `embedded`: dentro del inspector del editor de escritorio (sin encabezado de página) */
export function AppearancePage({ embedded = false }: { embedded?: boolean }) {
  const { profile, patchProfile } = useStudio()
  const a = useStudioT().appearance
  const theme: ProfileTheme = profile.theme ?? {}
  const mode = theme.mode === 'light' || theme.mode === 'auto' ? theme.mode : 'dark'
  const accent = theme.accent ?? QUIET.ivory
  // Con "automático" se revisan los dos modos
  const modes: ResolvedMode[] = mode === 'auto' ? ['light', 'dark'] : [mode]
  const palettes = modes.map(m => themePalette(theme, m))
  const accentReplaced = palettes.some(p => p.accentReplaced)
  const customId = useId()
  // Cargar las fuentes de las opciones para mostrarlas tal cual se verán
  useEffect(() => { FONTS.forEach(f => ensureProfileFont(f.value)) }, [])

  const setTheme = (patch: Partial<ProfileTheme>) => patchProfile({ theme: { ...theme, ...patch } })

  return (
    <>
      {!embedded && <>
        <EditTabs />
        <PageHeader title={a.title} subtitle={a.subtitle} actions={<ProfileSaveIndicator />} />
      </>}

      <section className="st-card st-stack">
        <h2 className="st-card-title" style={{ margin: 0 }}>{a.theme}</h2>
        <Options label={a.theme} value={mode} onChange={v => setTheme({ mode: v })}
          options={[{ value: 'dark', label: a.dark }, { value: 'light', label: a.light }, { value: 'auto', label: a.auto }]} />
        {mode === 'auto' && <p className="st-help" style={{ margin: 0 }}>{a.autoHelp}</p>}
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
        {accentReplaced && (
          <p className="st-error" role="status" style={{ color: '#FBBF24' }}>
            <AlertTriangle size={14} aria-hidden="true" />
            {a.accentReplaced}
          </p>
        )}
      </section>

      <section className="st-card st-stack">
        <h2 className="st-card-title" style={{ margin: 0 }}>{a.corners}</h2>
        <Options label={a.corners} value={theme.corners ?? 'soft'} onChange={v => setTheme({ corners: v })}
          options={CORNERS.map(v => ({ value: v, label: a.cornerOptions[v] }))} />
      </section>

      <section className="st-card st-stack">
        <h2 className="st-card-title" style={{ margin: 0 }}>{a.background}</h2>
        <Options label={a.background} value={theme.background ?? 'plain'} onChange={v => setTheme({ background: v })}
          options={BACKGROUNDS.map(v => ({ value: v, label: a.backgroundOptions[v] }))} />
        <p className="st-help" style={{ margin: 0 }}>{a.backgroundHelp}</p>
      </section>

      <section className="st-card st-stack">
        <h2 className="st-card-title" style={{ margin: 0 }}>{a.cards}</h2>
        <Options label={a.cards} value={theme.card_style ?? 'filled'} onChange={v => setTheme({ card_style: v })}
          options={CARD_STYLES.map(v => ({ value: v, label: a.cardOptions[v] }))} />
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

      <section className="st-card st-stack" aria-labelledby="a11y-title">
        <h2 id="a11y-title" className="st-card-title" style={{ margin: 0 }}>{a.a11y}</h2>
        <p className="st-help" style={{ margin: 0 }}>{a.a11yHelp}</p>
        {palettes.map(p => (
          <div key={p.mode}>
            {palettes.length > 1 && <h3 className="st-label" style={{ margin: '6px 0' }}>{p.mode === 'light' ? a.inLight : a.inDark}</h3>}
            <ul className="st-contrast" aria-label={palettes.length > 1 ? (p.mode === 'light' ? a.inLight : a.inDark) : a.a11y}>
              {contrastReport(p).map(c => (
                <li key={c.key}>
                  <span>{a.checks[c.key]}</span>
                  <span className={c.ok ? 'is-ok' : 'is-bad'}>
                    {c.ok ? <Check size={14} aria-hidden="true" /> : <X size={14} aria-hidden="true" />}
                    {' '}{c.ok ? a.pass : a.fail} · {a.ratio(c.ratio, c.min)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </>
  )
}

/** Grupo de opciones excluyentes (botones con aria-pressed, como el resto de Studio). */
function Options<T extends string>({ label, value, onChange, options }: {
  label: string; value: T; onChange: (v: T) => void; options: { value: T; label: string }[]
}) {
  return (
    <div className="st-segment" role="group" aria-label={label}>
      {options.map(o => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  )
}
