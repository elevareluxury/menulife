import { useCallback, useId } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import {
  checkSupportMethod, isCopyKind, SUPPORT_ALIAS_MAX, SUPPORT_BRAND, SUPPORT_KINDS, SUPPORT_LABEL_MAX, SUPPORT_MAX_METHODS,
  SUPPORT_PIX_MAX, type SupportKind,
} from '@/modules/profile/lib/support'
import {
  checkListenLink, detectListenPlatform, LISTEN_MAX_LINKS, LISTEN_PLATFORM_NAME,
} from '@/modules/profile/lib/listenOn'
import { duplicateListenRows, listenErrorText, supportErrorText, type ListenInput, type SupportInput } from '../lib/supportListenErrors'
import { useStudioT } from '@/i18n/app/studio'
import { Button, SelectField, TextField } from './ui'
import type { ExtraEditorProps } from './moduleExtraEditors'
import { useAutoCover } from '../lib/autoCover'
import { coverRequestFor } from '@/modules/profile/lib/mediaCover'

// Editores propios de "Apoyame" (support) y "Escuchá en" (listen_on), V1.1. Se registran en `lib/moduleCatalog.ts`.


/** Ejemplo de link por plataforma (placeholder del campo) */
const SUPPORT_PLACEHOLDER: Record<SupportKind, string> = {
  mercadopago: 'https://link.mercadopago.com.ar/…', paypal: 'https://paypal.me/…', kofi: 'https://ko-fi.com/…',
  buymeacoffee: 'https://buymeacoffee.com/…', pix: '', alias: '', link: 'https://…',
}

function RowHead({ id, title, i, total, up, down, remove, onMove, onRemove }: {
  id: string; title: string; i: number; total: number; up: string; down: string; remove: string
  onMove: (i: number, d: -1 | 1) => void; onRemove: (i: number) => void
}) {
  return (
    <div className="st-row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
      <strong id={id} style={{ fontSize: 14 }}>{title}</strong>
      <div className="st-row" style={{ gap: 0 }}>
        <button type="button" className="st-icon-btn" disabled={i === 0} onClick={() => onMove(i, -1)} aria-label={up}><ArrowUp size={15} /></button>
        <button type="button" className="st-icon-btn" disabled={i === total - 1} onClick={() => onMove(i, 1)} aria-label={down}><ArrowDown size={15} /></button>
        <button type="button" className="st-icon-btn" onClick={() => onRemove(i)} aria-label={remove}><Trash2 size={15} /></button>
      </div>
    </div>
  )
}

function useListOps<T>(items: T[], onChange: (v: T[]) => void) {
  return {
    update: (i: number, patch: Partial<T>) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x))),
    move: (i: number, d: -1 | 1) => {
      const t = i + d
      if (t < 0 || t >= items.length) return
      const next = [...items]
      ;[next[i], next[t]] = [next[t], next[i]]
      onChange(next)
    },
    remove: (i: number) => onChange(items.filter((_, j) => j !== i)),
  }
}

// ── Apoyame ──

export function SupportMethodsEditor({ value: items, onChange }: ExtraEditorProps<SupportInput[]>) {
  const t = useStudioT()
  const s = t.support
  const ops = useListOps(items, onChange)
  const uid = useId()
  return (
    <div className="st-stack" style={{ gap: 10 }}>
      <span className="st-label">{s.methods(items.length)}</span>
      {items.map((item, i) => {
        const err = item.value.trim() || item.label.trim() ? checkSupportMethod(item) : null
        const copy = isCopyKind(item.kind)
        return (
          <div key={i} role="group" aria-labelledby={`${uid}-${i}`} className="st-card" style={{ background: 'var(--st-bg)', margin: 0 }}>
            <RowHead id={`${uid}-${i}`} title={s.methodN(i + 1)} i={i} total={items.length} up={s.up(i + 1)} down={s.down(i + 1)} remove={s.remove(i + 1)}
              onMove={ops.move} onRemove={ops.remove} />
            <div className="st-stack" style={{ gap: 12 }}>
              <SelectField label={s.kind} required value={item.kind}
                options={SUPPORT_KINDS.map(k => ({ value: k, label: s.kinds[k] }))}
                onChange={v => ops.update(i, { kind: v as SupportKind })} />
              <TextField label={item.kind === 'alias' ? s.alias : item.kind === 'pix' ? s.pix : s.link}
                type={copy ? 'text' : 'url'} value={item.value} placeholder={SUPPORT_PLACEHOLDER[item.kind] || undefined}
                maxLength={item.kind === 'alias' ? SUPPORT_ALIAS_MAX : item.kind === 'pix' ? SUPPORT_PIX_MAX : undefined}
                error={err ? supportErrorText(t, err, item.kind) : null}
                onChange={v => ops.update(i, { value: v })} />
              <TextField label={s.label} value={item.label} maxLength={SUPPORT_LABEL_MAX}
                placeholder={SUPPORT_BRAND[item.kind] ?? undefined} onChange={v => ops.update(i, { label: v })} />
            </div>
          </div>
        )
      })}
      {items.length < SUPPORT_MAX_METHODS && (
        <Button size="sm" onClick={() => onChange([...items, { kind: 'mercadopago', value: '', label: '' }])}>
          <Plus size={15} aria-hidden="true" /> {s.add}
        </Button>
      )}
      <p className="st-help" style={{ margin: 0 }}>{s.note}</p>
    </div>
  )
}

// ── Escuchá en ──

export function ListenLinksEditor({ value: items, onChange, userId, fields, setField }: ExtraEditorProps<ListenInput[]>) {
  const t = useStudioT()
  const l = t.listenOn
  const ops = useListOps(items, onChange)
  const dup = duplicateListenRows(items)
  const uid = useId()
  // Sin portada, se usa la del primer link de Spotify, YouTube o SoundCloud (lib/autoCover.ts)
  const coverFrom = items.map(i => i.url.trim()).find(u => u && coverRequestFor(u)) ?? null
  const setCover = useCallback((c: string) => setField?.('cover_url', c), [setField])
  const auto = useAutoCover({ url: setField ? coverFrom : null, cover: fields?.cover_url ?? '', setCover, userId })
  return (
    <div className="st-stack" style={{ gap: 10 }}>
      {auto.state !== 'idle' && (
        <p className="st-help" role="status" style={{ margin: 0 }}>
          {auto.state === 'loading' ? t.media.coverLoading : auto.state === 'auto' ? t.media.coverAuto.replace('{provider}', auto.provider) : t.media.coverNone}
        </p>
      )}
      <span className="st-label">{l.links(items.length)}</span>
      <p className="st-help" style={{ margin: 0 }}>{l.help}</p>
      {items.map((item, i) => {
        const err = item.url.trim() ? (checkListenLink(item.url) ?? (dup.has(i) ? 'duplicate' : null)) : null
        const platform = err ? null : detectListenPlatform(item.url)
        return (
          <div key={i} role="group" aria-labelledby={`${uid}-${i}`} className="st-card" style={{ background: 'var(--st-bg)', margin: 0 }}>
            <RowHead id={`${uid}-${i}`} title={l.linkN(i + 1)} i={i} total={items.length} up={l.up(i + 1)} down={l.down(i + 1)} remove={l.remove(i + 1)}
              onMove={ops.move} onRemove={ops.remove} />
            <div>
              <TextField label={l.url} type="url" value={item.url} placeholder="https://…"
                error={err ? listenErrorText(t, err, item.url) : null}
                help={platform ? <span role="status">{l.detected.replace('{platform}', LISTEN_PLATFORM_NAME[platform])}</span> : undefined}
                onChange={v => ops.update(i, { url: v })} />
            </div>
          </div>
        )
      })}
      {items.length < LISTEN_MAX_LINKS && (
        <Button size="sm" onClick={() => onChange([...items, { url: '' }])}><Plus size={15} aria-hidden="true" /> {l.add}</Button>
      )}
      <p className="st-help" style={{ margin: 0 }}>{l.note}</p>
    </div>
  )
}
