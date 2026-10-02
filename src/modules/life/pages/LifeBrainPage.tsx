import { useState, useMemo, useRef, type KeyboardEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Zap, Lightbulb, StickyNote, CheckSquare, Check, Pencil, Archive, ArchiveRestore, Trash2, Search, X,
  AlertTriangle, ArrowLeft,
} from 'lucide-react'
import { useLifeT } from '@/i18n/app/life'
import { useAppLang } from '@/i18n/app/store'
import { langLocale } from '@/i18n/app/languages'
import {
  LifeScreenContainer, LifeCard, LifeSectionHeader, LifeEmptyState,
  colors, font, radius, stagger, fadeInUp,
} from '../design-system'
import { useBrain, type BrainItem, type BrainItemType } from '../hooks/useBrain'
import { BrainItemSheet } from '../components/BrainItemSheet'
import { ActionMenu } from '../components/ActionMenu'
import { deleteWithUndo } from '../lib/undo'
import { dayKey, useToday } from '../hooks/useToday'
import { shiftDate } from '../hooks/useHabits'

const TYPE_META = {
  idea: { icon: Lightbulb,   color: '#8B5CF6' },
  note: { icon: StickyNote,  color: '#3B82F6' },
  task: { icon: CheckSquare, color: '#22C55E' },
} as const

const FILTERS = ['todo', 'idea', 'note', 'task'] as const
type Filter = typeof FILTERS[number]

// ── Skeleton ─────────────────────────────────────────────────────────────────
function BrainSkeleton() {
  return (
    <motion.div animate={{ opacity: [0.3, 0.55, 0.3] }} transition={{ duration: 1.8, repeat: Infinity }}>
      {[56, 56, 56, 56].map((h, i) => (
        <div key={i} style={{
          height: h, background: colors.surface.base, borderRadius: radius.xl,
          marginBottom: '8px', border: `1px solid ${colors.border.subtle}`,
        }} />
      ))}
    </motion.div>
  )
}

// ── Tarjeta ───────────────────────────────────────────────────────────────────
function BrainCard({ item, archived, onToggle, onEdit, onArchive, onDelete }: {
  item: BrainItem
  archived: boolean
  onToggle: () => void
  onEdit: () => void
  onArchive: () => void
  onDelete: () => void
}) {
  const t = useLifeT()
  const [expanded, setExpanded] = useState(false)
  const meta = TYPE_META[item.type]
  const Icon = meta.icon
  const isTask = item.type === 'task'
  const long = (item.content?.length ?? 0) > 90 || (item.content ?? '').includes('\n')

  return (
    <LifeCard style={{ padding: '10px 12px', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        {isTask ? (
          <button type="button" role="checkbox" aria-checked={item.is_completed}
            aria-label={item.is_completed ? t.brain.uncomplete(item.title) : t.brain.complete(item.title)}
            onClick={onToggle}
            style={{ width: 40, height: 40, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
            <span aria-hidden="true" style={{
              width: 22, height: 22, borderRadius: '50%',
              border: `2px solid ${item.is_completed ? meta.color : colors.border.medium}`,
              background: item.is_completed ? meta.color : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.18s',
            }}>
              {item.is_completed && <Check size={12} strokeWidth={3} style={{ color: '#fff' }} />}
            </span>
          </button>
        ) : (
          <span aria-label={t.brain.types[item.type]} style={{
            width: 32, height: 32, margin: 4, borderRadius: radius.sm, flexShrink: 0,
            background: `${meta.color}14`, border: `1px solid ${meta.color}25`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={15} style={{ color: meta.color }} strokeWidth={2} aria-hidden="true" />
          </span>
        )}

        <div style={{ flex: 1, minWidth: 0, paddingTop: 9 }}>
          <p style={{
            fontFamily: font, fontSize: '14px', fontWeight: 600,
            color: item.is_completed ? colors.text.tertiary : colors.text.primary,
            margin: '0 0 2px', textDecoration: item.is_completed ? 'line-through' : 'none',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: expanded ? 'normal' : 'nowrap', overflowWrap: 'anywhere',
          }}>
            {item.title}
          </p>
          {item.content && (
            <p style={{
              fontFamily: font, fontSize: '13px', color: colors.text.secondary, margin: 0, lineHeight: 1.5,
              ...(expanded
                ? { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }
                : { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }),
            }}>
              {item.content}
            </p>
          )}
          {long && (
            <button type="button" onClick={() => setExpanded(v => !v)} aria-expanded={expanded}
              style={{ marginTop: 4, padding: '4px 0', minHeight: 28, background: 'none', border: 'none', cursor: 'pointer', fontFamily: font, fontSize: 12, fontWeight: 700, color: meta.color }}>
              {expanded ? t.brain.readLess : t.brain.readMore}
            </button>
          )}
        </div>

        <ActionMenu label={t.brain.options} actions={archived ? [
          { icon: ArchiveRestore, label: t.brain.unarchive, onSelect: onArchive },
          { icon: Trash2, label: t.common.delete, onSelect: onDelete, danger: true },
        ] : [
          { icon: Pencil, label: t.common.edit, onSelect: onEdit },
          { icon: Archive, label: t.brain.archive, onSelect: onArchive },
          { icon: Trash2, label: t.common.delete, onSelect: onDelete, danger: true },
        ]} />
      </div>
    </LifeCard>
  )
}

// ── Captura rápida ────────────────────────────────────────────────────────────
function QuickCapture({ onCapture }: { onCapture: (type: BrainItemType, title: string) => Promise<void> }) {
  const t = useLifeT()
  const [title, setTitle]   = useState('')
  const [type, setType]     = useState<BrainItemType>('idea')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const submit = async () => {
    if (!title.trim() || saving) return
    setSaving(true)
    try {
      await onCapture(type, title.trim())
      setTitle('')
      inputRef.current?.focus()
    } catch {
      toast.error(t.common.saveError)
    } finally { setSaving(false) }
  }

  return (
    <LifeCard style={{ marginBottom: '12px', padding: '14px' }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
        <input ref={inputRef} value={title} onChange={e => setTitle(e.target.value)}
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') void submit() }}
          placeholder={t.brain.capturePlaceholder} aria-label={t.brain.capturePlaceholder} maxLength={100}
          style={{
            flex: 1, minWidth: 0, padding: '10px 12px', borderRadius: radius.sm,
            background: colors.surface.high, border: `1px solid ${colors.border.subtle}`,
            color: colors.text.primary, fontFamily: font, fontSize: '16px', outline: 'none',
          }} />
        <button type="button" onClick={() => void submit()} disabled={!title.trim() || saving} aria-label={t.brain.capture}
          style={{
            width: 44, height: 44, borderRadius: radius.sm, flexShrink: 0,
            background: title.trim() ? colors.area.brain : colors.surface.high, border: 'none',
            cursor: title.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: !title.trim() ? 0.4 : 1,
          }}>
          <Check size={16} strokeWidth={3} style={{ color: title.trim() ? '#fff' : colors.text.tertiary }} aria-hidden="true" />
        </button>
      </div>
      <div role="radiogroup" aria-label={t.brain.captureType} style={{ display: 'flex', gap: '6px' }}>
        {(Object.keys(TYPE_META) as BrainItemType[]).map(k => {
          const meta = TYPE_META[k]
          return (
            <button key={k} type="button" role="radio" aria-checked={type === k} onClick={() => setType(k)}
              style={{
                minHeight: 32, padding: '4px 12px', borderRadius: radius.full,
                background: type === k ? `${meta.color}18` : 'transparent',
                border: `1px solid ${type === k ? meta.color + '40' : colors.border.subtle}`,
                color: type === k ? meta.color : colors.text.secondary,
                fontFamily: font, fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '4px',
              }}>
              <meta.icon size={11} strokeWidth={2.5} aria-hidden="true" />
              {t.brain.types[k]}
            </button>
          )
        })}
      </div>
    </LifeCard>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────
export function LifeBrainPage() {
  const tNav = useLifeT().nav
  const t = useLifeT()
  const locale = langLocale(useAppLang(s => s.lang))
  const [filter, setFilter]         = useState<Filter>('todo')
  const [archived, setArchivedView] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQ, setSearchQ]       = useState('')
  const [editItem, setEditItem]     = useState<BrainItem | null>(null)
  const [sheetOpen, setSheetOpen]   = useState(false)

  const {
    items, loading, error, hasMore, reload, loadMore,
    ideasCount, notesCount, tasksCount, totalCount,
    createItem, updateItem, deleteItem, setArchived, hideLocally, toggleComplete,
  } = useBrain({ archived, query: searchQ, type: filter === 'todo' ? null : filter })

  const today = useToday()
  const grouped = useMemo(() => {
    const yesterday = shiftDate(today, -1)
    const map = new Map<string, BrainItem[]>()
    for (const item of items) {
      const d = new Date(item.created_at)
      const k = dayKey(d)
      const label = k === today ? t.brain.today
        : k === yesterday ? t.brain.yesterday
          : d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })
      if (!map.has(label)) map.set(label, [])
      map.get(label)!.push(item)
    }
    return [...map.entries()]
  }, [items, t, locale, today])

  const remove = (item: BrainItem) => {
    hideLocally(item.id)
    deleteWithUndo({ message: t.undo.deleted(item.title), commit: () => deleteItem(item.id), restore: () => void reload() })
  }
  const toggleArchive = (item: BrainItem) => {
    hideLocally(item.id)
    if (archived) {
      setArchived(item.id, false).catch(() => { void reload(); toast.error(t.common.saveError) })
      return
    }
    // Archivar también se puede deshacer
    deleteWithUndo({ message: t.undo.archived(item.title), commit: () => setArchived(item.id, true), restore: () => void reload() })
  }

  const q = searchQ.trim()
  const emptyHint = archived
    ? { title: t.brain.archivedTitle, text: t.brain.archivedEmpty }
    : q.length >= 2
      ? { title: t.brain.noResults(q), text: '' }
      : t.brain.empty[filter]

  return (
    <LifeScreenContainer>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingTop: '24px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          {archived ? (
            <button type="button" onClick={() => setArchivedView(false)} aria-label={t.brain.hideArchived}
              style={{ width: 40, height: 40, borderRadius: radius.full, border: `1px solid ${colors.border.subtle}`, background: 'transparent', color: colors.text.secondary, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <ArrowLeft size={18} aria-hidden="true" className="flip-rtl" />
            </button>
          ) : (
            <div style={{ width: 40, height: 40, borderRadius: '14px', background: `${colors.area.brain}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Zap size={20} style={{ color: colors.area.brain }} strokeWidth={2} aria-hidden="true" />
            </div>
          )}
          <h1 style={{ fontFamily: font, fontSize: '26px', fontWeight: 800, color: colors.text.primary, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {archived ? t.brain.archivedTitle : tNav.brain}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {!archived && (
            <button type="button" onClick={() => setArchivedView(true)} aria-label={t.brain.showArchived} title={t.brain.showArchived}
              style={{ width: 40, height: 40, borderRadius: radius.full, background: 'transparent', border: `1px solid ${colors.border.subtle}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.text.secondary }}>
              <Archive size={16} aria-hidden="true" />
            </button>
          )}
          <button type="button" onClick={() => { setSearchOpen(v => !v); if (searchOpen) setSearchQ('') }}
            aria-label={searchOpen ? t.brain.closeSearch : t.brain.search} aria-expanded={searchOpen}
            style={{
              width: 40, height: 40, borderRadius: radius.full,
              background: searchOpen ? colors.area.brain + '18' : 'transparent',
              border: `1px solid ${searchOpen ? colors.area.brain + '40' : colors.border.subtle}`,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: searchOpen ? colors.area.brain : colors.text.secondary,
            }}>
            {searchOpen ? <X size={16} strokeWidth={2.5} aria-hidden="true" /> : <Search size={16} strokeWidth={2} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {!archived && totalCount > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '12px' }}>
          {([['idea', ideasCount], ['note', notesCount], ['task', tasksCount]] as const).map(([k, value]) => (
            <LifeCard key={k} style={{ textAlign: 'center', padding: '10px 6px' }}>
              <p style={{ fontFamily: font, fontSize: '20px', fontWeight: 800, color: TYPE_META[k].color, margin: '0 0 1px' }}>{value}</p>
              <p style={{ fontFamily: font, fontSize: '10px', fontWeight: 600, color: colors.text.tertiary, margin: 0, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                {t.brain.counts[k]}
              </p>
            </LifeCard>
          ))}
        </div>
      )}

      {!archived && <QuickCapture onCapture={(type, title) => createItem({ type, title })} />}

      <AnimatePresence>
        {searchOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden', marginBottom: '10px' }}>
            <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
              placeholder={t.brain.searchPlaceholder} aria-label={t.brain.searchPlaceholder} type="search"
                  autoFocus
              style={{
                width: '100%', padding: '10px 14px', boxSizing: 'border-box', borderRadius: radius.md,
                background: colors.surface.high, border: `1px solid ${colors.border.medium}`,
                color: colors.text.primary, fontFamily: font, fontSize: '16px', outline: 'none',
              }} />
          </motion.div>
        )}
      </AnimatePresence>

      <div role="tablist" aria-label={tNav.brain} style={{ display: 'flex', gap: '6px', marginBottom: '14px', overflowX: 'auto', paddingBottom: '2px' }}>
        {FILTERS.map(f => (
          <button key={f} type="button" role="tab" aria-selected={filter === f} onClick={() => setFilter(f)}
            style={{
              minHeight: 36, padding: '6px 14px', borderRadius: radius.full, flexShrink: 0,
              background: filter === f ? colors.area.brain : colors.surface.high,
              border: `1px solid ${filter === f ? colors.area.brain : colors.border.subtle}`,
              color: filter === f ? '#fff' : colors.text.secondary,
              fontFamily: font, fontSize: '12px', fontWeight: 700, cursor: 'pointer',
            }}>
            {t.brain.filters[f]}
          </button>
        ))}
      </div>

      {loading ? <BrainSkeleton /> : error ? (
        <LifeCard>
          <LifeEmptyState icon={AlertTriangle} iconColor={colors.semantic.error}
            title={t.brain.errorTitle} subtitle={t.brain.loadError}
            action={{ label: t.brain.retry, onClick: () => void reload() }} />
        </LifeCard>
      ) : items.length === 0 ? (
        <LifeCard>
          <LifeEmptyState icon={archived ? Archive : Zap} iconColor={colors.area.brain} title={emptyHint.title} subtitle={emptyHint.text} />
        </LifeCard>
      ) : (
        <motion.div variants={stagger} initial="hidden" animate="visible" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {grouped.map(([label, groupItems]) => (
            <motion.div key={label} variants={fadeInUp}>
              <LifeSectionHeader title={label} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px', marginBottom: '6px' }}>
                {groupItems.map(item => (
                  <BrainCard key={item.id} item={item} archived={archived}
                    onToggle={() => { toggleComplete(item).catch(() => toast.error(t.common.saveError)) }}
                    onEdit={() => { setEditItem(item); setSheetOpen(true) }}
                    onArchive={() => toggleArchive(item)}
                    onDelete={() => remove(item)} />
                ))}
              </div>
            </motion.div>
          ))}
          {hasMore && (
            <button type="button" onClick={() => { loadMore().catch(() => toast.error(t.brain.loadError)) }}
              style={{ alignSelf: 'center', minHeight: 44, padding: '10px 20px', marginTop: 4, borderRadius: radius.full, border: `1px solid ${colors.border.medium}`, background: 'transparent', color: colors.text.primary, fontFamily: font, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {t.brain.loadMore}
            </button>
          )}
        </motion.div>
      )}

      <BrainItemSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        initial={editItem}
        onSave={async data => {
          if (editItem) await updateItem(editItem.id, data)
          else await createItem(data)
        }}
      />
    </LifeScreenContainer>
  )
}
