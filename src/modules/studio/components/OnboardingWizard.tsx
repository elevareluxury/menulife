import { useState } from 'react'
import { ArrowLeft, Briefcase, CalendarHeart, Check, Sparkles, Store, UserRound } from 'lucide-react'
import { ProfileView } from '@/modules/profile/components/ProfileView'
import { QUIET } from '@/modules/profile/lib/profileTheme'
import { createModule, createProfile, friendlyError, loadProfile, publishSpace, updateProfile, uploadMedia } from '../lib/studioApi'
import { socialUrl } from '../lib/moduleCatalog'
import { toPublicProfile, publicBaseUrl } from '../lib/preview'
import { normalizeUsername, usernameMessage, useUsernameCheck } from '../lib/useUsernameCheck'
import type { StudioModule, StudioProfile } from '../lib/studioTypes'
import { Button, ImageField, TextField } from './ui'
import { useStudioT } from '@/i18n/app/studio'
import { useAppLang } from '@/i18n/app/store'

const TOTAL = 5
const DRAFT_KEY = 'mycen_onboarding_draft'

type Purpose = 'personal' | 'professional' | 'creator' | 'business' | 'event'

const PURPOSES: { value: Purpose; icon: typeof UserRound }[] = [
  { value: 'personal', icon: UserRound },
  { value: 'professional', icon: Briefcase },
  { value: 'creator', icon: Sparkles },
  { value: 'business', icon: Store },
  { value: 'event', icon: CalendarHeart },
]

/** Campos rápidos de módulos sugeridos según el propósito. */
type QuickKey = 'instagram' | 'tiktok' | 'youtube' | 'linkedin' | 'whatsapp' | 'email' | 'website' | 'address' | 'tickets'
const QUICK: Record<QuickKey, { label?: string; placeholder?: string; type?: string }> = {
  instagram: { label: 'Instagram', placeholder: '@' },
  tiktok: { label: 'TikTok', placeholder: '@' },
  youtube: { label: 'YouTube', placeholder: '@' },
  linkedin: { label: 'LinkedIn', placeholder: 'linkedin.com/in/…' },
  whatsapp: { label: 'WhatsApp', placeholder: '+54 9 341 000 0000', type: 'tel' },
  email: { placeholder: 'hola@…', type: 'email' },
  website: { placeholder: 'https://…', type: 'url' },
  address: {},
  tickets: { placeholder: 'https://…', type: 'url' },
}
const SUGGESTED: Record<Purpose, QuickKey[]> = {
  personal: ['instagram', 'whatsapp', 'tiktok'],
  professional: ['linkedin', 'website', 'email'],
  creator: ['instagram', 'tiktok', 'youtube'],
  business: ['whatsapp', 'instagram', 'address'],
  event: ['tickets', 'instagram', 'address'],
}

const ACCENTS = [QUIET.ivory, '#F4705A', '#F59E0B', '#22C55E', '#3B82F6', '#A78BFA', '#EC4899']

interface Draft { purpose?: Purpose; name?: string; descriptor?: string; username?: string }

function readDraft(): Draft {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) ?? '{}') as Draft } catch { return {} }
}
function writeDraft(d: Draft) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)) } catch { /* storage bloqueado */ }
}

export function OnboardingWizard({ userId, initialProfile, initialModules = [], suggestedName, onDone }: {
  userId: string
  /** Perfil ya creado (se retoma en el paso 4) */
  initialProfile?: StudioProfile | null
  initialModules?: StudioModule[]
  suggestedName?: string
  onDone: (profile: StudioProfile, modules: StudioModule[]) => void
}) {
  const draft = readDraft()
  const [step, setStep] = useState(() => (initialProfile ? Math.min(Math.max(initialProfile.onboarding_step ?? 3, 3) + 1, TOTAL) : 1))
  const [purpose, setPurpose] = useState<Purpose | undefined>((initialProfile?.purpose as Purpose) ?? draft.purpose)
  const [name, setName] = useState(initialProfile?.display_name ?? draft.name ?? suggestedName ?? '')
  const [descriptor, setDescriptor] = useState(initialProfile?.descriptor ?? draft.descriptor ?? '')
  const [username, setUsername] = useState(initialProfile?.username ?? draft.username ?? '')
  const [touchedUsername, setTouchedUsername] = useState(!!draft.username)
  const [profile, setProfile] = useState<StudioProfile | null>(initialProfile ?? null)
  const [modules, setModules] = useState<StudioModule[]>(initialModules)
  const [quick, setQuick] = useState<Partial<Record<QuickKey, string>>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const t = useStudioT()
  const ob = t.onboarding
  const lang = useAppLang(st => st.lang)
  const quickLabel = (key: QuickKey) => QUICK[key].label
    ?? (key === 'email' ? ob.quick.email : key === 'website' ? ob.quick.website : key === 'address' ? ob.quick.address : ob.quick.tickets)
  const quickPlaceholder = (key: QuickKey) => (key === 'address' ? ob.addressPlaceholder : QUICK[key].placeholder)

  const effectiveUsername = profile ? profile.username ?? '' : touchedUsername ? username : normalizeUsername(name)
  const status = useUsernameCheck(profile ? '' : effectiveUsername)

  const save = (d: Draft) => writeDraft({ purpose, name, descriptor, username: touchedUsername ? username : undefined, ...d })

  async function next() {
    setError(null)
    if (step === 1) {
      if (!purpose) { setError(ob.choosePurpose); return }
      save({}); setStep(2); return
    }
    if (step === 2) {
      if (name.trim().length < 2) { setError(ob.nameRequired); return }
      save({}); setStep(3); return
    }
    if (step === 3) {
      if (profile) {
        // Si volvió atrás y cambió nombre, descriptor o propósito, se guarda
        setBusy(true)
        try {
          setProfile(await updateProfile(profile.id, {
            display_name: name.trim(), descriptor: descriptor.trim() || null, purpose: purpose ?? 'personal',
          }))
          setStep(4)
        } catch (e) { setError(friendlyError(e)) } finally { setBusy(false) }
        return
      }
      if (status !== 'available') { setError(usernameMessage(t, status === 'idle' ? 'invalid' : status)); return }
      setBusy(true)
      try {
        let created = await createProfile(userId, effectiveUsername, name, lang)
        created = await updateProfile(created.id, {
          purpose: purpose ?? 'personal', descriptor: descriptor.trim() || null,
          onboarding_step: 3,
        })
        setProfile(created)
        try { localStorage.removeItem(DRAFT_KEY) } catch { /* noop */ }
        setStep(4)
      } catch (e) { setError(friendlyError(e)) } finally { setBusy(false) }
      return
    }
    if (step === 4 && profile) {
      setBusy(true)
      try {
        const created: StudioModule[] = []
        let position = (modules.reduce((m, x) => Math.max(m, x.position), 0) || 0) + 10
        const add = async (input: Parameters<typeof createModule>[0]) => { created.push(await createModule(input)); position += 10 }
        for (const key of SUGGESTED[purpose ?? 'personal']) {
          const v = quick[key]?.trim()
          if (!v) continue
          if (key === 'instagram' || key === 'tiktok' || key === 'youtube' || key === 'linkedin') {
            const url = socialUrl(key, v)
            if (url) await add({ profile_id: profile.id, type: 'social', title: quickLabel(key), content: { network: key, handle: v, url }, translations: {}, position })
          } else if (key === 'whatsapp' || key === 'email') {
            await add({ profile_id: profile.id, type: 'contact', title: ob.contactTitle, content: key === 'email' ? { email: v } : { whatsapp: v }, translations: {}, position })
          } else if (key === 'website' || key === 'tickets') {
            const url = socialUrl('', v)
            if (url) await add({ profile_id: profile.id, type: 'link', title: key === 'tickets' ? ob.ticketsTitle : ob.siteTitle, content: { url, link_type: key === 'website' ? 'website' : 'custom' }, translations: {}, position })
          } else if (key === 'address') {
            await add({ profile_id: profile.id, type: 'location', title: ob.locationTitle, content: { address: v }, translations: {}, position })
          }
        }
        setModules(prev => [...prev, ...created])
        setProfile(await updateProfile(profile.id, { onboarding_step: 4 }))
        setStep(5)
      } catch (e) { setError(friendlyError(e)) } finally { setBusy(false) }
    }
  }

  async function finish(publish: boolean) {
    if (!profile) return
    setBusy(true); setError(null)
    try {
      let saved = await updateProfile(profile.id, {
        theme: profile.theme, avatar_url: profile.avatar_url, onboarding_step: TOTAL,
      })
      // Publicar = crear la primera versión pública (Fase 3)
      if (publish) {
        await publishSpace(profile.id)
        saved = await loadProfile(profile.id)
      }
      onDone(saved, modules)
    } catch (e) { setError(friendlyError(e)); setBusy(false) }
  }

  const host = publicBaseUrl().replace(/^https?:\/\//, '')
  const titles = ob.titles
  const pct = Math.round((step / TOTAL) * 100)

  return (
    <div className="st-center" style={{ alignItems: 'flex-start', paddingTop: 'max(24px, 6vh)' }}>
      <div style={{ width: '100%', maxWidth: step === 5 ? 860 : 520 }}>
        <div className="st-row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <span className="st-label">mycen. · {ob.step(step, TOTAL)}</span>
          <span className="st-help">{pct}%</span>
        </div>
        <div role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={TOTAL} aria-label={ob.progress}
          style={{ height: 4, borderRadius: 4, background: 'var(--st-surface-2)', marginBottom: 28, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: 'var(--st-text)', transition: 'width .25s' }} />
        </div>

        <h1 className="st-title" style={{ marginBottom: 6 }}>{titles[step - 1]}</h1>

        {step === 1 && (
          <>
            <p className="st-subtitle" style={{ marginBottom: 20 }}>{ob.intro}</p>
            <div className="st-stack" role="radiogroup" aria-label={ob.purposeLabel} style={{ gap: 8 }}>
              {PURPOSES.map(p => (
                <button key={p.value} type="button" role="radio" aria-checked={purpose === p.value}
                  onClick={() => { setPurpose(p.value); setError(null) }}
                  className="st-module" style={{ cursor: 'pointer', color: 'inherit', borderColor: purpose === p.value ? 'var(--st-text)' : undefined, textAlign: 'start' }}>
                  <span className="st-module-icon" style={{ display: 'flex' }} aria-hidden="true"><p.icon size={17} /></span>
                  <span style={{ flex: 1 }}>
                    <span className="st-module-title" style={{ display: 'block' }}>{ob.purposes[p.value].label}</span>
                    <span className="st-module-sub" style={{ display: 'block', whiteSpace: 'normal' }}>{ob.purposes[p.value].hint}</span>
                  </span>
                  {purpose === p.value && <Check size={18} aria-hidden="true" />}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <div className="st-stack" style={{ marginTop: 18 }}>
            <TextField label={purpose === 'business' ? ob.businessName : purpose === 'event' ? ob.eventName : ob.yourName}
              required maxLength={80} value={name} onChange={v => { setName(v); setError(null) }} autoFocus />
            <TextField label={ob.oneLine} maxLength={120} value={descriptor} onChange={setDescriptor}
              placeholder={purpose === 'business' ? ob.oneLineBusiness : ob.oneLinePerson} />
          </div>
        )}

        {step === 3 && (
          <div className="st-stack" style={{ marginTop: 18 }}>
            {profile ? (
              <p className="st-subtitle">{ob.addressIs} <strong dir="ltr">{host}/{effectiveUsername}</strong>. {ob.changeInSettings}</p>
            ) : (
              <TextField label={t.settings.username} required value={effectiveUsername}
                onChange={v => { setTouchedUsername(true); setUsername(normalizeUsername(v)); setError(null) }}
                help={<>{host}/<strong>{effectiveUsername || ob.yourNamePlaceholder}</strong> · {usernameMessage(t, status)}</>}
                error={['taken', 'reserved', 'invalid'].includes(status) && effectiveUsername ? usernameMessage(t, status) : null} autoFocus />
            )}
          </div>
        )}

        {step === 4 && (
          <div className="st-stack" style={{ marginTop: 6 }}>
            <p className="st-subtitle">{ob.quickIntro}</p>
            {SUGGESTED[purpose ?? 'personal'].map(key => (
              <TextField key={key} label={quickLabel(key)} type={QUICK[key].type} placeholder={quickPlaceholder(key)}
                value={quick[key] ?? ''} onChange={v => setQuick(q => ({ ...q, [key]: v }))} />
            ))}
          </div>
        )}

        {step === 5 && profile && (
          <div className="st-grid-2" style={{ marginTop: 18, alignItems: 'start', gap: 24 }}>
            <div className="st-stack">
              <ImageField label={ob.avatar} shape="round" value={profile.avatar_url}
                onUpload={async f => { const url = await uploadMedia(userId, f, 'avatar'); setProfile(p => p && ({ ...p, avatar_url: url })) }}
                onClear={() => setProfile(p => p && ({ ...p, avatar_url: null }))} />
              <div className="st-field">
                <span className="st-label">{ob.theme}</span>
                <div className="st-segment" role="group" aria-label={ob.theme}>
                  {(['dark', 'light'] as const).map(m => (
                    <button key={m} type="button" aria-pressed={(profile.theme?.mode ?? 'dark') === m}
                      onClick={() => setProfile(p => p && ({ ...p, theme: { ...p.theme, mode: m } }))}>
                      {m === 'dark' ? ob.dark : ob.light}
                    </button>
                  ))}
                </div>
              </div>
              <div className="st-field">
                <span className="st-label">{ob.accent}</span>
                <div className="st-swatches" role="group" aria-label={ob.accent}>
                  {ACCENTS.map(a => (
                    <button key={a} type="button" className="st-swatch" style={{ background: a }} aria-label={a}
                      aria-pressed={(profile.theme?.accent ?? QUIET.ivory) === a}
                      onClick={() => setProfile(p => p && ({ ...p, theme: { ...p.theme, accent: a } }))} />
                  ))}
                </div>
              </div>
            </div>
            <div className="st-phone" style={{ height: 520, width: '100%', maxWidth: 340 }} aria-label={ob.preview}>
              <div className="st-phone-scroll">
                <ProfileView profile={toPublicProfile(profile, modules, null)} lang={lang} onLang={() => undefined} onToast={() => undefined} toast={null} preview />
              </div>
            </div>
          </div>
        )}

        {error && <p className="st-error" role="alert" style={{ marginTop: 16 }}>{error}</p>}

        <div className="st-row" style={{ justifyContent: 'space-between', marginTop: 28, flexWrap: 'wrap', gap: 10 }}>
          {step > 1
            ? <Button variant="ghost" onClick={() => { setError(null); setStep(s => Math.max(1, s - 1)) }} disabled={busy}>
                <ArrowLeft size={16} aria-hidden="true" className="flip-rtl" /> {ob.back}
              </Button>
            : <span />}
          {step < TOTAL && <Button variant="primary" onClick={next} loading={busy}>{ob.continue}</Button>}
          {step === TOTAL && (
            <div className="st-row" style={{ gap: 8 }}>
              <Button onClick={() => finish(false)} disabled={busy}>{ob.saveDraft}</Button>
              <Button variant="primary" onClick={() => finish(true)} loading={busy}>{ob.publish}</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
