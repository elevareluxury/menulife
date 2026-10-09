import { useState } from 'react'
import { ArrowLeft, Briefcase, Check, Copy, Palette, Share2, Store, UserRound } from 'lucide-react'
import { ProfileView } from '@/modules/profile/components/ProfileView'
import { Huella } from '@/design/components/Huella'
import { huellaSeed } from '@/lib/huella'
import { profileLook, type ProfileLayout } from '@/modules/profile/lib/profileLook'
import { createModule, createProfile, friendlyError, loadProfile, publishSpace, updateProfile, uploadMedia } from '../lib/studioApi'
import { socialUrl } from '../lib/moduleCatalog'
import { toPublicProfile, publicBaseUrl } from '../lib/preview'
import { normalizeUsername, usernameMessage, useUsernameCheck } from '../lib/useUsernameCheck'
import type { StudioModule, StudioProfile } from '../lib/studioTypes'
import { Button, ImageField, TextField } from './ui'
import { useStudioT } from '@/i18n/app/studio'
import { useAppLang } from '@/i18n/app/store'
import '@/design/motion.css'
import '@/design/components/design.css'
import '../onboarding.css'

// Onboarding V1 (etapa 07): perfil publicado en menos de 3 minutos, un paso por pantalla.
//   1 nombre · 2 dirección · 3 para qué es (define estructura y primeros módulos; acá se crea el perfil)
//   4 foto (opcional) · 5 WhatsApp e Instagram (opcionales) · 6 el momento de la huella · 7 vista previa y "Publicar perfil"
// onboarding_step en la base: 3 = perfil creado, 4 = foto y contacto hechos, 5 = terminado (igual que antes: los perfiles
// que ya lo terminaron no lo vuelven a ver).

const TOTAL = 7
const DRAFT_KEY = 'mycen_onboarding_draft'

type Purpose = 'personal' | 'creator' | 'professional' | 'business'

const PURPOSES: { value: Purpose; icon: typeof UserRound; layout: ProfileLayout }[] = [
  { value: 'personal', icon: UserRound, layout: 'credencial' },
  { value: 'creator', icon: Palette, layout: 'portada' },
  { value: 'professional', icon: Briefcase, layout: 'editorial' },
  { value: 'business', icon: Store, layout: 'bento' },
]

interface Draft { name?: string; username?: string; purpose?: Purpose }

function readDraft(): Draft {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) ?? '{}') as Draft } catch { return {} }
}
function writeDraft(d: Draft) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)) } catch { /* storage bloqueado */ }
}

/** Paso desde donde se retoma un onboarding a medio hacer */
const resumeStep = (p: StudioProfile | null | undefined) => (!p ? 1 : (p.onboarding_step ?? 3) >= 4 ? 6 : 4)

export function OnboardingWizard({ userId, initialProfile, initialModules = [], suggestedName, onDone }: {
  userId: string
  /** Perfil ya creado (se retoma) */
  initialProfile?: StudioProfile | null
  initialModules?: StudioModule[]
  suggestedName?: string
  onDone: (profile: StudioProfile, modules: StudioModule[]) => void
}) {
  const draft = readDraft()
  const t = useStudioT()
  const w = t.welcome
  const lang = useAppLang(st => st.lang)
  const [step, setStep] = useState(() => resumeStep(initialProfile))
  const [name, setName] = useState(initialProfile?.display_name ?? draft.name ?? suggestedName ?? '')
  const [username, setUsername] = useState(initialProfile?.username ?? draft.username ?? '')
  const [touchedUsername, setTouchedUsername] = useState(!!draft.username)
  const [purpose, setPurpose] = useState<Purpose | undefined>(
    (PURPOSES.some(p => p.value === initialProfile?.purpose) ? initialProfile?.purpose as Purpose : undefined) ?? draft.purpose)
  const [profile, setProfile] = useState<StudioProfile | null>(initialProfile ?? null)
  const [modules, setModules] = useState<StudioModule[]>(initialModules)
  const [whatsapp, setWhatsapp] = useState('')
  const [instagram, setInstagram] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [published, setPublished] = useState(false)
  const [copied, setCopied] = useState(false)

  const effectiveUsername = profile ? profile.username ?? '' : touchedUsername ? username : normalizeUsername(name)
  const status = useUsernameCheck(profile ? '' : effectiveUsername)
  const host = publicBaseUrl().replace(/^https?:\/\//, '')
  const publicUrl = `${publicBaseUrl()}/${effectiveUsername}`
  const save = (d: Draft = {}) => writeDraft({ name, purpose, username: touchedUsername ? username : undefined, ...d })

  async function next() {
    setError(null)
    if (step === 1) {
      if (name.trim().length < 2) { setError(w.nameRequired); return }
      save(); setStep(2); return
    }
    if (step === 2) {
      if (!profile && status !== 'available') { setError(usernameMessage(t, status === 'idle' ? 'invalid' : status)); return }
      save(); setStep(3); return
    }
    if (step === 3) {
      if (!purpose) { setError(w.choosePurpose); return }
      const layout = PURPOSES.find(p => p.value === purpose)!.layout
      setBusy(true)
      try {
        if (profile) {
          // Volvió atrás y cambió algo
          setProfile(await updateProfile(profile.id, {
            display_name: name.trim(), purpose, theme: { ...profile.theme, layout },
          }))
        } else {
          let created = await createProfile(userId, effectiveUsername, name, lang)
          created = await updateProfile(created.id, {
            purpose, onboarding_step: 3, theme: { ...created.theme, layout },
          })
          // Primer módulo: el formulario de contacto (no necesita datos y ya sirve)
          const form = await createModule({ profile_id: created.id, type: 'contact_form', title: w.formTitle, content: {}, translations: {}, position: 100 })
          setModules([form])
          setProfile(created)
          try { localStorage.removeItem(DRAFT_KEY) } catch { /* noop */ }
        }
        setStep(4)
      } catch (e) { setError(friendlyError(e)) } finally { setBusy(false) }
      return
    }
    if (step === 4) { setStep(5); return }
    if (step === 5 && profile) {
      setBusy(true)
      try {
        const wa = whatsapp.replace(/\D/g, '')
        const ig = instagram.trim()
        const created: StudioModule[] = []
        let primary = profile.primary_action
        if (ig) {
          const url = socialUrl('instagram', ig)
          if (url) {
            created.push(await createModule({ profile_id: profile.id, type: 'social', title: 'Instagram',
              content: { network: 'instagram', handle: ig, url }, translations: {}, position: 10 }))
            if (!wa) primary = { kind: 'web', label: w.instagramAction, url }
          }
        }
        if (wa.length >= 8) primary = { kind: 'whatsapp', label: w.whatsappAction, url: `https://wa.me/${wa}` }
        setModules(prev => [...created, ...prev])
        setProfile(await updateProfile(profile.id, { primary_action: primary, onboarding_step: 4 }))
        setStep(6)
      } catch (e) { setError(friendlyError(e)) } finally { setBusy(false) }
      return
    }
    if (step === 6) { setStep(7) }
  }

  async function publish() {
    if (!profile) return
    setBusy(true); setError(null)
    try {
      await updateProfile(profile.id, { onboarding_step: 5 })
      await publishSpace(profile.id)
      setProfile(await loadProfile(profile.id))
      setPublished(true)
    } catch (e) { setError(friendlyError(e)) } finally { setBusy(false) }
  }

  async function copy() {
    try { await navigator.clipboard.writeText(publicUrl); setCopied(true) } catch { /* sin portapapeles */ }
  }
  async function share() {
    if (navigator.share) { try { await navigator.share({ title: name, url: publicUrl }) } catch { /* canceló */ } }
    else await copy()
  }

  const look = profileLook(profile?.theme)
  const seed = profile ? huellaSeed(profile) : ''

  // Momento de la huella: pantalla a oscuras, la huella se dibuja y aparece la frase
  if (step === 6 && profile) {
    return (
      <div className="ob-huella my-sky" data-mycen-theme="universo" data-mycen-accent={look.accent}>
        <div className="ob-huella-art"><Huella seed={seed} variant={look.huellaVariant} draw spin /></div>
        <h1 className="ob-huella-title">{w.huellaTitle}</h1>
        <p className="ob-huella-text">{w.huellaText}</p>
        <button type="button" className="my-primary ob-huella-next" onClick={() => setStep(7)}>{w.continue}</button>
      </div>
    )
  }

  const titles: Record<number, string> = { 1: w.nameTitle, 2: w.userTitle, 3: w.purposeTitle, 4: w.photoTitle, 5: w.socialTitle, 7: published ? w.published : w.previewTitle }
  const helps: Record<number, string> = { 1: w.nameHelp, 2: w.userHelp, 3: w.purposeHelp, 4: w.photoHelp, 5: w.socialHelp, 7: published ? w.publishedHelp : w.previewHelp }
  const pct = Math.round((step / TOTAL) * 100)

  return (
    <div className="st-center" style={{ alignItems: 'flex-start', paddingTop: 'max(24px, 6vh)' }}>
      <div style={{ width: '100%', maxWidth: step === 7 ? 860 : 520 }}>
        <div className="st-row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <span className="st-label">mycen · {w.step.replace('{n}', String(step)).replace('{total}', String(TOTAL))}</span>
        </div>
        <div role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={TOTAL} aria-label={w.progress} className="ob-progress">
          <div style={{ width: `${pct}%` }} />
        </div>

        <h1 className="st-title" style={{ marginBottom: 6 }}>{titles[step]}</h1>
        <p className="st-subtitle" style={{ marginBottom: 20 }}>{helps[step]}</p>

        {step === 1 && (
          <TextField label={w.nameLabel} required maxLength={80} value={name} autoFocus
            onChange={v => { setName(v); setError(null) }} onEnter={() => { void next() }} />
        )}

        {step === 2 && (profile ? (
          <p className="st-subtitle"><strong dir="ltr">{host}/{effectiveUsername}</strong></p>
        ) : (
          <TextField label={t.settings.username} required value={effectiveUsername} autoFocus
            onChange={v => { setTouchedUsername(true); setUsername(normalizeUsername(v)); setError(null) }}
            onEnter={() => { void next() }}
            help={<>{host}/<strong>{effectiveUsername || '…'}</strong> · {usernameMessage(t, status)}</>}
            error={['taken', 'reserved', 'invalid'].includes(status) && effectiveUsername ? usernameMessage(t, status) : null} />
        ))}

        {step === 3 && (
          <div className="st-stack" role="radiogroup" aria-label={w.purposeTitle} style={{ gap: 8 }}>
            {PURPOSES.map(p => (
              <button key={p.value} type="button" role="radio" aria-checked={purpose === p.value}
                onClick={() => { setPurpose(p.value); setError(null) }} className="st-module ob-option">
                <span className="st-module-icon" style={{ display: 'flex' }} aria-hidden="true"><p.icon size={17} /></span>
                <span style={{ flex: 1 }}>
                  <span className="st-module-title" style={{ display: 'block' }}>{w.purposes[p.value].label}</span>
                  <span className="st-module-sub" style={{ display: 'block', whiteSpace: 'normal' }}>{w.purposes[p.value].hint}</span>
                </span>
                {purpose === p.value && <Check size={18} aria-hidden="true" />}
              </button>
            ))}
          </div>
        )}

        {step === 4 && profile && (
          <ImageField label={w.photoLabel} shape="round" value={profile.avatar_url}
            onUpload={async f => {
              const url = await uploadMedia(userId, f, 'avatar')
              setProfile(await updateProfile(profile.id, { avatar_url: url }))
            }}
            onClear={async () => setProfile(await updateProfile(profile.id, { avatar_url: null }))} />
        )}

        {step === 5 && (
          <div className="st-stack">
            <TextField label={w.whatsapp} type="tel" inputMode="tel" placeholder="+54 9 11 5555 0000" value={whatsapp} onChange={setWhatsapp} />
            <TextField label={w.instagram} placeholder="@" value={instagram} onChange={setInstagram} />
          </div>
        )}

        {step === 7 && profile && (
          <div className="st-grid-2" style={{ alignItems: 'start', gap: 24 }}>
            <div className="st-stack">
              {published ? (
                <>
                  <p className="st-subtitle" style={{ margin: 0 }}><strong dir="ltr">{publicUrl.replace(/^https?:\/\//, '')}</strong></p>
                  <div className="st-row" style={{ flexWrap: 'wrap' }}>
                    <Button variant="primary" onClick={() => { void copy() }}><Copy size={16} aria-hidden="true" /> {copied ? w.copied : w.copyLink}</Button>
                    <Button onClick={() => { void share() }}><Share2 size={16} aria-hidden="true" /> {w.share}</Button>
                  </div>
                  <span role="status" className="st-sr-only">{copied ? w.copied : ''}</span>
                  <Button variant="ghost" onClick={() => onDone(profile, modules)}>{w.goStudio}</Button>
                </>
              ) : (
                <Button variant="primary" block onClick={() => { void publish() }} loading={busy}>{busy ? w.publishing : w.publish}</Button>
              )}
            </div>
            <div className="st-phone" style={{ height: 560, width: '100%', maxWidth: 340 }} aria-label={w.previewTitle}>
              <div className="st-phone-scroll">
                <ProfileView profile={toPublicProfile(profile, modules, null)} lang={lang} onLang={() => undefined} onToast={() => undefined} toast={null} preview />
              </div>
            </div>
          </div>
        )}

        {error && <p className="st-error" role="alert" style={{ marginTop: 16 }}>{error}</p>}

        {step < 7 && (
          <div className="st-row" style={{ justifyContent: 'space-between', marginTop: 28, flexWrap: 'wrap', gap: 10 }}>
            {step > 1
              ? <Button variant="ghost" onClick={() => { setError(null); setStep(s => Math.max(1, s - 1)) }} disabled={busy}>
                  <ArrowLeft size={16} aria-hidden="true" className="flip-rtl" /> {w.back}
                </Button>
              : <span />}
            <div className="st-row" style={{ gap: 8 }}>
              {(step === 4 || step === 5) && <Button variant="ghost" onClick={() => { void next() }} disabled={busy}>{w.skip}</Button>}
              <Button variant="primary" onClick={() => { void next() }} loading={busy}>{w.continue}</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
