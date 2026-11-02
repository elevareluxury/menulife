import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { useStudioT } from '@/i18n/app/studio'
import { EVENT_DESCRIPTION_MAX, EVENT_TAG_MAX, EVENT_TITLE_MAX, EVENT_VENUE_MAX, EVENTS_MAX, eventIsPast, localToday, type EventItem } from '@/modules/profile/lib/events'
import { newEvent } from '../lib/newEvent'
import { uploadMedia } from '../lib/studioApi'
import { Button, ImageField, TextField } from './ui'
import type { ExtraEditorProps } from './moduleExtraEditors'

/** Editor del módulo "Eventos": la lista de eventos con portada, datos, descripción y link de entradas */
export function EventsEditor({ value: items, onChange, userId }: ExtraEditorProps<EventItem[]>) {
  const t = useStudioT()
  const v = t.events
  const e = t.editor
  const today = localToday()
  const update = (i: number, patch: Partial<EventItem>) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x)))
  const move = (i: number, d: -1 | 1) => {
    const to = i + d
    if (to < 0 || to >= items.length) return
    const next = [...items]
    ;[next[i], next[to]] = [next[to], next[i]]
    onChange(next)
  }
  return (
    <div className="st-stack" style={{ gap: 10 }}>
      <span className="st-label">{v.list}</span>
      <p className="st-help" style={{ margin: 0 }}>{v.pastHelp}</p>
      {items.map((ev, i) => (
        <div key={ev.id} className="st-card" style={{ background: 'var(--st-bg)', margin: 0 }}>
          <div className="st-row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
            <strong style={{ fontSize: 14 }}>{v.item(i + 1)}</strong>
            <div className="st-row" style={{ gap: 0 }}>
              <button type="button" className="st-icon-btn" disabled={i === 0} onClick={() => move(i, -1)} aria-label={v.up(i + 1)}><ArrowUp size={15} /></button>
              <button type="button" className="st-icon-btn" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label={v.down(i + 1)}><ArrowDown size={15} /></button>
              <button type="button" className="st-icon-btn" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={v.remove(i + 1)}><Trash2 size={15} /></button>
            </div>
          </div>
          {eventIsPast(ev, today) && <p className="st-help" style={{ margin: '0 0 10px' }}>{v.past}</p>}
          <div className="st-stack" style={{ gap: 12 }}>
            <ImageField label={v.poster} shape="story" help={v.posterHelp} value={ev.image_url}
              onUpload={async f => update(i, { image_url: await uploadMedia(userId, f) })}
              onClear={() => update(i, { image_url: undefined })} />
            <TextField label={v.title} value={ev.title ?? ''} maxLength={EVENT_TITLE_MAX} onChange={x => update(i, { title: x })} />
            <div className="st-grid-2">
              <TextField label={v.date} type="date" value={ev.date ?? ''} onChange={x => update(i, { date: x || undefined })} />
              <TextField label={v.time} type="time" value={ev.time ?? ''} onChange={x => update(i, { time: x || undefined })} />
            </div>
            <TextField label={v.venue} value={ev.venue ?? ''} maxLength={EVENT_VENUE_MAX} onChange={x => update(i, { venue: x })} />
            <TextField label={v.tag} value={ev.tag ?? ''} maxLength={EVENT_TAG_MAX} placeholder={v.tagPlaceholder} onChange={x => update(i, { tag: x })} />
            <TextField label={v.description} multiline value={ev.description ?? ''} maxLength={EVENT_DESCRIPTION_MAX} onChange={x => update(i, { description: x })} />
            <TextField label={v.link} type="url" value={ev.url ?? ''} onChange={x => update(i, { url: x })} placeholder="https://…" />
            <details>
              <summary className="st-help" style={{ cursor: 'pointer' }}><span className="st-en-tag">EN</span>{e.enOptional}</summary>
              <div className="st-stack" style={{ gap: 10, marginTop: 10 }}>
                <TextField label={e.enTitle} value={ev.en?.title ?? ''} maxLength={EVENT_TITLE_MAX} onChange={x => update(i, { en: { ...ev.en, title: x } })} />
                <TextField label={e.enDescription} multiline value={ev.en?.description ?? ''} maxLength={EVENT_DESCRIPTION_MAX} onChange={x => update(i, { en: { ...ev.en, description: x } })} />
              </div>
            </details>
          </div>
        </div>
      ))}
      {items.length < EVENTS_MAX && (
        <Button size="sm" onClick={() => onChange([...items, newEvent()])}><Plus size={15} aria-hidden="true" /> {v.add}</Button>
      )}
    </div>
  )
}
