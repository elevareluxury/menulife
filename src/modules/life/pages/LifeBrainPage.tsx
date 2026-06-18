import { useState, useMemo, useRef, KeyboardEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Lightbulb, StickyNote, CheckSquare, Check, MoreHorizontal, Pencil, Archive, Trash2, Search, X, AlertTriangle } from 'lucide-react'
import {
  LifeScreenContainer, LifeCard, LifeSectionHeader, LifeEmptyState, LifeConfirmDialog,
  colors, font, radius, stagger, fadeInUp, scaleIn,
} from '../design-system'
import { useBrain, type BrainItem, type BrainItemType } from '../hooks/useBrain'
import { BrainItemSheet } from '../components/BrainItemSheet'

// ── Design constants ──────────────────────────────────────────────────────────
const TYPE_META = {
  idea: { icon: Lightbulb,   color: '#8B5CF6', label: 'Idea'  },
  note: { icon: StickyNote,  color: '#3B82F6', label: 'Nota'  },
  task: { icon: CheckSquare, color: '#22C55E', label: 'Tarea' },
} as const

const FILTERS = ['todo', 'idea', 'note', 'task'] as const
type Filter = typeof FILTERS[number]
const FILTER_LABELS: Record<Filter, string> = { todo: 'Todo', idea: 'Ideas', note: 'Notas', task: 'Tareas' }

// ── Skeleton ─────────────────────────────────────────────────────────────────
function BrainSkeleton() {
  return (
    <LifeScreenContainer>
      <motion.div animate={{ opacity: [0.3, 0.55, 0.3] }} transition={{ duration: 1.8, repeat: Infinity }}>
        {[56, 56, 56, 56, 56].map((h, i) => (
          <div key={i} style={{
            height: h, background: colors.surface.base, borderRadius: radius.xl,
            marginBottom: '8px', border: `1px solid ${colors.border.subtle}`,
          }} />
        ))}
      </motion.div>
    </LifeScreenContainer>
  )
}

// ── Item Card ─────────────────────────────────────────────────────────────────
function BrainCard({ item, onToggle, onEdit, onArchive, onDelete }: {
  item: BrainItem
  onToggle: () => void
  onEdit: () => void
  onArchive: () => void
  onDelete: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const meta = TYPE_META[item.type]
  const Icon = meta.icon
  const isTask = item.type === 'task'

  return (
    <LifeCard style={{ padding: '12px 14px', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        {/* Checkbox (tasks) or type icon (ideas/notes) */}
        {isTask ? (
          <motion.button
            key={`${item.id}-${item.is_completed}`}
            initial={{ scale: item.is_completed ? 0.7 : 1 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 480, damping: 22 }}
            whileTap={{ scale: 0.82 }}
            onClick={onToggle}
            style={{
              width: 22, height: 22, borderRadius: '50%', flexShrink: 0, marginTop: '1px',
              border: `2px solid ${item.is_completed ? meta.color : colors.border.medium}`,
              background: item.is_completed ? meta.color : 'transparent',
              cursor: 'pointer', transition: 'all 0.18s',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <AnimatePresence mode="wait">
              {item.is_completed && (
                <motion.div
                  key="chk"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 440, damping: 20 }}
                >
                  <Check size={12} strokeWidth={3} style={{ color: '#fff' }} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        ) : (
          <div
            onClick={onEdit}
            style={{
              width: 32, height: 32, borderRadius: radius.sm, flexShrink: 0,
              background: `${meta.color}14`, border: `1px solid ${meta.color}25`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <Icon size={15} style={{ color: meta.color }} strokeWidth={2} />
          </div>
        )}

        {/* Content */}
        <div
          style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
          onClick={isTask ? undefined : onEdit}
        >
          <p style={{
            fontFamily: font, fontSize: '14px', fontWeight: isTask ? 500 : 600,
            color: item.is_completed ? colors.text.quaternary : colors.text.primary,
            margin: '0 0 2px',
            textDecoration: item.is_completed ? 'line-through' : 'none',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {item.title}
          </p>
          {item.content && (
            <p style={{
              fontFamily: font, fontSize: '12px', fontWeight: 400,
              color: colors.text.tertiary, margin: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {item.content}
            </p>
          )}
        </div>

        {/* Context menu */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={e => { e.stopPropagation(); setMenuOpen(v => !v) }}
            style={{
              width: 26, height: 26, borderRadius: radius.full,
              background: 'transparent', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: colors.text.quaternary, transition: 'background 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = colors.border.subtle }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <MoreHorizontal size={14} strokeWidth={2} />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                variants={scaleIn} initial="hidden" animate="visible" exit="hidden"
                style={{
                  position: 'absolute', right: 0, top: '30px', zIndex: 10,
                  background: colors.surface.high,
                  border: `1px solid ${colors.border.medium}`,
                  borderRadius: radius.md,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  minWidth: 140, overflow: 'hidden',
                }}
                onMouseLeave={() => setMenuOpen(false)}
              >
                {[
                  { icon: Pencil,  label: 'Editar',    action: () => { setMenuOpen(false); onEdit() },    danger: false },
                  { icon: Archive, label: 'Archivar',   action: () => { setMenuOpen(false); onArchive() }, danger: false },
                  { icon: Trash2,  label: 'Eliminar',   action: () => { setMenuOpen(false); onDelete() },  danger: true  },
                ].map(({ icon: BtnIcon, label, action, danger }) => (
                  <button
                    key={label}
                    onClick={action}
                    style={{
                      width: '100%', padding: '10px 14px',
                      background: 'none', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '8px',
                      fontFamily: font, fontSize: '13px', fontWeight: 600,
                      color: danger ? colors.semantic.error : colors.text.secondary,
                      textAlign: 'left', transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = colors.border.subtle }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                  >
                    <BtnIcon size={13} />
                    {label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </LifeCard>
  )
}

// ── Quick Capture ─────────────────────────────────────────────────────────────
function QuickCapture({ onCapture }: { onCapture: (type: BrainItemType, title: string) => Promise<void> }) {
  const [title, setTitle] = useState('')
  const [type, setType]   = useState<BrainItemType>('idea')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const submit = async () => {
    if (!title.trim() || saving) return
    setSaving(true)
    await onCapture(type, title.trim())
    setTitle('')
    setSaving(false)
    inputRef.current?.focus()
  }

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') submit()
  }

  return (
    <LifeCard style={{ marginBottom: '12px', padding: '14px' }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
        <input
          ref={inputRef}
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Capturá un pensamiento…"
          maxLength={100}
          style={{
            flex: 1, padding: '10px 12px',
            borderRadius: radius.sm,
            background: colors.surface.high,
            border: `1px solid ${colors.border.subtle}`,
            color: colors.text.primary,
            fontFamily: font, fontSize: '14px', outline: 'none',
          }}
        />
        <button
          onClick={submit}
          disabled={!title.trim() || saving}
          style={{
            width: 38, height: 38, borderRadius: radius.sm, flexShrink: 0,
            background: title.trim() ? colors.area.brain : colors.surface.high,
            border: 'none', cursor: title.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.18s', opacity: !title.trim() ? 0.4 : 1,
          }}
        >
          <Check size={16} strokeWidth={3} style={{ color: title.trim() ? '#fff' : colors.text.quaternary }} />
        </button>
      </div>

      {/* Type pills */}
      <div style={{ display: 'flex', gap: '6px' }}>
        {(Object.entries(TYPE_META) as [BrainItemType, typeof TYPE_META['idea']][]).map(([t, meta]) => (
          <button
            key={t}
            onClick={() => setType(t)}
            style={{
              padding: '4px 10px', borderRadius: radius.full,
              background: type === t ? `${meta.color}18` : 'transparent',
              border: `1px solid ${type === t ? meta.color + '40' : colors.border.subtle}`,
              color: type === t ? meta.color : colors.text.quaternary,
              fontFamily: font, fontSize: '11px', fontWeight: 700,
              cursor: 'pointer', transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', gap: '4px',
            }}
          >
            <meta.icon size={10} strokeWidth={2.5} />
            {meta.label}
          </button>
        ))}
      </div>
    </LifeCard>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function LifeBrainPage() {
  const {
    items, loading, error, reload,
    ideasCount, notesCount, tasksCount,
    createItem, updateItem, deleteItem, toggleComplete, archiveItem,
  } = useBrain()

  const [filter, setFilter]         = useState<Filter>('todo')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQ, setSearchQ]       = useState('')
  const [editItem, setEditItem]     = useState<BrainItem | null>(null)
  const [sheetOpen, setSheetOpen]   = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<BrainItem | null>(null)

  if (loading) return <BrainSkeleton />

  if (error) return (
    <LifeScreenContainer>
      <LifeCard style={{ marginTop: '24px' }}>
        <LifeEmptyState
          icon={AlertTriangle}
          iconColor={colors.semantic.error}
          title="Algo salió mal"
          subtitle={error}
          action={{ label: 'Reintentar', onClick: reload }}
        />
      </LifeCard>
    </LifeScreenContainer>
  )

  // Filtered + searched items
  const visible = useMemo(() => {
    let list = items
    if (filter !== 'todo') list = list.filter(i => i.type === filter)
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase()
      list = list.filter(i =>
        i.title.toLowerCase().includes(q) ||
        (i.content ?? '').toLowerCase().includes(q)
      )
    }
    return list
  }, [items, filter, searchQ])

  // Group by date label
  const grouped = useMemo(() => {
    const today = new Date().toDateString()
    const yesterday = new Date(Date.now() - 86400000).toDateString()
    const map = new Map<string, BrainItem[]>()

    for (const item of visible) {
      const d = new Date(item.created_at)
      let label: string
      if (d.toDateString() === today) label = 'Hoy'
      else if (d.toDateString() === yesterday) label = 'Ayer'
      else label = d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })
      if (!map.has(label)) map.set(label, [])
      map.get(label)!.push(item)
    }
    return [...map.entries()]
  }, [visible])

  const handleQuickCapture = async (type: BrainItemType, title: string) => {
    await createItem({ type, title })
  }

  const emptyHint = filter === 'todo'
    ? { title: 'Tu mente, externalizada', subtitle: 'Capturá ideas, notas y tareas en un solo lugar. Soltá lo que tenés en la cabeza.' }
    : filter === 'idea'
    ? { title: 'Sin ideas aún', subtitle: 'Guardá todo lo que se te ocurra. Las mejores ideas viven aquí.' }
    : filter === 'note'
    ? { title: 'Sin notas', subtitle: 'Escribí notas para capturar lo que importa.' }
    : { title: 'Sin tareas', subtitle: 'Agregá tareas para no olvidar nada.' }

  return (
    <LifeScreenContainer>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '24px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 40, height: 40, borderRadius: '14px', background: `${colors.area.brain}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={20} style={{ color: colors.area.brain }} strokeWidth={2} />
          </div>
          <h1 style={{ fontFamily: font, fontSize: '26px', fontWeight: 800, color: colors.text.primary, margin: 0 }}>
            Brain
          </h1>
        </div>
        <button
          onClick={() => { setSearchOpen(v => !v); if (searchOpen) setSearchQ('') }}
          style={{
            width: 36, height: 36, borderRadius: radius.full,
            background: searchOpen ? colors.area.brain + '18' : 'transparent',
            border: `1px solid ${searchOpen ? colors.area.brain + '40' : colors.border.subtle}`,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: searchOpen ? colors.area.brain : colors.text.tertiary, transition: 'all 0.18s',
          }}
        >
          {searchOpen ? <X size={16} strokeWidth={2.5} /> : <Search size={16} strokeWidth={2} />}
        </button>
      </div>

      {/* Counts row */}
      {items.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '12px' }}>
          {[
            { label: 'Ideas', value: ideasCount, color: '#8B5CF6' },
            { label: 'Notas', value: notesCount, color: '#3B82F6' },
            { label: 'Tareas', value: tasksCount, color: '#22C55E' },
          ].map(({ label, value, color }) => (
            <LifeCard key={label} style={{ textAlign: 'center', padding: '10px 6px' }}>
              <p style={{ fontFamily: font, fontSize: '20px', fontWeight: 800, color, margin: '0 0 1px' }}>{value}</p>
              <p style={{ fontFamily: font, fontSize: '10px', fontWeight: 600, color: colors.text.quaternary, margin: 0, letterSpacing: '0.04em' }}>{label.toUpperCase()}</p>
            </LifeCard>
          ))}
        </div>
      )}

      {/* Quick capture */}
      <QuickCapture onCapture={handleQuickCapture} />

      {/* Search input */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden', marginBottom: '10px' }}
          >
            <input
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="Buscar en Brain…"
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              style={{
                width: '100%', padding: '10px 14px', boxSizing: 'border-box',
                borderRadius: radius.md,
                background: colors.surface.high,
                border: `1px solid ${colors.border.medium}`,
                color: colors.text.primary,
                fontFamily: font, fontSize: '14px', outline: 'none',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', overflowX: 'auto', paddingBottom: '2px' }}>
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 14px', borderRadius: radius.full, flexShrink: 0,
              background: filter === f ? colors.area.brain : colors.surface.high,
              border: `1px solid ${filter === f ? colors.area.brain : colors.border.subtle}`,
              color: filter === f ? '#fff' : colors.text.secondary,
              fontFamily: font, fontSize: '12px', fontWeight: 700,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
      </div>

      {/* Item list */}
      {visible.length === 0 ? (
        <LifeCard>
          <LifeEmptyState
            icon={Zap}
            iconColor={colors.area.brain}
            title={emptyHint.title}
            subtitle={emptyHint.subtitle}
          />
        </LifeCard>
      ) : (
        <motion.div variants={stagger} initial="hidden" animate="visible" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {grouped.map(([label, groupItems]) => (
            <motion.div key={label} variants={fadeInUp}>
              <LifeSectionHeader title={label} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px', marginBottom: '6px' }}>
                {groupItems.map(item => (
                  <BrainCard
                    key={item.id}
                    item={item}
                    onToggle={() => toggleComplete(item)}
                    onEdit={() => { setEditItem(item); setSheetOpen(true) }}
                    onArchive={() => archiveItem(item.id)}
                    onDelete={() => setDeleteTarget(item)}
                  />
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Sheet */}
      <BrainItemSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        initial={editItem}
        onSave={async data => {
          if (editItem) await updateItem(editItem.id, data)
          else await createItem(data)
        }}
      />

      {/* Delete confirm */}
      <LifeConfirmDialog
        open={!!deleteTarget}
        title="¿Eliminar?"
        message={`"${deleteTarget?.title}" será eliminado permanentemente.`}
        confirmLabel="Eliminar"
        onConfirm={async () => {
          if (deleteTarget) await deleteItem(deleteTarget.id)
          setDeleteTarget(null)
        }}
        onCancel={() => setDeleteTarget(null)}
        danger
      />
    </LifeScreenContainer>
  )
}
