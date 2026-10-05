import { useState, useMemo, useRef, useCallback, KeyboardEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Lightbulb, StickyNote, CheckSquare, Check, MoreHorizontal, Pencil, Archive, Trash2, Search, AlertTriangle } from 'lucide-react'
import {
  LifeScreenContainer, LifeCard, LifeSectionHeader, LifeEmptyState, LifeConfirmDialog,
  colors, font, radius, stagger, fadeInUp, scaleIn,
} from '../design-system'
import { useBrain, type BrainItem, type BrainItemType } from '../hooks/useBrain'
import { useBrainSearch } from '../hooks/useBrainSearch'
import { BrainItemSheet } from '../components/BrainItemSheet'
import { BrainSearchBar } from '../components/BrainSearchBar'
import { BrainTypeFilters } from '../components/BrainTypeFilters'
import { highlightTerm } from '../lib/highlight'

// ── Design constants ──────────────────────────────────────────────────────────
const TYPE_META = {
  idea: { icon: Lightbulb,   color: '#8B5CF6', label: 'Idea'  },
  note: { icon: StickyNote,  color: '#3B82F6', label: 'Nota'  },
  task: { icon: CheckSquare, color: '#22C55E', label: 'Tarea' },
} as const

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
function BrainCard({ item, searchTerm, onToggle, onEdit, onArchive, onDelete }: {
  item: BrainItem
  searchTerm: string
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
            {highlightTerm(item.title, searchTerm) ?? item.title}
          </p>
          {item.content && (
            <p style={{
              fontFamily: font, fontSize: '12px', fontWeight: 400,
              color: colors.text.tertiary, margin: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {highlightTerm(item.content, searchTerm)}
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
  // CRUD + total counts + error handling
  const {
    loading, error, reload,
    ideasCount, notesCount, tasksCount,
    createItem, updateItem, deleteItem, toggleComplete, archiveItem,
  } = useBrain()

  const [searchTerm, setSearchTerm]     = useState('')
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [editItem, setEditItem]         = useState<BrainItem | null>(null)
  const [sheetOpen, setSheetOpen]       = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<BrainItem | null>(null)

  // FTS — debounced, con filtro por tipo
  const {
    items, term: activeTerm, refetch: refetchSearch,
  } = useBrainSearch(searchTerm, {
    types: selectedTypes.length > 0 ? selectedTypes : undefined,
  })

  // Contadores del resultado actual (para BrainTypeFilters)
  const typeCounts = useMemo(() =>
    items.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] ?? 0) + 1
      return acc
    }, {} as Record<string, number>),
    [items]
  )

  // Agrupar por fecha
  const grouped = useMemo(() => {
    const today = new Date().toDateString()
    const yesterday = new Date(Date.now() - 86400000).toDateString()
    const map = new Map<string, BrainItem[]>()

    for (const item of items) {
      const d = new Date(item.created_at)
      let label: string
      if (d.toDateString() === today) label = 'Hoy'
      else if (d.toDateString() === yesterday) label = 'Ayer'
      else label = d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })
      if (!map.has(label)) map.set(label, [])
      map.get(label)!.push(item)
    }
    return [...map.entries()]
  }, [items])

  // Wrappers de mutación que refrescan la búsqueda
  const handleCreate = useCallback(async (data: Parameters<typeof createItem>[0]) => {
    await createItem(data)
    refetchSearch()
  }, [createItem, refetchSearch])

  const handleUpdate = useCallback(async (id: string, data: Parameters<typeof updateItem>[1]) => {
    await updateItem(id, data)
    refetchSearch()
  }, [updateItem, refetchSearch])

  const handleDelete = useCallback(async (id: string) => {
    await deleteItem(id)
    refetchSearch()
  }, [deleteItem, refetchSearch])

  const handleToggle = useCallback(async (item: BrainItem) => {
    await toggleComplete(item)
    refetchSearch()
  }, [toggleComplete, refetchSearch])

  const handleArchive = useCallback(async (id: string) => {
    await archiveItem(id)
    refetchSearch()
  }, [archiveItem, refetchSearch])

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

  const hasActiveSearch = searchTerm.trim().length > 0 || selectedTypes.length > 0

  return (
    <LifeScreenContainer>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', paddingTop: '24px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 40, height: 40, borderRadius: '14px', background: `${colors.area.brain}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={20} style={{ color: colors.area.brain }} strokeWidth={2} />
          </div>
          <h1 style={{ fontFamily: font, fontSize: '26px', fontWeight: 800, color: colors.text.primary, margin: 0 }}>
            Brain
          </h1>
        </div>
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
      <QuickCapture onCapture={(type, title) => handleCreate({ type, title })} />

      {/* Búsqueda FTS con debounce */}
      <BrainSearchBar value={searchTerm} onChange={setSearchTerm} />

      {/* Filtros por tipo (multi-select) */}
      <BrainTypeFilters
        selected={selectedTypes}
        onChange={setSelectedTypes}
        counts={typeCounts}
      />

      {/* Item list */}
      {items.length === 0 ? (
        <LifeCard>
          {hasActiveSearch ? (
            <LifeEmptyState
              icon={Search}
              iconColor={colors.text.tertiary}
              title={searchTerm ? `Sin resultados para "${searchTerm}"` : 'Sin items de ese tipo'}
              subtitle="Probá con otro término o quitá los filtros activos"
            />
          ) : (
            <LifeEmptyState
              icon={Zap}
              iconColor={colors.area.brain}
              title="Tu mente, externalizada"
              subtitle="Capturá ideas, notas y tareas en un solo lugar."
            />
          )}
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
                    searchTerm={activeTerm}
                    onToggle={() => handleToggle(item)}
                    onEdit={() => { setEditItem(item); setSheetOpen(true) }}
                    onArchive={() => handleArchive(item.id)}
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
          if (editItem) await handleUpdate(editItem.id, data)
          else await handleCreate(data)
        }}
      />

      {/* Delete confirm */}
      <LifeConfirmDialog
        open={!!deleteTarget}
        title="¿Eliminar?"
        message={`"${deleteTarget?.title}" será eliminado permanentemente.`}
        confirmLabel="Eliminar"
        onConfirm={async () => {
          if (deleteTarget) await handleDelete(deleteTarget.id)
          setDeleteTarget(null)
        }}
        onCancel={() => setDeleteTarget(null)}
        danger
      />
    </LifeScreenContainer>
  )
}
