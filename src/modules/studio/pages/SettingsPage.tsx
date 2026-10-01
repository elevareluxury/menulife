import { useState } from 'react'
import { useStudio } from '../StudioContext'
import { friendlyError, updateProfile } from '../lib/studioApi'
import { publicBaseUrl } from '../lib/preview'
import { normalizeUsername, USERNAME_MESSAGES, useUsernameCheck } from '../lib/useUsernameCheck'
import { Button, ConfirmDialog, PageHeader, SelectField, TextField } from '../components/ui'
import { ProfileSaveIndicator, StatusPill } from '../components/shared'

export function SettingsPage() {
  const { profile, patchProfile, replaceProfile } = useStudio()
  const [username, setUsername] = useState(profile.username)
  const [confirm, setConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [confirmPause, setConfirmPause] = useState(false)
  const status = useUsernameCheck(username, profile.username)
  const host = publicBaseUrl().replace(/^https?:\/\//, '')

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
      <PageHeader title="Ajustes" actions={<ProfileSaveIndicator />} />

      <section className="st-card st-stack">
        <h2 className="st-card-title" style={{ margin: 0 }}>Publicación</h2>
        <div className="st-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <StatusPill status={profile.status} />
          {isPublished
            ? <Button onClick={() => setConfirmPause(true)}>Pausar perfil</Button>
            : <Button variant="primary" onClick={() => patchProfile({ status: 'published' })}>Publicar perfil</Button>}
        </div>
        <p className="st-help" style={{ margin: 0 }}>
          {isPublished
            ? 'Cualquiera con tu link o QR puede ver tu perfil.'
            : 'Mientras no esté publicado, sólo vos podés verlo (vista previa).'}
        </p>
      </section>

      <section className="st-card st-stack">
        <h2 className="st-card-title" style={{ margin: 0 }}>Username</h2>
        <TextField label="Tu dirección" value={username}
          onChange={v => { setUsername(normalizeUsername(v)); setDone(false) }}
          help={<>{host}/<strong>{username || '…'}</strong> · {USERNAME_MESSAGES[status]}</>}
          error={['taken', 'reserved', 'invalid'].includes(status) ? USERNAME_MESSAGES[status] : error} />
        {done && <p className="st-help" role="status" style={{ margin: 0 }}>Listo. Tu dirección anterior redirige automáticamente a la nueva.</p>}
        <div>
          <Button variant="primary" disabled={status !== 'available'} onClick={() => setConfirm(true)}>Cambiar username</Button>
        </div>
      </section>

      <section className="st-card st-stack">
        <h2 className="st-card-title" style={{ margin: 0 }}>Idioma</h2>
        <SelectField label="Idioma principal de tu perfil" required value={profile.default_locale?.startsWith('en') ? 'en' : 'es'}
          options={[{ value: 'es', label: 'Español' }, { value: 'en', label: 'English' }]}
          onChange={v => patchProfile({ default_locale: v })} />
        <p className="st-help" style={{ margin: 0 }}>Los visitantes pueden cambiar entre ES y EN con el botón de tu perfil.</p>
      </section>

      {confirm && (
        <ConfirmDialog
          title="¿Cambiar tu username?"
          message={`Tu perfil pasa a ${host}/${username}. Los links y QRs con /${profile.username} van a seguir funcionando: redirigen a la dirección nueva.`}
          confirmLabel="Cambiar" loading={saving}
          onConfirm={changeUsername} onCancel={() => setConfirm(false)} />
      )}
      {confirmPause && (
        <ConfirmDialog
          title="¿Pausar tu perfil?"
          message="Quien abra tu link o escanee tu QR va a ver que el perfil no está disponible, hasta que lo vuelvas a publicar."
          confirmLabel="Pausar" danger
          onConfirm={() => { patchProfile({ status: 'unpublished' }); setConfirmPause(false) }}
          onCancel={() => setConfirmPause(false)} />
      )}
    </>
  )
}
