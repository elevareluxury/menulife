import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, History, Trash2 } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useStudio } from '../StudioContext'
import { deleteMyAccount, exportMyData, friendlyError, loadVersions, updateProfile } from '../lib/studioApi'
import type { SpaceVersion } from '../lib/studioTypes'
import { publicBaseUrl } from '../lib/preview'
import { normalizeUsername, usernameMessage, useUsernameCheck } from '../lib/useUsernameCheck'
import { Button, ConfirmDialog, PageHeader, SelectField, TextField } from '../components/ui'
import { ProfileSaveIndicator, StatusPill } from '../components/shared'
import { useStudioT } from '@/i18n/app/studio'
import { APP_LANGS, LANG_INFO, isAppLang, langLocale, type AppLang } from '@/i18n/app/languages'
import { useAppLang } from '@/i18n/app/store'
import { savePrefs, usePrefs } from '@/lib/prefs'

export function SettingsPage() {
  const { profile, patchProfile, replaceProfile, userId, business, publish, publishing } = useStudio()
  const [username, setUsername] = useState(profile.username)
  const [confirm, setConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [confirmPause, setConfirmPause] = useState(false)
  const status = useUsernameCheck(username, profile.username)
  const host = publicBaseUrl().replace(/^https?:\/\//, '')
  const t = useStudioT()
  const st = t.settings
  const appLang = usePrefs(p => p.language)
  const [langError, setLangError] = useState<string | null>(null)
  const langOptions = APP_LANGS.map(code => ({ value: code, label: LANG_INFO[code].native }))

  async function changeUsername() {
    setSaving(true); setError(null)
    try {
      const saved = await updateProfile(profile.id, { username })
      replaceProfile({ ...profile, username: saved.username })
      setDone(true)
      setConfirm(false)
    } catch (e) {
      setError(friendlyError(e))
      setConfirm(false)
    } finally { setSaving(false) }
  }

  const isPublished = profile.status === 'published'

  return (
    <>
      <PageHeader title={st.title} actions={<ProfileSaveIndicator />} />

      <section className="st-card st-stack">
        <h2 className="st-card-title" style={{ margin: 0 }}>{st.publication}</h2>
        <div className="st-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <StatusPill status={profile.status} />
          {isPublished
            ? <Button onClick={() => setConfirmPause(true)}>{st.pause}</Button>
            : <Button variant="primary" loading={publishing} onClick={() => { void publish() }}>{st.publish}</Button>}
        </div>
        <p className="st-help" style={{ margin: 0 }}>
          {isPublished
            ? st.publishedHelp
            : st.draftHelp}
        </p>
      </section>

      <VersionsSection />

      <section className="st-card st-stack">
        <h2 className="st-card-title" style={{ margin: 0 }}>{st.username}</h2>
        <TextField label={st.yourAddress} value={username}
          onChange={v => { setUsername(normalizeUsername(v)); setDone(false) }}
          help={<>{host}/<strong>{username || '…'}</strong> · {usernameMessage(t, status)}</>}
          error={['taken', 'reserved', 'invalid'].includes(status) ? usernameMessage(t, status) : error} />
        {done && <p className="st-help" role="status" style={{ margin: 0 }}>{st.usernameDone}</p>}
        <div>
          <Button variant="primary" disabled={status !== 'available'} onClick={() => setConfirm(true)}>{st.changeUsername}</Button>
        </div>
      </section>

      <section className="st-card st-stack">
        <h2 className="st-card-title" style={{ margin: 0 }}>{st.language}</h2>
        <SelectField label={st.appLanguage} required value={appLang} options={langOptions}
          error={langError}
          onChange={v => {
            if (!isAppLang(v)) return
            setLangError(null)
            savePrefs(userId, { language: v as AppLang }).catch(() => setLangError(t.errors.generic))
          }} />
        <p className="st-help" style={{ margin: 0 }}>{st.appLanguageHelp}</p>
        <SelectField label={st.profileLanguage} required
          value={isAppLang(profile.default_locale) ? profile.default_locale : 'es'} options={langOptions}
          onChange={v => patchProfile({ default_locale: v })} />
        <p className="st-help" style={{ margin: 0 }}>{st.profileLanguageHelp}</p>
      </section>

      <PrivacySection userId={userId} hasBusiness={!!business} />

      {confirm && (
        <ConfirmDialog
          title={st.confirmUsernameTitle}
          message={st.confirmUsernameText(`${host}/${username}`, profile.username)}
          confirmLabel={st.change} loading={saving}
          onConfirm={changeUsername} onCancel={() => setConfirm(false)} />
      )}
      {confirmPause && (
        <ConfirmDialog
          title={st.confirmPauseTitle}
          message={st.confirmPauseText}
          confirmLabel={st.pauseShort} danger
          onConfirm={() => { patchProfile({ status: 'unpublished' }); setConfirmPause(false) }}
          onCancel={() => setConfirmPause(false)} />
      )}
    </>
  )
}

// ── Versiones publicadas (Fase 3) ─────────────────────────────────────────

function VersionsSection() {
  const { profile, publishState, restoreVersion } = useStudio()
  const t = useStudioT()
  const p = t.publishing
  const [versions, setVersions] = useState<SpaceVersion[] | null | 'error'>(null)
  const [confirm, setConfirm] = useState<SpaceVersion | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const currentId = publishState?.version_id ?? profile.published_version_id

  useEffect(() => {
    let cancelled = false
    loadVersions(profile.id)
      .then(v => { if (!cancelled) setVersions(v) })
      .catch(() => { if (!cancelled) setVersions('error') })
    return () => { cancelled = true }
  }, [profile.id, currentId])

  const numberOf = (id: string | null) => (Array.isArray(versions) ? versions.find(v => v.id === id)?.version_number : undefined)
  const locale = langLocale(useAppLang(s => s.lang))

  async function restore(v: SpaceVersion) {
    setBusy(true); setError(null); setMessage(null)
    try {
      const n = await restoreVersion(v.id)
      setMessage(p.restored(n))
      setConfirm(null)
    } catch (e) {
      setError(friendlyError(e))
      setConfirm(null)
    } finally { setBusy(false) }
  }

  return (
    <section className="st-card st-stack" aria-labelledby="st-versions-title">
      <h2 id="st-versions-title" className="st-card-title" style={{ margin: 0 }}>{p.versionsTitle}</h2>
      <p className="st-help" style={{ margin: 0 }}>{p.versionsHelp}</p>
      {versions === null && <p className="st-help">{t.common.loading}</p>}
      {versions === 'error' && <p className="st-error">{p.loadError}</p>}
      {Array.isArray(versions) && versions.length === 0 && <p className="st-help" style={{ margin: 0 }}>{p.versionsEmpty}</p>}
      {Array.isArray(versions) && versions.length > 0 && (
        <ul className="st-version-list">
          {versions.map(v => {
            const restoredFrom = numberOf(v.restored_from)
            const isCurrent = v.id === currentId
            return (
              <li key={v.id}>
                <span>
                  <strong>{p.version(v.version_number)}</strong>
                  {isCurrent && <span className="st-status-pill is-published" style={{ marginInlineStart: 8 }}><i aria-hidden="true" /> {p.current}</span>}
                  <span className="st-help" style={{ display: 'block' }}>
                    {new Date(v.created_at).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })}
                    {restoredFrom ? ` · ${p.restoredFrom(restoredFrom)}` : v.note && !v.restored_from ? ` · ${v.note}` : ''}
                  </span>
                </span>
                {!isCurrent && (
                  <Button size="sm" onClick={() => setConfirm(v)}><History size={14} aria-hidden="true" /> {p.restore}</Button>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {message && <p className="st-help" role="status" style={{ margin: 0 }}>{message}</p>}
      {error && <p className="st-error" role="alert" style={{ margin: 0 }}>{error}</p>}
      {confirm && (
        <ConfirmDialog
          title={p.restoreTitle(confirm.version_number)}
          message={p.restoreText}
          confirmLabel={p.restore} loading={busy}
          onConfirm={() => { void restore(confirm) }}
          onCancel={() => setConfirm(null)} />
      )}
    </section>
  )
}

// ── Privacidad ──────────────────────────────────────────────────────────────

function PrivacySection({ userId, hasBusiness }: { userId: string; hasBusiness: boolean }) {
  const navigate = useNavigate()
  const { user, signOut } = useAuthStore()
  const [exporting, setExporting] = useState(false)
  const [open, setOpen] = useState(false)
  const [word, setWord] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const t = useStudioT()
  const st = t.settings

  async function download() {
    setExporting(true); setMessage(null)
    try {
      const blob = await exportMyData(userId, user?.email)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${st.fileName}-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      setMessage(st.downloadError)
    } finally { setExporting(false) }
  }

  async function remove() {
    setDeleting(true); setMessage(null)
    const result = await deleteMyAccount(userId)
    if (result === 'deleted') {
      await signOut()
      navigate('/', { replace: true })
      return
    }
    setDeleting(false)
    setMessage(result === 'has_business' ? st.deleteHasBusiness : st.deleteError)
  }

  return (
    <section className="st-card st-stack">
      <h2 className="st-card-title" style={{ margin: 0 }}>{st.privacy}</h2>
      <div className="st-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: 0, fontWeight: 500 }}>{st.download}</p>
          <p className="st-help" style={{ margin: '2px 0 0' }}>{st.downloadHelp}</p>
        </div>
        <Button onClick={download} loading={exporting}><Download size={15} aria-hidden="true" /> {st.downloadBtn}</Button>
      </div>
      <div className="st-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', borderTop: '1px solid var(--st-border)', paddingTop: 14 }}>
        <div>
          <p style={{ margin: 0, fontWeight: 500 }}>{st.deleteAccount}</p>
          <p className="st-help" style={{ margin: '2px 0 0' }}>
            {hasBusiness ? st.deleteHelpBusiness : st.deleteHelp}
          </p>
        </div>
        <Button variant="danger" onClick={() => { setOpen(true); setWord('') }}><Trash2 size={15} aria-hidden="true" /> {t.common.delete}</Button>
      </div>
      {message && <p className="st-error" role="alert" style={{ margin: 0 }}>{message}</p>}

      {open && (
        <div className="st-dialog-wrap" onMouseDown={e => { if (e.target === e.currentTarget && !deleting) setOpen(false) }}>
          <div className="st-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-title">
            <h2 id="delete-title">{st.deleteTitle}</h2>
            <p>{st.deleteText} <strong>{st.deleteWord}</strong>.</p>
            <TextField label={st.confirmation} value={word} onChange={setWord} autoFocus />
            <div className="st-row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={deleting}>{t.common.cancel}</Button>
              <Button variant="danger" disabled={word.trim().toUpperCase() !== st.deleteWord.toUpperCase()} loading={deleting} onClick={remove}>
                {st.deleteAccount}
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
