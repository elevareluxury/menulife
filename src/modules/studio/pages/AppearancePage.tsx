import { useRef, useState } from 'react'
import { RefreshCw, Undo2 } from 'lucide-react'
import { Huella } from '@/design/components/Huella'
import { ACCENT_COLORS, MYCEN_ACCENTS, MYCEN_THEMES, SECONDARY_COLORS, type MycenAccent, type MycenTheme } from '@/design/themes'
import { HUELLA_VARIANTS, huellaSeed, type HuellaVariant } from '@/lib/huella'
import { PROFILE_LAYOUTS, profileLook, type ProfileLayout } from '@/modules/profile/lib/profileLook'
import type { ProfileTheme } from '@/modules/profile/lib/profileTypes'
import { useStudio } from '../StudioContext'
import { Button, ImageField, PageHeader, TextField, Toggle } from '../components/ui'
import { EditTabs, ProfileSaveIndicator } from '../components/shared'
import { LivePreview } from '../components/PreviewPane'
import { uploadMedia } from '../lib/studioApi'
import { useStudioT } from '@/i18n/app/studio'
import '../appearance.css'
import { trackEvent } from '@/lib/productEvents'

/** Sal nueva para "Generar otra" (la base acepta letras, números, _ y -, hasta 40) */
function newSalt(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(9))
  return Array.from(bytes, b => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[b % 62]).join('')
}

/** Miniatura de cada estructura con la huella, el tema y el acento reales de la persona */
function LayoutThumb({ layout, seed, variant, mode, accent }: {
  layout: ProfileLayout; seed: string; variant: HuellaVariant; mode: MycenTheme; accent: MycenAccent
}) {
  return (
    <span className={`st-thumb st-thumb-${layout} my-sky`} data-mycen-theme={mode} data-mycen-accent={accent} aria-hidden="true">
      <span className="st-thumb-huella"><Huella seed={seed} variant={variant} /></span>
      <span className="st-thumb-card" />
      <span className="st-thumb-name" />
      <span className="st-thumb-action" />
      <span className="st-thumb-row" /><span className="st-thumb-row" />
      {layout === 'bento' && <span className="st-thumb-grid"><i /><i /><i /></span>}
    </span>
  )
}

/**
 * Apariencia (V1 · etapa 06): estructura, tema Universo / Amanecer, acento de la paleta, huella ("Generar otra"),
 * portada (sólo Portada) y perfil vivo (estado y "Disponible"). Cada cambio se ve al instante en la vista previa
 * (al costado en pantallas anchas; abajo en las demás) y se publica con "Publicar cambios". El estado y "Disponible"
 * se ven en el perfil público al instante. `embedded`: dentro del inspector del editor de escritorio.
 */
export function AppearancePage({ embedded = false }: { embedded?: boolean }) {
  const { profile, patchProfile, userId } = useStudio()
  const t = useStudioT().look
  const theme: ProfileTheme = profile.theme ?? {}
  const look = profileLook(theme)
  const seed = huellaSeed(profile)
  const coverChoice = theme.cover?.type === 'imagen' ? 'imagen' : 'huella'
  // "Generar otra": la anterior se puede recuperar mientras no se publique
  const previousSalt = useRef<string | null | undefined>(undefined)
  const [canUndoHuella, setCanUndoHuella] = useState(false)

  // Siempre se guardan los valores nuevos (aunque el perfil viniera con los de antes)
  const setLook = (patch: Partial<ProfileTheme>) => {
    patchProfile({ theme: { ...theme, layout: look.layout, mode: look.mode, accent: look.accent, ...patch } })
    // Métricas (etapa 14): qué estructura y tema eligen (sólo al cambiar de estructura o de tema)
    if (patch.layout || patch.mode) trackEvent('appearance_changed', { layout: patch.layout ?? look.layout, mode: patch.mode ?? look.mode })
  }

  function generateHuella() {
    if (previousSalt.current === undefined) previousSalt.current = profile.huella_salt ?? null
    patchProfile({ huella_salt: newSalt() })
    setCanUndoHuella(true)
  }
  function undoHuella() {
    patchProfile({ huella_salt: previousSalt.current ?? null })
    previousSalt.current = undefined
    setCanUndoHuella(false)
  }

  return (
    <>
      {!embedded && <>
        <EditTabs />
        <PageHeader title={t.title} subtitle={t.subtitle} actions={<ProfileSaveIndicator />} />
      </>}

      <section className="st-card st-stack">
        <h2 className="st-card-title" style={{ margin: 0 }}>{t.structure}</h2>
        <div className="st-layouts" role="radiogroup" aria-label={t.structure}>
          {PROFILE_LAYOUTS.map(l => (
            <button key={l} type="button" role="radio" aria-checked={look.layout === l} className="st-layout-option"
              onClick={() => setLook({ layout: l })}>
              <LayoutThumb layout={l} seed={seed} variant={look.huellaVariant} mode={look.mode} accent={look.accent} />
              <span className="st-layout-name">{t.layouts[l].name}</span>
              <span className="st-help">{t.layouts[l].forWho}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="st-card st-stack">
        <h2 className="st-card-title" style={{ margin: 0 }}>{t.mode}</h2>
        <div className="st-modes" role="radiogroup" aria-label={t.mode}>
          {MYCEN_THEMES.map(m => (
            <button key={m} type="button" role="radio" aria-checked={look.mode === m} className="st-mode-option"
              onClick={() => setLook({ mode: m })}>
              <span className="st-mode-sky my-sky" data-mycen-theme={m} aria-hidden="true" />
              <span><strong>{m === 'universo' ? t.universo : t.amanecer}</strong>
                <span className="st-help" style={{ display: 'block' }}>{m === 'universo' ? t.universoHelp : t.amanecerHelp}</span></span>
            </button>
          ))}
        </div>
      </section>

      <section className="st-card st-stack">
        <h2 className="st-card-title" style={{ margin: 0 }}>{t.accent}</h2>
        <div className="st-swatches" role="radiogroup" aria-label={t.accent}>
          {MYCEN_ACCENTS.map(a => (
            <button key={a} type="button" role="radio" aria-checked={look.accent === a} className="st-swatch st-accent-swatch"
              style={{ background: ACCENT_COLORS[a][look.mode].accent }} title={a[0].toUpperCase() + a.slice(1)}
              aria-label={a[0].toUpperCase() + a.slice(1)} onClick={() => setLook({ accent: a })} />
          ))}
        </div>
      </section>

      <section className="st-card st-stack">
        <h2 className="st-card-title" style={{ margin: 0 }}>{t.huella}</h2>
        <p className="st-help" style={{ margin: 0 }}>{t.huellaHelp}</p>
        <div className="st-huellas" role="radiogroup" aria-label={t.huella}>
          {HUELLA_VARIANTS.map(v => (
            <button key={v} type="button" role="radio" aria-checked={look.huellaVariant === v} className="st-huella-option"
              data-mycen-theme={look.mode} data-mycen-accent={look.accent} onClick={() => setLook({ huella_variant: v })}>
              <span className="st-huella-art my-sky" aria-hidden="true">
                <Huella seed={seed} variant={v} colorA={ACCENT_COLORS[look.accent][look.mode].accent} colorB={SECONDARY_COLORS[look.mode]} />
              </span>
              <span>{t.variants[v]}</span>
            </button>
          ))}
        </div>
        <div className="st-row" style={{ flexWrap: 'wrap' }}>
          <Button size="sm" onClick={generateHuella}><RefreshCw size={15} aria-hidden="true" /> {t.generate}</Button>
          {canUndoHuella && <Button size="sm" variant="ghost" onClick={undoHuella}><Undo2 size={15} aria-hidden="true" /> {t.undoHuella}</Button>}
        </div>
        <p className="st-help" style={{ margin: 0 }}>{t.generateWarn}</p>
      </section>

      {look.layout === 'portada' && (
        <section className="st-card st-stack">
          <h2 className="st-card-title" style={{ margin: 0 }}>{t.cover}</h2>
          <div className="st-row" role="radiogroup" aria-label={t.cover} style={{ flexWrap: 'wrap' }}>
            {(['huella', 'imagen'] as const).map(c => (
              <button key={c} type="button" role="radio" aria-checked={coverChoice === c}
                className="st-chip-option" onClick={() => setLook({ cover: c === 'huella' ? { type: 'huella' } : { type: 'imagen', url: theme.cover?.url } })}>
                {c === 'huella' ? t.coverHuella : t.coverImage}
              </button>
            ))}
          </div>
          {theme.cover?.type === 'imagen' && (
            <ImageField label={t.coverUpload} shape="wide" value={theme.cover.url ?? null}
              onUpload={async f => { const url = await uploadMedia(userId, f, 'image'); setLook({ cover: { type: 'imagen', url } }) }}
              onClear={() => setLook({ cover: { type: 'imagen' } })} />
          )}
        </section>
      )}

      <section className="st-card st-stack">
        <TextField label={t.status} value={profile.status_text ?? ''} maxLength={60} placeholder={t.statusPlaceholder}
          help={t.statusHelp} onChange={v => patchProfile({ status_text: v.slice(0, 60) || null })} />
        <Toggle label={t.available} description={t.availableHelp} checked={!!profile.available}
          onChange={v => patchProfile({ available: v })} />
      </section>

      {!embedded && (
        <section className="st-card st-appearance-preview" aria-label={t.preview}>
          <h2 className="st-card-title">{t.preview}</h2>
          <LivePreview />
        </section>
      )}
    </>
  )
}
