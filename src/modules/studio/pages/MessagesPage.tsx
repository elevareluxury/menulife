import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, MessageCircle, Trash2 } from 'lucide-react'
import { useStudioT } from '@/i18n/app/studio'
import { useAppLang } from '@/i18n/app/store'
import { langLocale } from '@/i18n/app/languages'
import { Button, ConfirmDialog, PageHeader } from '../components/ui'
import { useStudio } from '../StudioContext'
import { deleteMessage, loadMessages, setMessageRead, type ProfileMessage } from '../lib/studioApi'
import { notifyMessagesChanged, replyLinks } from '../lib/useUnreadMessages'

/**
 * Bandeja de mensajes del formulario de contacto (V1 · etapa 05). Los mensajes no se mandan por email: viven acá.
 * Abrir uno lo marca como leído; se responde por email o WhatsApp según el contacto que dejó la persona.
 */
export function MessagesPage() {
  const t = useStudioT().messages
  const { spaces } = useStudio()
  const locale = langLocale(useAppLang(s => s.lang))
  const [items, setItems] = useState<ProfileMessage[] | null | 'error'>(null)
  const [open, setOpen] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<ProfileMessage | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [status, setStatus] = useState('')

  useEffect(() => {
    let alive = true
    loadMessages().then(m => { if (alive) setItems(m) }, () => { if (alive) setItems('error') })
    return () => { alive = false }
  }, [])

  const list = Array.isArray(items) ? items : []
  const unread = list.filter(m => !m.read_at).length
  const spaceName = (id: string) => spaces.length > 1 ? spaces.find(s => s.id === id)?.display_name : undefined

  function update(id: string, patch: Partial<ProfileMessage>) {
    setItems(prev => Array.isArray(prev) ? prev.map(m => (m.id === id ? { ...m, ...patch } : m)) : prev)
  }

  async function toggle(m: ProfileMessage) {
    const next = open === m.id ? null : m.id
    setOpen(next)
    if (next && !m.read_at) {
      update(m.id, { read_at: new Date().toISOString() })
      try { await setMessageRead(m.id, true); notifyMessagesChanged() } catch { update(m.id, { read_at: null }) }
    }
  }

  async function markUnread(m: ProfileMessage) {
    update(m.id, { read_at: null })
    try { await setMessageRead(m.id, false); notifyMessagesChanged() } catch { update(m.id, { read_at: m.read_at }) }
  }

  async function remove(m: ProfileMessage) {
    setDeleting(true)
    try {
      await deleteMessage(m.id)
      setItems(prev => Array.isArray(prev) ? prev.filter(x => x.id !== m.id) : prev)
      setStatus(t.deleted)
      notifyMessagesChanged()
    } catch {
      setStatus(t.loadError)
    } finally {
      setDeleting(false)
      setConfirm(null)
    }
  }

  return (
    <>
      <PageHeader title={t.title} subtitle={t.subtitle} />
      <p className="st-sr-only" role="status">{status}</p>

      {items === null && <p className="st-help">…</p>}
      {items === 'error' && <p className="st-error" role="alert">{t.loadError}</p>}

      {Array.isArray(items) && !list.length && (
        <section className="st-card">
          <p style={{ marginTop: 0 }}><strong>{t.empty}</strong></p>
          <p className="st-help">{t.emptyCta}</p>
          <Link to="/studio/modules" className="st-btn st-btn-secondary st-btn-sm">{t.moduleSummary}</Link>
        </section>
      )}

      {list.length > 0 && (
        <section className="st-card" style={{ padding: 6 }} aria-label={t.title}>
          {unread > 0 && <p className="st-help" style={{ margin: '8px 10px' }}>{t.unread.replace('{n}', String(unread))}</p>}
          <ul className="st-messages">
            {list.map(m => {
              const isOpen = open === m.id
              const reply = replyLinks(m.contact)
              const space = spaceName(m.profile_id)
              return (
                <li key={m.id} className={`st-message${m.read_at ? '' : ' is-unread'}`}>
                  <button type="button" className="st-message-head" aria-expanded={isOpen} aria-controls={`msg-${m.id}`}
                    onClick={() => { void toggle(m) }}>
                    {!m.read_at && <span className="st-message-dot" aria-hidden="true" />}
                    <span className="st-message-meta">
                      <strong>{m.name}</strong>
                      {!m.read_at && <span className="st-badge">{t.newBadge}</span>}
                      {space && <span className="st-help"> · {space}</span>}
                      {!isOpen && <span className="st-message-snippet">{m.message}</span>}
                    </span>
                    <time className="st-help" dateTime={m.created_at}>
                      {new Date(m.created_at).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </time>
                  </button>
                  {isOpen && (
                    <div id={`msg-${m.id}`} className="st-message-body">
                      <p className="st-help" style={{ margin: 0 }}>{t.from}: <span dir="auto">{m.contact}</span></p>
                      <p style={{ whiteSpace: 'pre-line', overflowWrap: 'anywhere' }} dir="auto">{m.message}</p>
                      <div className="st-row" style={{ flexWrap: 'wrap' }}>
                        {reply.email && (
                          <a className="st-btn st-btn-primary st-btn-sm" href={reply.email}><Mail size={15} aria-hidden="true" /> {t.replyEmail}</a>
                        )}
                        {reply.whatsapp && (
                          <a className="st-btn st-btn-primary st-btn-sm" href={reply.whatsapp} target="_blank" rel="noopener noreferrer">
                            <MessageCircle size={15} aria-hidden="true" /> {t.replyWhatsApp}
                          </a>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => { void markUnread(m) }}>{t.markUnread}</Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirm(m)}><Trash2 size={15} aria-hidden="true" /> {t.delete}</Button>
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {confirm && (
        <ConfirmDialog title={t.deleteTitle} message={t.deleteText} confirmLabel={t.delete} danger loading={deleting}
          onConfirm={() => { void remove(confirm) }} onCancel={() => setConfirm(null)} />
      )}
    </>
  )
}
