import { useEffect, useId, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, Trash2 } from 'lucide-react'
import { useStudioT } from '@/i18n/app/studio'
import { useAppLang } from '@/i18n/app/store'
import { langLocale } from '@/i18n/app/languages'
import { Button, ConfirmDialog, PageHeader } from '../components/ui'
import { useStudio } from '../StudioContext'
import { deleteSubscriber, loadSubscribers, type ProfileSubscriber } from '../lib/studioApi'
import { subscribersCsv } from '../lib/subscribersCsv'

const PAGE = 200

/**
 * Lista del módulo "Suscribirse" (módulos de bio, V1.1): quién dejó su email, buscar, borrar y exportar CSV.
 * Mycen no le manda nada a la lista: el dueño decide cómo usarla (y lo dice la política de privacidad).
 */
export function SubscribersPage() {
  const t = useStudioT().subscribers
  const { spaces, handle } = useStudio()
  const locale = langLocale(useAppLang(s => s.lang))
  const searchId = useId()
  const [items, setItems] = useState<ProfileSubscriber[] | null | 'error'>(null)
  const [query, setQuery] = useState('')
  const [shown, setShown] = useState(PAGE)
  const [confirm, setConfirm] = useState<ProfileSubscriber | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [status, setStatus] = useState('')

  useEffect(() => {
    let alive = true
    loadSubscribers().then(s => { if (alive) setItems(s) }, () => { if (alive) setItems('error') })
    return () => { alive = false }
  }, [])

  const list = useMemo(() => (Array.isArray(items) ? items : []), [items])
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? list.filter(s => s.email.includes(q) || (s.name ?? '').toLowerCase().includes(q)) : list
  }, [list, query])
  const spaceName = (id: string) => spaces.length > 1 ? spaces.find(s => s.id === id)?.display_name : undefined

  function exportCsv() {
    const blob = new Blob([subscribersCsv(list)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mycen-${handle.replace('/', '-')}-subscribers-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  async function remove(s: ProfileSubscriber) {
    setDeleting(true)
    try {
      await deleteSubscriber(s.id)
      setItems(prev => Array.isArray(prev) ? prev.filter(x => x.id !== s.id) : prev)
      setStatus(t.deleted)
    } catch {
      setStatus(t.loadError)
    } finally {
      setDeleting(false)
      setConfirm(null)
    }
  }

  return (
    <>
      <PageHeader title={t.title} subtitle={t.subtitle}
        actions={list.length > 0 ? (
          <Button size="sm" variant="secondary" onClick={exportCsv}><Download size={15} aria-hidden="true" /> {t.export}</Button>
        ) : undefined} />
      <p className="st-sr-only" role="status">{status}</p>

      {items === null && <p className="st-help">…</p>}
      {items === 'error' && <p className="st-error" role="alert">{t.loadError}</p>}

      {Array.isArray(items) && !list.length && (
        <section className="st-card">
          <p style={{ marginTop: 0 }}><strong>{t.empty}</strong></p>
          <p className="st-help">{t.emptyCta}</p>
          <Link to="/studio/modules" className="st-btn st-btn-secondary st-btn-sm">{t.goModules}</Link>
        </section>
      )}

      {list.length > 0 && (
        <section className="st-card" aria-label={t.title}>
          <div className="st-subs-tools">
            <label className="st-sr-only" htmlFor={searchId}>{t.search}</label>
            <input id={searchId} className="st-input" type="search" placeholder={t.search} value={query}
              onChange={e => { setQuery(e.target.value); setShown(PAGE) }} />
            <p className="st-help" style={{ margin: 0 }}>{t.total.replace('{n}', list.length.toLocaleString(locale))}</p>
          </div>
          <p className="st-help">{t.exportNote}</p>
          {!filtered.length && <p className="st-help">{t.noResults}</p>}
          <ul className="st-subs">
            {filtered.slice(0, shown).map(s => {
              const space = spaceName(s.profile_id)
              return (
                <li key={s.id} className="st-sub">
                  <span className="st-sub-main">
                    <span className="st-sub-email" dir="ltr">{s.email}</span>
                    <span className="st-help">
                      {s.name && <span dir="auto">{s.name} · </span>}
                      <time dateTime={s.created_at}>{new Date(s.created_at).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}</time>
                      {space && <> · {space}</>}
                    </span>
                  </span>
                  <Button size="sm" variant="ghost" aria-label={t.deleteLabel.replace('{email}', s.email)} onClick={() => setConfirm(s)}>
                    <Trash2 size={15} aria-hidden="true" />
                  </Button>
                </li>
              )
            })}
          </ul>
          {filtered.length > shown && (
            <Button size="sm" variant="ghost" onClick={() => setShown(n => n + PAGE)}>{t.showMore}</Button>
          )}
        </section>
      )}

      {confirm && (
        <ConfirmDialog title={t.deleteTitle} message={t.deleteText.replace('{email}', confirm.email)} confirmLabel={t.delete} danger
          loading={deleting} onConfirm={() => { void remove(confirm) }} onCancel={() => setConfirm(null)} />
      )}
    </>
  )
}
