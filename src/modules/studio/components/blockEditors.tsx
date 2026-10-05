import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { BlockImage, CreditItem } from '@/modules/profile/lib/projectTypes'
import { parseVideoUrl } from '@/modules/profile/lib/video'
import { uploadMedia } from '../lib/studioApi'
import { Button, ImageField, TextField } from './ui'
import { useStudioT } from '@/i18n/app/studio'

// Editores de cada tipo de bloque de un proyecto. Se registran en `lib/blockCatalog.ts`.

export interface BlockEditorProps {
  data: Record<string, unknown>
  onChange: (data: Record<string, unknown>) => void
  userId: string
}

const str = (v: unknown) => (typeof v === 'string' ? v : '')

export function HeadingBlockEditor({ data, onChange }: BlockEditorProps) {
  const p = useStudioT().projects
  return <TextField label={p.headingText} value={str(data.text)} maxLength={160} onChange={text => onChange({ ...data, text })} />
}

export function ParagraphBlockEditor({ data, onChange }: BlockEditorProps) {
  const p = useStudioT().projects
  return <TextField label={p.paragraphText} multiline value={str(data.text)} maxLength={5000} onChange={text => onChange({ ...data, text })} />
}

export function ImageBlockEditor({ data, onChange, userId }: BlockEditorProps) {
  const p = useStudioT().projects
  const t = useStudioT().projects.blockTypes
  return (
    <div className="st-stack" style={{ gap: 12 }}>
      <ImageField label={t.image} shape="wide" value={str(data.url) || null}
        onUpload={async f => onChange({ ...data, url: await uploadMedia(userId, f) })}
        onClear={() => onChange({ ...data, url: '' })} />
      <TextField label={p.imageAlt} value={str(data.alt)} maxLength={200} onChange={alt => onChange({ ...data, alt })} />
      <TextField label={p.caption} value={str(data.caption)} maxLength={300} onChange={caption => onChange({ ...data, caption })} />
    </div>
  )
}

export function GalleryBlockEditor({ data, onChange, userId }: BlockEditorProps) {
  const p = useStudioT().projects
  const [adding, setAdding] = useState(false)
  const items = (Array.isArray(data.items) ? data.items : []) as BlockImage[]
  return (
    <div className="st-stack" style={{ gap: 8 }}>
      {items.map((item, i) => (
        <div key={item.url + i} className="st-row">
          <img className="st-image-thumb" src={item.url} alt="" />
          <span style={{ flex: 1 }} />
          <button type="button" className="st-icon-btn" aria-label={p.removePhoto(i + 1)}
            onClick={() => onChange({ ...data, items: items.filter((_, j) => j !== i) })}><Trash2 size={16} /></button>
        </div>
      ))}
      {adding
        ? <ImageField label={p.addPhoto} value={null}
            onUpload={async f => { onChange({ ...data, items: [...items, { url: await uploadMedia(userId, f) }] }); setAdding(false) }}
            onClear={() => setAdding(false)} />
        : items.length < 24 && <Button size="sm" onClick={() => setAdding(true)}><Plus size={15} aria-hidden="true" /> {p.addPhoto}</Button>}
    </div>
  )
}

export function VideoBlockEditor({ data, onChange }: BlockEditorProps) {
  const p = useStudioT().projects
  const url = str(data.url)
  return (
    <div className="st-stack" style={{ gap: 12 }}>
      <TextField label={p.videoUrl} type="url" value={url} placeholder="https://youtu.be/…" onChange={v => onChange({ ...data, url: v })}
        error={url.trim() && !parseVideoUrl(url) ? p.videoInvalid : null} />
      <TextField label={p.caption} value={str(data.caption)} maxLength={300} onChange={caption => onChange({ ...data, caption })} />
    </div>
  )
}

export function QuoteBlockEditor({ data, onChange }: BlockEditorProps) {
  const p = useStudioT().projects
  return (
    <div className="st-stack" style={{ gap: 12 }}>
      <TextField label={p.quoteText} multiline value={str(data.text)} maxLength={600} onChange={text => onChange({ ...data, text })} />
      <TextField label={p.quoteAuthor} value={str(data.author)} maxLength={120} onChange={author => onChange({ ...data, author })} />
    </div>
  )
}

export function DividerBlockEditor() {
  return <p className="st-help" style={{ margin: 0 }}>{useStudioT().projects.dividerHint}</p>
}

export function CreditsBlockEditor({ data, onChange }: BlockEditorProps) {
  const p = useStudioT().projects
  const items = (Array.isArray(data.items) ? data.items : []) as CreditItem[]
  const update = (i: number, patch: CreditItem) => onChange({ ...data, items: items.map((c, j) => (j === i ? { ...c, ...patch } : c)) })
  return (
    <div className="st-stack" style={{ gap: 10 }}>
      {items.map((c, i) => (
        <div key={i} className="st-row" style={{ alignItems: 'flex-end' }}>
          <div className="st-grid-2" style={{ flex: 1 }}>
            <TextField label={p.creditRole} value={str(c.role)} maxLength={80} onChange={role => update(i, { role })} />
            <TextField label={p.creditName} value={str(c.name)} maxLength={120} onChange={name => update(i, { name })} />
          </div>
          <button type="button" className="st-icon-btn" aria-label={p.removeCredit(i + 1)}
            onClick={() => onChange({ ...data, items: items.filter((_, j) => j !== i) })}><Trash2 size={16} /></button>
        </div>
      ))}
      {items.length < 40 && (
        <Button size="sm" onClick={() => onChange({ ...data, items: [...items, {}] })}><Plus size={15} aria-hidden="true" /> {p.addCredit}</Button>
      )}
    </div>
  )
}
