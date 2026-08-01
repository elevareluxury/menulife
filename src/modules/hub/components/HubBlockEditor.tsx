import { useState } from 'react'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor,
  useSensor, useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Eye, EyeOff, Settings } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { useHubBlocks } from '../hooks/useHubBlocks'
import { BLOCK_DEFINITIONS } from '../lib/blocksConfig'
import type { HubBlock, BlockType } from '../lib/blocksConfig'
import { VideoBlockEditModal } from './blocks/VideoBlockEditModal'
import { BioBlockEditModal } from './blocks/BioBlockEditModal'
import { StatsBlockEditModal } from './blocks/StatsBlockEditModal'
import { ContactFormBlockEditModal } from './blocks/ContactFormBlockEditModal'

const ACC = '#F4705A'

// Bloques nuevos que tienen modal de edición
const EDITABLE_NEW_BLOCKS: BlockType[] = ['video', 'bio', 'stats', 'contact_form']

interface HubBlockEditorProps {
  restaurantId: string
  onEditLegacyBlock?: (blockType: BlockType) => void
}

export function HubBlockEditor({ restaurantId, onEditLegacyBlock }: HubBlockEditorProps) {
  const { blocks, isLoading, updateBlock, reorderBlocks } = useHubBlocks({
    restaurantId,
    ensureAllTypes: true,
  })

  const [editingBlock, setEditingBlock] = useState<HubBlock | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = blocks.findIndex(b => b.id === active.id)
    const newIdx = blocks.findIndex(b => b.id === over.id)
    if (oldIdx === -1 || newIdx === -1) return
    const reordered = arrayMove(blocks, oldIdx, newIdx)
    await reorderBlocks(reordered.map(b => b.id))
  }

  async function handleToggleActive(block: HubBlock) {
    const def = BLOCK_DEFINITIONS[block.block_type as BlockType]
    if (def.alwaysActive) return
    await updateBlock(block.id, { is_active: !block.is_active })
  }

  function handleEditClick(block: HubBlock) {
    const def = BLOCK_DEFINITIONS[block.block_type as BlockType]
    if (def.dataSource === 'table') {
      // Para bloques legacy, delegar al tab correspondiente
      onEditLegacyBlock?.(block.block_type)
    } else if (EDITABLE_NEW_BLOCKS.includes(block.block_type)) {
      setEditingBlock(block)
    }
  }

  async function handleSaveBlockConfig(config: Record<string, any>) {
    if (!editingBlock) return
    await updateBlock(editingBlock.id, { config })
  }

  if (isLoading) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
        Cargando bloques…
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <p style={{ color: '#fff', fontWeight: 700, fontSize: 16, margin: '0 0 6px' }}>
          Bloques del ID
        </p>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: 0, lineHeight: 1.5 }}>
          Arrastrá para reordenar. Tocá el ojo para activar o desactivar cada bloque en tu ID público.
        </p>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
          {blocks.map(block => (
            <SortableBlockItem
              key={block.id}
              block={block}
              onToggle={() => handleToggleActive(block)}
              onEdit={() => handleEditClick(block)}
            />
          ))}
        </SortableContext>
      </DndContext>

      {/* Modales de edición para bloques nuevos */}
      {editingBlock?.block_type === 'video' && (
        <VideoBlockEditModal
          config={editingBlock.config}
          onSave={handleSaveBlockConfig}
          onClose={() => setEditingBlock(null)}
        />
      )}
      {editingBlock?.block_type === 'bio' && (
        <BioBlockEditModal
          config={editingBlock.config}
          onSave={handleSaveBlockConfig}
          onClose={() => setEditingBlock(null)}
        />
      )}
      {editingBlock?.block_type === 'stats' && (
        <StatsBlockEditModal
          config={editingBlock.config}
          onSave={handleSaveBlockConfig}
          onClose={() => setEditingBlock(null)}
        />
      )}
      {editingBlock?.block_type === 'contact_form' && (
        <ContactFormBlockEditModal
          config={editingBlock.config}
          onSave={handleSaveBlockConfig}
          onClose={() => setEditingBlock(null)}
        />
      )}
    </div>
  )
}

// ── Sortable item ─────────────────────────────────────────────────────────────

interface SortableBlockItemProps {
  block: HubBlock
  onToggle: () => void
  onEdit: () => void
}

function SortableBlockItem({ block, onToggle, onEdit }: SortableBlockItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id })

  const def = BLOCK_DEFINITIONS[block.block_type as BlockType]
  const IconComponent = ((LucideIcons as any)[def.icon] ?? LucideIcons.Square) as React.FC<{ size?: number; color?: string }>

  const isNew = def.dataSource === 'jsonb'

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? transition : (transition ?? 'all 0.15s'),
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 100 : 'auto' as any,
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px', borderRadius: 16, marginBottom: 8,
        background: block.is_active ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${block.is_active ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)'}`,
      }}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        style={{
          background: 'none', border: 'none', cursor: 'grab', padding: 0,
          color: 'rgba(255,255,255,0.25)', display: 'flex', touchAction: 'none',
          flexShrink: 0,
        }}
        aria-label="Reordenar"
      >
        <GripVertical size={18} />
      </button>

      {/* Icon */}
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: isNew ? 'rgba(244,112,90,0.1)' : 'rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <IconComponent size={16} color={isNew ? ACC : 'rgba(255,255,255,0.6)'} />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          color: block.is_active ? '#fff' : 'rgba(255,255,255,0.4)',
          fontSize: 14, fontWeight: 600, margin: 0,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {def.label}
          {isNew && (
            <span style={{
              marginLeft: 8, fontSize: 10, fontFamily: 'monospace',
              color: ACC, background: 'rgba(244,112,90,0.12)',
              padding: '1px 6px', borderRadius: 100,
            }}>
              NUEVO
            </span>
          )}
        </p>
        <p style={{
          color: 'rgba(255,255,255,0.3)', fontSize: 12, margin: 0,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {def.description}
        </p>
      </div>

      {/* Toggle visibilidad */}
      {!def.alwaysActive && (
        <button
          type="button"
          onClick={onToggle}
          style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: block.is_active ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)',
          }}
          aria-label={block.is_active ? 'Desactivar bloque' : 'Activar bloque'}
        >
          {block.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
      )}

      {/* Edit button — para todos los no-hero */}
      {!def.alwaysActive && (
        <button
          type="button"
          onClick={onEdit}
          style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: isNew && block.is_active ? 'rgba(244,112,90,0.1)' : 'none',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: isNew ? ACC : 'rgba(255,255,255,0.3)',
          }}
          aria-label="Configurar bloque"
        >
          <Settings size={16} />
        </button>
      )}
    </div>
  )
}
