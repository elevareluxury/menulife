import { useRef, useState } from 'react'
import { ArrowDown, ArrowUp, FileText, Plus, Trash2, Upload } from 'lucide-react'
import { Button, TextField } from './ui'
import { uploadPdf } from '../lib/studioApi'
import { useStudioT } from '@/i18n/app/studio'
import type { ExtraEditorProps } from './moduleExtraEditors'
import { newOptionId } from '../lib/pollOptions'

// Editores de los módulos de la entrega 2 (encuesta, descargables, galería de videos).


function move<T>(list: T[], i: number, d: -1 | 1): T[] {
  const t = i + d
  if (t < 0 || t >= list.length) return list
  const next = [...list]
  ;[next[i], next[t]] = [next[t], next[i]]
  return next
}

function RowTools({ i, n, label, onMove, onRemove, labels }: {
  i: number; n: number; label: string; onMove: (d: -1 | 1) => void; onRemove: () => void
  labels: { up: string; down: string; remove: string }
}) {
  return (
    <div className="st-row" style={{ justifyContent: 'space-between' }}>
      <strong style={{ fontSize: 14 }}>{label}</strong>
      <div className="st-row" style={{ gap: 0 }}>
        <button type="button" className="st-icon-btn" disabled={i === 0} onClick={() => onMove(-1)} aria-label={labels.up}><ArrowUp size={15} /></button>
        <button type="button" className="st-icon-btn" disabled={i === n - 1} onClick={() => onMove(1)} aria-label={labels.down}><ArrowDown size={15} /></button>
        <button type="button" className="st-icon-btn" onClick={onRemove} aria-label={labels.remove}><Trash2 size={15} /></button>
      </div>
    </div>
  )
}

// ── Encuesta ────────────────────────────────────────────────────────────────

export interface PollOptionInput { id: string; label: string }

export function PollOptionsEditor({ value, onChange }: ExtraEditorProps<PollOptionInput[]>) {
  const t = useStudioT()
  const v = t.v2
  return (
    <div className="st-stack" style={{ gap: 8 }}>
      <span className="st-label">{v.pollOptions}</span>
      {value.map((o, i) => (
        <div key={o.id} className="st-row" style={{ gap: 6, alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <TextField label={v.pollOption(i + 1)} value={o.label} maxLength={60}
              onChange={label => onChange(value.map(x => (x.id === o.id ? { ...x, label } : x)))} />
          </div>
          <button type="button" className="st-icon-btn" disabled={value.length <= 2} onClick={() => onChange(value.filter(x => x.id !== o.id))}
            aria-label={v.pollRemove(i + 1)}><Trash2 size={15} /></button>
        </div>
      ))}
      {value.length < 6 && (
        <Button size="sm" onClick={() => onChange([...value, { id: newOptionId(), label: '' }])}>
          <Plus size={15} aria-hidden="true" /> {v.pollAdd}
        </Button>
      )}
      <p className="st-help" style={{ margin: 0 }}>{v.pollHelp}</p>
    </div>
  )
}

// ── Descargables ────────────────────────────────────────────────────────────

export interface FileInput { title: string; url: string; size?: number }

export function FilesEditor({ value, onChange, userId }: ExtraEditorProps<FileInput[]>) {
  const t = useStudioT()
  const v = t.v2
  const e = t.editor
  const [busy, setBusy] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const target = useRef<number>(0)
  const update = (i: number, patch: Partial<FileInput>) => onChange(value.map((x, j) => (j === i ? { ...x, ...patch } : x)))

  async function pick(file: File | undefined) {
    if (!file) return
    const i = target.current
    setBusy(i); setError(null)
    try {
      const up = await uploadPdf(userId, file)
      const title = value[i]?.title || file.name.replace(/\.pdf$/i, '').slice(0, 80)
      update(i, { url: up.url, size: up.size, title })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <div className="st-stack" style={{ gap: 10 }}>
      <span className="st-label">{v.files}</span>
      <input ref={input} type="file" accept="application/pdf,.pdf" hidden onChange={ev => void pick(ev.target.files?.[0])} />
      {value.map((f, i) => (
        <div key={i} className="st-card" style={{ background: 'var(--st-bg)', margin: 0 }}>
          <RowTools i={i} n={value.length} label={v.fileN(i + 1)}
            onMove={d => onChange(move(value, i, d))} onRemove={() => onChange(value.filter((_, j) => j !== i))}
            labels={{ up: e.upLink(i + 1), down: e.downLink(i + 1), remove: v.fileRemove(i + 1) }} />
          <div className="st-stack" style={{ gap: 10, marginTop: 10 }}>
            <TextField label={v.fileTitle} value={f.title} maxLength={80} onChange={title => update(i, { title })} />
            <div className="st-row" style={{ gap: 8 }}>
              {f.url && <span className="st-help" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, margin: 0 }}><FileText size={15} aria-hidden="true" />PDF</span>}
              <Button size="sm" loading={busy === i} onClick={() => { target.current = i; input.current?.click() }}>
                <Upload size={15} aria-hidden="true" /> {busy === i ? v.fileUploading : f.url ? v.fileReplace : v.fileUpload}
              </Button>
            </div>
          </div>
        </div>
      ))}
      {value.length < 10 && (
        <Button size="sm" onClick={() => onChange([...value, { title: '', url: '' }])}><Plus size={15} aria-hidden="true" /> {v.fileAdd}</Button>
      )}
      <p className="st-help" style={{ margin: 0 }}>{v.fileHelp}</p>
      {error && <p className="st-error" role="alert" style={{ margin: 0 }}>{error}</p>}
    </div>
  )
}

// ── Galería de videos ───────────────────────────────────────────────────────

export interface VideoInput { url: string; title: string }

export function VideoListEditor({ value, onChange }: ExtraEditorProps<VideoInput[]>) {
  const t = useStudioT()
  const v = t.v2
  const e = t.editor
  const update = (i: number, patch: Partial<VideoInput>) => onChange(value.map((x, j) => (j === i ? { ...x, ...patch } : x)))
  return (
    <div className="st-stack" style={{ gap: 10 }}>
      <span className="st-label">{v.videos}</span>
      {value.map((x, i) => (
        <div key={i} className="st-card" style={{ background: 'var(--st-bg)', margin: 0 }}>
          <RowTools i={i} n={value.length} label={v.videoN(i + 1)}
            onMove={d => onChange(move(value, i, d))} onRemove={() => onChange(value.filter((_, j) => j !== i))}
            labels={{ up: e.upLink(i + 1), down: e.downLink(i + 1), remove: v.videoRemove(i + 1) }} />
          <div className="st-stack" style={{ gap: 10, marginTop: 10 }}>
            <TextField label="URL" type="url" value={x.url} placeholder="https://youtu.be/…" onChange={url => update(i, { url })} />
            <TextField label={v.videoTitle} value={x.title} maxLength={100} onChange={title => update(i, { title })} />
          </div>
        </div>
      ))}
      {value.length < 12 && (
        <Button size="sm" onClick={() => onChange([...value, { url: '', title: '' }])}><Plus size={15} aria-hidden="true" /> {v.videoAdd}</Button>
      )}
    </div>
  )
}
