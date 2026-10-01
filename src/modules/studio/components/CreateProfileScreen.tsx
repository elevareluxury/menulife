import { useState } from 'react'
import { createProfile, friendlyError } from '../lib/studioApi'
import type { StudioProfile } from '../lib/studioTypes'
import { normalizeUsername, USERNAME_MESSAGES, useUsernameCheck } from '../lib/useUsernameCheck'
import { publicBaseUrl } from '../lib/preview'
import { Button, TextField } from './ui'

/** Primer paso para quien todavía no tiene identidad: nombre + username. */
export function CreateProfileScreen({ userId, onCreated }: { userId: string; onCreated: (p: StudioProfile) => void }) {
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [touchedUsername, setTouchedUsername] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const effectiveUsername = touchedUsername ? username : normalizeUsername(name)
  const status = useUsernameCheck(effectiveUsername)
  const canCreate = name.trim().length >= 2 && status === 'available' && !saving

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!canCreate) return
    setSaving(true); setError(null)
    try {
      onCreated(await createProfile(userId, effectiveUsername, name))
    } catch (err) {
      setError(friendlyError(err))
      setSaving(false)
    }
  }

  const host = publicBaseUrl().replace(/^https?:\/\//, '')

  return (
    <div className="st-center">
      <form className="st-card" style={{ width: '100%', maxWidth: 440, padding: 28 }} onSubmit={submit} noValidate>
        <p className="st-label" style={{ margin: 0 }}>mycen. Studio</p>
        <h1 className="st-title" style={{ margin: '8px 0 6px' }}>Creá tu identidad</h1>
        <p className="st-subtitle" style={{ marginBottom: 22 }}>Tu nombre y la dirección donde te van a encontrar. Lo podés cambiar después.</p>
        <div className="st-stack">
          <TextField label="Tu nombre o el de tu marca" value={name} onChange={setName} required maxLength={80} autoFocus />
          <TextField
            label="Username" required
            value={effectiveUsername}
            onChange={v => { setTouchedUsername(true); setUsername(normalizeUsername(v)) }}
            help={<>{host}/<strong>{effectiveUsername || 'tu-nombre'}</strong> · {USERNAME_MESSAGES[status]}</>}
            error={['taken', 'reserved', 'invalid'].includes(status) && effectiveUsername ? USERNAME_MESSAGES[status] : null}
          />
          {error && <p className="st-error" role="alert">{error}</p>}
          <Button type="submit" variant="primary" block disabled={!canCreate} loading={saving}>Crear mi identidad</Button>
          <p className="st-help" style={{ textAlign: 'center' }}>Queda como borrador hasta que la publiques.</p>
        </div>
      </form>
    </div>
  )
}
