import { useState } from 'react'
import { ArrowLeft, Briefcase, CalendarHeart, Check, Sparkles, Store, UserRound } from 'lucide-react'
import { ProfileView } from '@/modules/profile/components/ProfileView'
import { QUIET, themeVars } from '@/modules/profile/lib/profileTheme'
import { createModule, createProfile, friendlyError, updateProfile, uploadMedia } from '../lib/studioApi'
import { socialUrl } from '../lib/moduleCatalog'
import { toPublicProfile, publicBaseUrl } from '../lib/preview'
import { normalizeUsername, USERNAME_MESSAGES, useUsernameCheck } from '../lib/useUsernameCheck'
import type { StudioModule, StudioProfile } from '../lib/studioTypes'
import { Button, ImageField, TextField } from './ui'

const TOTAL = 5
const DRAFT_KEY = 'mycen_onboarding_draft'

type Purpose = 'personal' | 'professional' | 'creator' | 'business' | 'event'

const PURPOSES: { value: Purpose; label: string; hint: string; icon: typeof UserRound }[] = [
  { value: 'personal', label: 'Personal', hint: 'Tus redes y formas de contacto en un solo link', icon: UserRound },
  { value: 'professional', label: 'Profesional', hint: 'Tu trabajo, portfolio y datos de contacto', icon: Briefcase },
  { value: 'creator', label: 'Creador/a', hint: 'Tu contenido y tus comunidades', icon: Sparkles },
  { value: 'business', label: 'Negocio', hint: 'Lo que ofrecés, dónde estás y cómo contactarte', icon: Store },
  { value: 'event', label: 'Evento', hint: 'Fecha, lugar y entradas', icon: CalendarHeart },
]

/** Campos rápidos de módulos sugeridos según el propósito. */
type QuickKey = 'instagram' | 'tiktok' | 'youtube' | 'linkedin' | 'whatsapp' | 'email' | 'website' | 'address' | 'tickets'
const QUICK: Record<QuickKey, { label: string; placeholder: string; type?: string }> = {
  instagram: { label: 'Instagram', placeholder: '@tuusuario' },
  tiktok: { label: 'TikTok', placeholder: '@tuusuario' },
  youtube: { label: 'YouTube', placeholder: '@tucanal' },
  linkedin: { label: 'LinkedIn', placeholder: 'tu-perfil' },
  whatsapp: { label: 'WhatsApp', placeholder: '+54 9 341 000 0000', type: 'tel' },
  email: { label: 'Email de contacto', placeholder: 'hola@…', type: 'email' },
  website: { label: 'Sitio web o portfolio', placeholder: 'https://…', type: 'url' },
  address: { label: 'Dirección', placeholder: 'San Martín 123, Rosario' },
  tickets: { label: 'Link de entradas', placeholder: 'https://…', type: 'url' },
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

  const effectiveUsername = profile ? profile.username : touchedUsername ? username : normalizeUsername(name)
  const status = useUsernameCheck(profile ? '' : effectiveUsername)

  const save = (d: Draft) => writeDraft({ purpose, name, descriptor, username: touchedUsername ? username : undefined, ...d })

  async function next() {
    setError(null)
    if (step === 1) {
      if (!purpose) { setError('Elegí una opción para seguir.'); return }
      save({}); setStep(2); return
    }
    if (step === 2) {
      if (name.trim().length < 2) { setError('Escribí tu nombre o el de tu marca.'); return }
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
      if (status !== 'available') { setError(USERNAME_MESSAGES[status === 'idle' ? 'invalid' : status]); return }
      setBusy(true)
      try {
        let created = await createProfile(userId, effectiveUsername, name)
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
            if (url) await add({ profile_id: profile.id, type: 'social', title: QUICK[key].label, content: { network: key, handle: v, url }, translations: {}, position })
          } else if (key === 'whatsapp' || key === 'email') {
            await add({ profile_id: profile.id, type: 'contact', title: 'Contacto', content: key === 'email' ? { email: v } : { whatsapp: v }, translations: {}, position })
          } else if (key === 'website' || key === 'tickets') {
            const url = socialUrl('', v)
            if (url) await add({ profile_id: profile.id, type: 'link', title: key === 'tickets' ? 'Comprar entradas' : 'Mi sitio', content: { url, link_type: key === 'website' ? 'website' : 'custom' }, translations: {}, position })
          } else if (key === 'address') {
            await add({ profile_id: profile.id, type: 'location', title: 'Ubicación', content: { address: v }, translations: {}, position })
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
      const saved = await updateProfile(profile.id, {
        theme: profile.theme, avatar_url: profile.avatar_url,
        status: publish ? 'published' : 'draft', onboarding_step: TOTAL,
      })
      onDone(saved, modules)
    } catch (e) { setError(friendlyError(e)); setBusy(false) }
  }

  const host = publicBaseUrl().replace(/^https?:\/\//, '')
  const titles = ['¿Para qué vas a usar Mycen?', '¿Quién sos?', 'Elegí tu dirección', 'Sumá tus primeros links', 'Dale tu estilo y publicá']
  const pct = Math.round((step / TOTAL) * 100)

  return (
    <div className="st-center" style={{ alignItems: 'flex-start', paddingTop: 'max(24px, 6vh)' }}>
      <div style={{ width: '100%', maxWidth: step === 5 ? 860 : 520 }}>
        <div className="st-row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <span className="st-label">mycen. · Paso {step} de {TOTAL}</span>
          <span className="st-help">{pct}%</span>
        </div>
        <div role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={TOTAL} aria-label="Progreso"
          style={{ height: 4, borderRadius: 4, background: 'var(--st-surface-2)', marginBottom: 28, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: 'var(--st-text)', transition: 'width .25s' }} />
        </div>

        <h1 className="st-title" style={{ marginBottom: 6 }}>{titles[step - 1]}</h1>

        {step === 1 && (
          <>
            <p className="st-subtitle" style={{ marginBottom: 20 }}>Te sugerimos una configuración inicial. Después podés cambiar todo.</p>
            <div className="st-stack" role="radiogroup" aria-label="Propósito" style={{ gap: 8 }}>
              {PURPOSES.map(p => (
                <button key={p.value} type="button" role="radio" aria-checked={purpose === p.value}
                  onClick={() => { setPurpose(p.value); setError(null) }}
                  className="st-module" style={{ cursor: 'pointer', color: 'inherit', borderColor: purpose === p.value ? 'var(--st-text)' : undefined, textAlign: 'left' }}>
                  <span className="st-module-icon" style={{ display: 'flex' }} aria-hidden="true"><p.icon size={17} /></span>
                  <span style={{ flex: 1 }}>
                    <span className="st-module-title" style={{ display: 'block' }}>{p.label}</span>
                    <span className="st-module-sub" style={{ display: 'block', whiteSpace: 'normal' }}>{p.hint}</span>
                  </span>
                  {purpose === p.value && <Check size={18} aria-hidden="true" />}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <div className="st-stack" style={{ marginTop: 18 }}>
            <TextField label={purpose === 'business' ? 'Nombre del negocio' : purpose === 'event' ? 'Nombre del evento' : 'Tu nombre o el de tu marca'}
              required maxLength={80} value={name} onChange={v => { setName(v); setError(null) }} autoFocus />
            <TextField label="Qué hacés, en una línea (opcional)" maxLength={120} value={descriptor} onChange={setDescriptor}
              placeholder={purpose === 'business' ? 'Café de especialidad en Rosario' : 'Diseñadora · Fotógrafa'} />
          </div>
        )}

        {step === 3 && (
          <div className="st-stack" style={{ marginTop: 18 }}>
            {profile ? (
              <p className="st-subtitle">Tu dirección es <strong>{host}/{profile.username}</strong>. La podés cambiar en Ajustes.</p>
            ) : (
              <TextField label="Username" required value={effectiveUsername}
                onChange={v => { setTouchedUsername(true); setUsername(normalizeUsername(v)); setError(null) }}
                help={<>{host}/<strong>{effectiveUsername || 'tu-nombre'}</strong> · {USERNAME_MESSAGES[status]}</>}
                error={['taken', 'reserved', 'invalid'].includes(status) && effectiveUsername ? USERNAME_MESSAGES[status] : null} autoFocus />
            )}
          </div>
        )}

        {step === 4 && (
          <div className="st-stack" style={{ marginTop: 6 }}>
            <p className="st-subtitle">Completá los que quieras: se agregan como módulos. Todo es opcional.</p>
            {SUGGESTED[purpose ?? 'personal'].map(key => (
              <TextField key={key} label={QUICK[key].label} type={QUICK[key].type} placeholder={QUICK[key].placeholder}
                value={quick[key] ?? ''} onChange={v => setQuick(q => ({ ...q, [key]: v }))} />
            ))}
          </div>
        )}

        {step === 5 && profile && (
          <div className="st-grid-2" style={{ marginTop: 18, alignItems: 'start', gap: 24 }}>
            <div className="st-stack">
              <ImageField label="Foto de perfil (opcional)" shape="round" value={profile.avatar_url}
                onUpload={async f => { const url = await uploadMedia(userId, f); setProfile(p => p && ({ ...p, avatar_url: url })) }}
                onClear={() => setProfile(p => p && ({ ...p, avatar_url: null }))} />
              <div className="st-field">
                <span className="st-label">Tema</span>
                <div className="st-segment" role="group" aria-label="Tema">
                  {(['dark', 'light'] as const).map(m => (
                    <button key={m} type="button" aria-pressed={(profile.theme?.mode ?? 'dark') === m}
                      onClick={() => setProfile(p => p && ({ ...p, theme: { ...p.theme, mode: m } }))}>
                      {m === 'dark' ? 'Oscuro' : 'Claro'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="st-field">
                <span className="st-label">Color de acento</span>
                <div className="st-swatches" role="group" aria-label="Color de acento">
                  {ACCENTS.map(a => (
                    <button key={a} type="button" className="st-swatch" style={{ background: a }} aria-label={a}
                      aria-pressed={(profile.theme?.accent ?? QUIET.ivory) === a}
                      onClick={() => setProfile(p => p && ({ ...p, theme: { ...p.theme, accent: a } }))} />
                  ))}
                </div>
              </div>
            </div>
            <div className="st-phone" style={{ height: 520, width: '100%', maxWidth: 340 }} aria-label="Vista previa">
              <div className="st-phone-scroll">
                <ProfileView profile={toPublicProfile(profile, modules, null)} lang="es" onLang={() => undefined}
                  style={themeVars(profile.theme)} onToast={() => undefined} toast={null} preview />
              </div>
            </div>
          </div>
        )}

        {error && <p className="st-error" role="alert" style={{ marginTop: 16 }}>{error}</p>}

        <div className="st-row" style={{ justifyContent: 'space-between', marginTop: 28, flexWrap: 'wrap', gap: 10 }}>
          {step > 1
            ? <Button variant="ghost" onClick={() => { setError(null); setStep(s => Math.max(1, s - 1)) }} disabled={busy}>
                <ArrowLeft size={16} aria-hidden="true" /> Atrás
              </Button>
            : <span />}
          {step < TOTAL && <Button variant="primary" onClick={next} loading={busy}>Continuar</Button>}
          {step === TOTAL && (
            <div className="st-row" style={{ gap: 8 }}>
              <Button onClick={() => finish(false)} disabled={busy}>Guardar como borrador</Button>
              <Button variant="primary" onClick={() => finish(true)} loading={busy}>Publicar mi perfil</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
