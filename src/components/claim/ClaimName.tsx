import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { publicRpc } from '@/lib/publicRpc'
import { claimLink, claimSuggestions, type ClaimPlace } from '@/lib/claim'
import { normalizeUsername, validUsername } from '@/lib/username'
import { webOrigin } from '@/lib/platform'
import type { Referral } from '@/lib/referral'
import { claimT } from '@/i18n/app/claim'
import { useAppLang } from '@/i18n/app/store'
import type { AppLang } from '@/i18n/app/languages'
import './claim.css'

// "Elegí tu nombre" (mycen.id/<nombre>): consulta en el momento si está libre (check_username, sin sesión, por
// publicRpc: la landing y el perfil no cargan Supabase) y lleva al registro con el nombre. Si está tomado ofrece
// alternativas libres. No reserva nada: el nombre es de la persona cuando crea su perfil (el onboarding lo revisa).

type Status = 'idle' | 'invalid' | 'checking' | 'available' | 'taken' | 'reserved' | 'error'

async function check(username: string): Promise<Status> {
  const { data, error } = await publicRpc<string>('check_username', { p_username: username })
  if (error) return 'error'
  return data === 'available' || data === 'taken' || data === 'reserved' || data === 'invalid' ? data : 'error'
}

/** Dirección que se muestra adelante del campo: la misma base que usan los links públicos */
function host(): string {
  const env = (import.meta.env.VITE_PUBLIC_PROFILE_BASE as string | undefined)?.replace(/\/+$/, '')
  return (env || webOrigin()).replace(/^https?:\/\//, '')
}

export function ClaimName({ from, initial = '', referral, theme = 'universo', accent, lang, compact }: {
  from: ClaimPlace
  initial?: string
  /** Vino del pie de un perfil: se conserva a quién atribuir el registro */
  referral?: Referral | null
  theme?: 'universo' | 'amanecer'
  accent?: string
  /** Idioma (la página pública lo pasa); si no, el de la app */
  lang?: AppLang
  /** Campo y botón uno debajo del otro siempre (pie del perfil, perfil libre) */
  compact?: boolean
}) {
  const appLang = useAppLang(s => s.lang)
  const t = claimT(lang ?? appLang)
  const navigate = useNavigate()
  const statusId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState(() => normalizeUsername(initial))
  const [result, setResult] = useState<{ value: string; status: Status } | null>(null)
  const [alternatives, setAlternatives] = useState<{ value: string; list: string[] } | null>(null)
  const [tried, setTried] = useState(false)

  const local: Status | null = !value ? 'idle' : !validUsername(value) ? 'invalid' : null
  const status: Status = local ?? (result?.value === value ? result.status : 'checking')

  useEffect(() => {
    if (local) return
    let cancelled = false
    const timer = window.setTimeout(() => {
      void check(value).then(async s => {
        if (cancelled) return
        setResult({ value, status: s })
        if (s !== 'taken' && s !== 'reserved') return
        // Alternativas: sólo las que la base dice que están libres (hasta 3)
        const options = claimSuggestions(value)
        const checked = await Promise.all(options.map(async o => [o, await check(o)] as const))
        if (!cancelled) setAlternatives({ value, list: checked.filter(([, st]) => st === 'available').map(([o]) => o).slice(0, 3) })
      })
    }, 400)
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [value, local])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setTried(true)
    // "error" (no se pudo consultar) y "checking" siguen: el onboarding vuelve a revisarlo antes de crear el perfil
    if (status === 'available' || status === 'error' || status === 'checking') {
      navigate(claimLink(value, from, referral))
      return
    }
    inputRef.current?.focus()
  }

  const message = status === 'idle' ? (tried ? t.invalid : '')
    : status === 'invalid' ? t.invalid
      : status === 'checking' ? t.checking
        : status === 'available' ? t.available
          : status === 'taken' ? t.taken
            : status === 'reserved' ? t.reserved
              : t.error
  const list = (status === 'taken' || status === 'reserved') && alternatives?.value === value ? alternatives.list : []

  return (
    <form className={`my-claim${compact ? ' my-claim-compact' : ''}`} onSubmit={submit} noValidate
      data-mycen-theme={theme} {...(accent ? { 'data-mycen-accent': accent } : {})} data-status={status}>
      <div className="my-claim-row">
        <label className="my-claim-field">
          <span className="my-claim-prefix" aria-hidden="true">{host()}/</span>
          <input
            ref={inputRef}
            value={value}
            onChange={e => setValue(normalizeUsername(e.target.value))}
            aria-label={t.label}
            aria-describedby={statusId}
            aria-invalid={status === 'invalid' || status === 'taken' || status === 'reserved' || undefined}
            placeholder={t.placeholder}
            dir="ltr"
            autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false}
            enterKeyHint="go" maxLength={30}
            name="claim-username"
          />
        </label>
        <button type="submit" className="my-claim-submit">{t.submit}</button>
      </div>
      <p id={statusId} className="my-claim-status" role="status" aria-live="polite">
        {message && <span className="my-claim-msg">{message}</span>}
        {list.length > 0 && (
          <span className="my-claim-alts">
            <span>{t.tryThese}</span>
            {list.map(s => (
              <button key={s} type="button" className="my-claim-alt" dir="ltr"
                onClick={() => { setValue(s); inputRef.current?.focus() }}>{s}</button>
            ))}
          </span>
        )}
      </p>
    </form>
  )
}
