import { Check } from 'lucide-react'
import { THEME_META, type HubTheme } from '../lib/themeConfig'

interface ThemeSelectorProps {
  value: HubTheme | null
  onChange: (theme: HubTheme) => void
}

export function ThemeSelector({ value, onChange }: ThemeSelectorProps) {
  const themes = Object.values(THEME_META)
  const active = value ?? 'dark'

  return (
    <div className="space-y-3">
      <label className="text-xs text-gray-400 uppercase tracking-wide block">
        Tema visual del Hub
      </label>
      <div className="grid grid-cols-2 gap-3">
        {themes.map(theme => {
          const selected = active === theme.id
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => onChange(theme.id)}
              className="relative p-3 rounded-xl text-left transition-all"
              style={{
                border: selected
                  ? '1.5px solid rgba(255,255,255,0.7)'
                  : '1px solid rgba(255,255,255,0.08)',
                background: selected
                  ? 'rgba(255,255,255,0.08)'
                  : 'rgba(255,255,255,0.02)',
                cursor: 'pointer',
              }}
            >
              {/* Color preview strip */}
              <div
                className="w-full rounded-lg mb-2.5"
                style={{
                  height: 52,
                  background: theme.previewGradient,
                }}
              />

              <div>
                <p className="text-sm font-semibold text-white leading-tight">
                  {theme.label}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {theme.description}
                </p>
              </div>

              {selected && (
                <div
                  className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.9)' }}
                >
                  <Check size={11} className="text-black" strokeWidth={3} />
                </div>
              )}
            </button>
          )
        })}
      </div>
      <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
        El tema define paleta, tipografía y estilo de botones.
        Podés personalizar el acento después.
      </p>
    </div>
  )
}
