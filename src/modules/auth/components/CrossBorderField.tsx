import { withCountry, type CrossBorderRegion } from '@/lib/crossBorder'
import type { AuthDict } from '@/i18n/app/auth'

/** Corea del Sur y China: qué datos salen del país, adónde, a quién, para qué y por cuánto tiempo, con una casilla
 *  propia (separada de Términos y Privacidad, como piden PIPA y PIPL). */
export function CrossBorderField({ region, t, checked, onChange }: {
  region: CrossBorderRegion
  t: AuthDict['xborder']
  checked: boolean
  onChange: (v: boolean) => void
}) {
  const fill = (s: string) => withCountry(s, region, t)
  const font = 'var(--font-jakarta)'
  return (
    <fieldset data-xborder={region} style={{
      margin: 0, padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.14)',
      background: 'rgba(255,255,255,0.03)', display: 'flex', flexDirection: 'column', gap: '10px',
    }}>
      <legend style={{ padding: '0 6px', fontFamily: font, fontSize: '13px', fontWeight: 700, color: '#fff' }}>{fill(t.title)}</legend>
      <p style={{ margin: 0, fontFamily: font, fontSize: '12px', lineHeight: 1.55, color: 'rgba(255,255,255,0.72)' }}>{fill(t.details)}</p>
      <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer', fontFamily: font, fontSize: '13px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.5 }}>
        <input type="checkbox" name="xborder" checked={checked} onChange={e => onChange(e.target.checked)}
          style={{ marginTop: '3px', width: 16, height: 16, accentColor: '#F4705A', flexShrink: 0 }} />
        <span>{fill(t.accept)}</span>
      </label>
    </fieldset>
  )
}

