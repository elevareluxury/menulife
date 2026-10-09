import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Archive, ArchiveRestore, Copy, Layers, Plus } from 'lucide-react'
import { useStudio } from '../StudioContext'
import { createSpace, duplicateSpace, friendlyError, setSpaceArchived } from '../lib/studioApi'
import {
  MAX_SPACES, SPACE_PURPOSES, activeSpaces, normalizeSpaceSlug, primarySpace, spaceHandle, spaceSlugIssue,
  suggestSpaceSlug, type SpaceSummary,
} from '../lib/spaces'
import { publicBaseUrl } from '../lib/preview'
import { Button, ConfirmDialog, Drawer, Menu, PageHeader, SelectField, TextField } from '../components/ui'
import { StatusPill } from '../components/shared'
import { useStudioT } from '@/i18n/app/studio'
import { useAppLang } from '@/i18n/app/store'

type FormMode = { kind: 'new' } | { kind: 'duplicate'; from: SpaceSummary }

/** Mis Spaces (Identity Fase 10): crear, duplicar, archivar y abrir cada Space en Studio. */
export function SpacesPage() {
  const { spaces, profile, userId, primaryUsername, switchSpace, reloadSpaces } = useStudio()
  const t = useStudioT()
  const s = t.spaces
  const navigate = useNavigate()
  const host = publicBaseUrl().replace(/^https?:\/\//, '')
  const live = activeSpaces(spaces)
  const archived = spaces.filter(sp => sp.status === 'archived')
  const full = live.length >= MAX_SPACES
  // Los Spaces nuevos viven dentro del principal
  const canNest = !!primarySpace(spaces)
  const [form, setForm] = useState<FormMode | null>(null)
  const [archiving, setArchiving] = useState<SpaceSummary | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const nameOf = (sp: SpaceSummary) => sp.display_name || spaceHandle(sp, primaryUsername)

  function open(sp: SpaceSummary) {
    navigate('/studio')
    switchSpace(sp.id)
  }

  async function archive(sp: SpaceSummary, value: boolean) {
    setBusy(sp.id); setError(null)
    try {
      await setSpaceArchived(sp, value)
      setArchiving(null)
      // Si se archiva el que está abierto, Studio vuelve al principal
      if (value && sp.id === profile.id) {
        const main = primarySpace(spaces)
        if (main) { switchSpace(main.id); return }
      }
      await reloadSpaces()
    } catch (e) {
      setError(friendlyError(e))
      setArchiving(null)
    } finally { setBusy(null) }
  }

  return (
    <>
      <PageHeader title={s.title} subtitle={s.subtitle}
        actions={canNest && (
          <Button variant="primary" size="sm" disabled={full} onClick={() => { setError(null); setForm({ kind: 'new' }) }}>
            <Plus size={15} aria-hidden="true" /> {s.newTitle}
          </Button>
        )} />

      <section className="st-card st-space-explain" aria-labelledby="st-space-explain">
        <h2 id="st-space-explain" className="st-card-title" style={{ margin: 0 }}>{s.explainTitle}</h2>
        <p style={{ margin: 0 }}>{s.explainText}</p>
        <ul className="st-space-examples">
          {s.examples.map(ex => <li key={ex}>{ex}</li>)}
        </ul>
        <p className="st-help" style={{ margin: 0 }}>
          {s.exampleLink} <span className="st-space-example-url" dir="ltr">{host}/{primaryUsername || '…'}/<strong>{s.exampleSlug}</strong></span>
        </p>
      </section>

      <p className="st-help" role="status">
        {s.count(live.length, MAX_SPACES)}{full ? ` · ${s.limitReached(MAX_SPACES)}` : ''}
      </p>
      {error && <p className="st-error" role="alert">{error}</p>}

      <ul className="st-module-list" aria-label={s.listLabel} style={{ listStyle: 'none', margin: '0 0 24px', padding: 0 }}>
        {live.map(sp => {
          const handle = spaceHandle(sp, primaryUsername)
          const current = sp.id === profile.id
          return (
            <li key={sp.id} className="st-module st-space-item" aria-label={nameOf(sp)}>
              {sp.avatar_url
                ? <img className="st-module-icon" src={sp.avatar_url} alt="" style={{ objectFit: 'cover', borderRadius: '50%' }} />
                : <span className="st-module-icon" aria-hidden="true"><Layers size={17} /></span>}
              <div className="st-module-body">
                <div className="st-module-title">
                  {nameOf(sp)}
                  {sp.is_primary && <> <span className="st-badge">{s.primary}</span></>}
                  {sp.restaurant_id && <> <span className="st-badge">{s.business}</span></>}
                </div>
                <div className="st-module-sub" dir="ltr">{host}/{handle}</div>
              </div>
              <StatusPill status={sp.status} />
              {current
                ? <span className="st-badge" aria-current="true">{s.editing}</span>
                : <Button size="sm" onClick={() => open(sp)}>{s.open}</Button>}
              <Menu label={s.actions(nameOf(sp))} items={[
                ...(canNest ? [{ icon: Copy, label: s.duplicate, disabled: full, onSelect: () => { setError(null); setForm({ kind: 'duplicate', from: sp }) } }] : []),
                // El principal es la dirección raíz y los negocios se manejan desde Mycen Business
                ...(!sp.is_primary && !sp.restaurant_id ? [{ icon: Archive, label: s.archive, onSelect: () => setArchiving(sp) }] : []),
              ]} />
            </li>
          )
        })}
      </ul>

      {archived.length > 0 && (
        <section className="st-stack" aria-labelledby="st-archived-title">
          <div>
            <h2 id="st-archived-title" className="st-card-title" style={{ margin: 0 }}>{s.archivedTitle}</h2>
            <p className="st-help" style={{ margin: '4px 0 0' }}>{s.archivedHelp}</p>
          </div>
          <ul className="st-module-list" aria-label={s.archivedTitle} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {archived.map(sp => (
              <li key={sp.id} className="st-module st-space-item is-hidden" aria-label={nameOf(sp)}>
                <span className="st-module-icon" aria-hidden="true"><Archive size={17} /></span>
                <div className="st-module-body">
                  <div className="st-module-title">{nameOf(sp)}</div>
                  <div className="st-module-sub" dir="ltr">{host}/{spaceHandle(sp, primaryUsername)}</div>
                </div>
                <Button size="sm" disabled={full} loading={busy === sp.id} onClick={() => { void archive(sp, false) }}>
                  <ArchiveRestore size={15} aria-hidden="true" /> {s.restore}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {form && (
        <SpaceForm mode={form} onClose={() => setForm(null)}
          onCreate={async (input) => {
            const id = form.kind === 'new'
              ? (await createSpace(userId, { ...input, locale: useAppLang.getState().lang })).id
              : await duplicateSpace(form.from.id, input.slug, input.name)
            setForm(null)
            // Un Space nuevo sigue por Apariencia (estructura, tema, acento y huella propios); la copia ya los tiene
            navigate(form.kind === 'new' ? '/studio/appearance' : '/studio/identity')
            switchSpace(id)
          }} />
      )}

      {archiving && (
        <ConfirmDialog
          title={s.confirmArchiveTitle(nameOf(archiving))}
          message={s.confirmArchiveText(`${host}/${spaceHandle(archiving, primaryUsername)}`)}
          confirmLabel={s.archive} danger loading={busy === archiving.id}
          onConfirm={() => { void archive(archiving, true) }} onCancel={() => setArchiving(null)} />
      )}
    </>
  )
}

/** Crear un Space nuevo o duplicar uno: nombre, dirección (/{principal}/{slug}) y tipo. */
function SpaceForm({ mode, onClose, onCreate }: {
  mode: FormMode
  onClose: () => void
  onCreate: (input: { name: string; slug: string; purpose: string }) => Promise<void>
}) {
  const { spaces, primaryUsername } = useStudio()
  const t = useStudioT()
  const s = t.spaces
  const host = publicBaseUrl().replace(/^https?:\/\//, '')
  const initialName = mode.kind === 'duplicate' ? s.copyName(mode.from.display_name) : ''
  const [name, setName] = useState(initialName)
  const [slug, setSlug] = useState(initialName ? suggestSpaceSlug(initialName, spaces) : '')
  const [slugTouched, setSlugTouched] = useState(false)
  const [purpose, setPurpose] = useState<string>(SPACE_PURPOSES[0])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const issue = slug ? spaceSlugIssue(slug, spaces) : null
  const title = mode.kind === 'new' ? s.newTitle : s.duplicateTitle(mode.from.display_name)

  async function submit() {
    if (name.trim().length < 2) { setError(t.errors.nameRequired); return }
    if (!slug || issue) { setError(s.slugIssue[issue ?? 'invalid']); return }
    setBusy(true); setError(null)
    try {
      await onCreate({ name: name.trim(), slug, purpose })
    } catch (e) {
      setError(friendlyError(e))
      setBusy(false)
    }
  }

  return (
    <Drawer title={title} onClose={() => { if (!busy) onClose() }}
      footer={<>
        <Button variant="ghost" onClick={onClose} disabled={busy}>{t.common.cancel}</Button>
        <Button variant="primary" loading={busy} onClick={() => { void submit() }}>
          {mode.kind === 'new' ? s.create : s.duplicate}
        </Button>
      </>}>
      <div className="st-stack">
        <p className="st-help" style={{ margin: 0 }}>
          {mode.kind === 'new' ? s.newHelp(`${host}/${primaryUsername}`) : s.duplicateHelp}
        </p>
        <TextField label={s.name} required autoFocus value={name} maxLength={80}
          onChange={v => {
            setName(v); setError(null)
            if (!slugTouched) setSlug(suggestSpaceSlug(v, spaces))
          }} onEnter={() => { void submit() }} />
        <TextField label={s.addressLabel} required value={slug}
          onChange={v => { setSlug(normalizeSpaceSlug(v)); setSlugTouched(true); setError(null) }}
          help={<span dir="ltr">{host}/{primaryUsername}/<strong>{slug || '…'}</strong></span>}
          error={issue ? s.slugIssue[issue] : null} />
        {mode.kind === 'new' && (
          <SelectField label={s.type} required value={purpose} onChange={setPurpose}
            options={SPACE_PURPOSES.map(p => ({ value: p, label: s.purposes[p] }))} />
        )}
        {error && <p className="st-error" role="alert">{error}</p>}
      </div>
    </Drawer>
  )
}
