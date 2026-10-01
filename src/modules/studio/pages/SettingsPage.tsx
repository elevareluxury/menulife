import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, Trash2 } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useStudio } from '../StudioContext'
import { deleteMyAccount, exportMyData, friendlyError, updateProfile } from '../lib/studioApi'
import { publicBaseUrl } from '../lib/preview'
import { normalizeUsername, USERNAME_MESSAGES, useUsernameCheck } from '../lib/useUsernameCheck'
import { Button, ConfirmDialog, PageHeader, SelectField, TextField } from '../components/ui'
import { ProfileSaveIndicator, StatusPill } from '../components/shared'

export function SettingsPage() {
  const { profile, patchProfile, replaceProfile, userId, business } = useStudio()
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

      <PrivacySection userId={userId} hasBusiness={!!business} />

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

// ── Privacidad ──────────────────────────────────────────────────────────────

function PrivacySection({ userId, hasBusiness }: { userId: string; hasBusiness: boolean }) {
  const navigate = useNavigate()
  const { user, signOut } = useAuthStore()
  const [exporting, setExporting] = useState(false)
  const [open, setOpen] = useState(false)
  const [word, setWord] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function download() {
    setExporting(true); setMessage(null)
    try {
      const blob = await exportMyData(userId, user?.email)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mycen-mis-datos-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      setMessage('No pudimos preparar la descarga. Intentá de nuevo.')
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
    setMessage(result === 'has_business'
      ? 'Tu cuenta tiene un negocio en Mycen Business. Para darla de baja escribinos a soporte, así cuidamos los datos de tus clientes y ventas.'
      : 'No pudimos eliminar la cuenta. Intentá de nuevo en unos minutos.')
  }

  return (
    <section className="st-card st-stack">
      <h2 className="st-card-title" style={{ margin: 0 }}>Privacidad</h2>
      <div className="st-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: 0, fontWeight: 500 }}>Descargar mis datos</p>
          <p className="st-help" style={{ margin: '2px 0 0' }}>Tu perfil, módulos y datos de Life OS en un archivo JSON.</p>
        </div>
        <Button onClick={download} loading={exporting}><Download size={15} aria-hidden="true" /> Descargar</Button>
      </div>
      <div className="st-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', borderTop: '1px solid var(--st-border)', paddingTop: 14 }}>
        <div>
          <p style={{ margin: 0, fontWeight: 500 }}>Eliminar mi cuenta</p>
          <p className="st-help" style={{ margin: '2px 0 0' }}>
            {hasBusiness
              ? 'Como tenés un negocio en Mycen Business, la baja se gestiona con soporte.'
              : 'Se borran tu perfil, tus módulos, tus imágenes y tus datos de Life OS. No se puede deshacer.'}
          </p>
        </div>
        <Button variant="danger" onClick={() => { setOpen(true); setWord('') }}><Trash2 size={15} aria-hidden="true" /> Eliminar</Button>
      </div>
      {message && <p className="st-error" role="alert" style={{ margin: 0 }}>{message}</p>}

      {open && (
        <div className="st-dialog-wrap" onMouseDown={e => { if (e.target === e.currentTarget && !deleting) setOpen(false) }}>
          <div className="st-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-title">
            <h2 id="delete-title">¿Eliminar tu cuenta para siempre?</h2>
            <p>Se borra todo y no se puede recuperar. Si querés, antes descargá tus datos. Para confirmar escribí <strong>ELIMINAR</strong>.</p>
            <TextField label="Confirmación" value={word} onChange={setWord} autoFocus />
            <div className="st-row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={deleting}>Cancelar</Button>
              <Button variant="danger" disabled={word.trim().toUpperCase() !== 'ELIMINAR'} loading={deleting} onClick={remove}>
                Eliminar mi cuenta
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
