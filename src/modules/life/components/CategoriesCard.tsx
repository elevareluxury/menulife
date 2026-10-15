import { useState } from 'react'
import { Archive, ArchiveRestore, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'
import { LifeCard, colors, font, radius, ink } from '../design-system'
import { categorySaveError, useCategories } from '../hooks/useCategories'
import { categoryNameError, type CustomCategory, type MoneyType } from '../lib/moneyCategories'
import { deleteWithUndo } from '../lib/undo'
import { ActionMenu } from './ActionMenu'
import { CategoryForm } from './CategoryForm'
import { useLifeT } from '@/i18n/app/life'

const label: React.CSSProperties = {
  fontFamily: font, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
  color: colors.text.tertiary, margin: '0 0 10px',
}
const sub: React.CSSProperties = { fontFamily: font, fontSize: 13, fontWeight: 700, color: colors.text.secondary, margin: '14px 0 4px' }
const help: React.CSSProperties = { fontFamily: font, fontSize: 12.5, color: colors.text.secondary, margin: '10px 0 0', lineHeight: 1.5 }

const Dot = ({ color }: { color: string }) => (
  <span aria-hidden="true" style={{ width: 12, height: 12, borderRadius: radius.full, background: ink(color), flexShrink: 0 }} />
)

/** Life OS → Ajustes → "Tus categorías": cambiar nombre y color, archivar (con "Deshacer") y restaurar. */
export function CategoriesCard() {
  const t = useLifeT()
  const c = t.categoriesUi
  const { items, setColor, rename, archive, restore, hide } = useCategories()
  const [editing, setEditing] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const active = items.filter(x => !x.archived_at)
  const archived = items.filter(x => x.archived_at)

  const save = async (cat: CustomCategory, name: string, color: string) => {
    if (name.trim() !== cat.name) await rename(cat.id, name)
    if (color !== cat.color) await setColor(cat.id, color)
    setEditing(null)
  }
  const doArchive = (cat: CustomCategory) => {
    hide(cat.id, true)
    deleteWithUndo({ message: t.undo.archived(cat.name), commit: () => archive(cat.id), restore: () => hide(cat.id, false) })
  }
  const doRestore = async (cat: CustomCategory) => {
    // Otra activa con el mismo nombre: no se puede (lo mismo controla la base)
    if (categoryNameError(cat.name, cat.type, items, t.categories, cat.id) === 'duplicate') { toast.error(c.errors.duplicate); return }
    try {
      await restore(cat.id)
      toast.success(c.restored(cat.name))
    } catch (err) { toast.error(categorySaveError(err, t)) }
  }

  const row = (cat: CustomCategory) => (
    <li key={cat.id} style={{ padding: '6px 0', borderBottom: `1px solid ${colors.border.subtle}` }}>
      {editing === cat.id ? (
        <CategoryForm type={cat.type} items={items} initial={cat} submitLabel={t.common.save}
          onCancel={() => setEditing(null)} onSubmit={(name, color) => save(cat, name, color)} />
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 40 }}>
          <Dot color={cat.color} />
          <span style={{ flex: 1, minWidth: 0, fontFamily: font, fontSize: 14, fontWeight: 600, color: colors.text.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.name}</span>
          <ActionMenu label={c.options(cat.name)} actions={[
            { icon: Pencil, label: c.edit, onSelect: () => setEditing(cat.id) },
            { icon: Archive, label: c.archive, onSelect: () => doArchive(cat), danger: true },
          ]} />
        </div>
      )}
    </li>
  )

  const groups: [MoneyType, string][] = [['expense', t.money.expense], ['income', t.money.income]]

  return (
    <LifeCard>
      <section aria-labelledby="life-categories-title">
        <h2 id="life-categories-title" style={label}>{c.settingsTitle}</h2>
        {active.length === 0 && <p style={{ ...help, marginTop: 0 }}>{c.empty}</p>}
        {groups.map(([type, name]) => {
          const list = active.filter(x => x.type === type)
          if (!list.length) return null
          return (
            <div key={type}>
              <h3 style={sub}>{name}</h3>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>{list.map(row)}</ul>
            </div>
          )
        })}
        {archived.length > 0 && (
          <>
            <button type="button" aria-expanded={showArchived} onClick={() => setShowArchived(v => !v)}
              style={{ marginTop: 12, minHeight: 40, padding: '6px 12px', borderRadius: radius.full, background: 'transparent', border: `1px solid ${colors.border.subtle}`, color: colors.text.secondary, fontFamily: font, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {c.archivedTitle(archived.length)}
            </button>
            {showArchived && (
              <ul style={{ listStyle: 'none', margin: '6px 0 0', padding: 0 }}>
                {archived.map(cat => (
                  <li key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 44, borderBottom: `1px solid ${colors.border.subtle}` }}>
                    <Dot color={cat.color} />
                    <span style={{ flex: 1, minWidth: 0, fontFamily: font, fontSize: 14, color: colors.text.secondary }}>
                      {cat.name} <span style={{ fontSize: 12, color: colors.text.tertiary }}>· {cat.type === 'income' ? t.money.income : t.money.expense}</span>
                    </span>
                    <button type="button" onClick={() => void doRestore(cat)} aria-label={c.restoreOf(cat.name)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 36, padding: '6px 12px', borderRadius: radius.full, background: colors.surface.high, border: `1px solid ${colors.border.subtle}`, color: colors.text.primary, fontFamily: font, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      <ArchiveRestore size={14} aria-hidden="true" /> {c.restore}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        <p style={help}>{c.settingsHelp}</p>
      </section>
    </LifeCard>
  )
}
