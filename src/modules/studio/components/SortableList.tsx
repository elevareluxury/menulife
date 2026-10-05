import type { CSSProperties, ReactNode } from 'react'
import {
  closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type Announcements, type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { useStudioT } from '@/i18n/app/studio'

/** Lo que recibe cada fila para dibujar su "manija" de arrastre. */
export interface DragHandleProps {
  label: string
  attributes: Record<string, unknown>
  listeners: Record<string, unknown> | undefined
  setActivatorNodeRef: (el: HTMLElement | null) => void
}

export function DragHandle({ label, attributes, listeners, setActivatorNodeRef }: DragHandleProps) {
  return (
    <button type="button" ref={setActivatorNodeRef} className="st-drag-handle" {...attributes} {...listeners} aria-label={label}>
      <GripVertical size={17} aria-hidden="true" />
    </button>
  )
}

/**
 * Lista que se reordena arrastrando la manija (mouse o dedo) o con el teclado (espacio, flechas,
 * espacio; Escape cancela). Los anuncios para lectores de pantalla usan los textos de Studio.
 * `onMove(from, to)` recibe posiciones del arreglo.
 */
export function SortableList<T extends { id: string }>({ items, label, onMove, as: Tag = 'ol', className, style, children }: {
  items: T[]
  /** Nombre de cada elemento para los anuncios */
  label: (item: T) => string
  onMove: (from: number, to: number) => void
  as?: 'ol' | 'ul'
  className?: string
  style?: CSSProperties
  children: (item: T, index: number, handle: DragHandleProps, dragging: { ref: (el: HTMLElement | null) => void; style: CSSProperties; className: string }) => ReactNode
}) {
  const s = useStudioT().sortable
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const name = (id: string | number) => {
    const item = items.find(i => i.id === id)
    return item ? label(item) : ''
  }
  const pos = (id: string | number | undefined) => items.findIndex(i => i.id === id) + 1
  const announcements: Announcements = {
    onDragStart: ({ active }) => s.picked(name(active.id)),
    onDragOver: ({ active, over }) => (over ? s.over(name(active.id), pos(over.id), items.length) : undefined),
    onDragEnd: ({ active, over }) => (over ? s.dropped(name(active.id), pos(over.id), items.length) : s.cancelled(name(active.id))),
    onDragCancel: ({ active }) => s.cancelled(name(active.id)),
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    const from = items.findIndex(i => i.id === active.id)
    const to = items.findIndex(i => i.id === over.id)
    if (from >= 0 && to >= 0) onMove(from, to)
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}
      accessibility={{ announcements, screenReaderInstructions: { draggable: s.instructions } }}>
      <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
        <Tag className={className} style={{ listStyle: 'none', margin: 0, padding: 0, ...style }}>
          {items.map((item, index) => (
            <SortableRow key={item.id} id={item.id}>
              {(handle, dragging) => children(item, index, { ...handle, label: s.handle(label(item)) }, dragging)}
            </SortableRow>
          ))}
        </Tag>
      </SortableContext>
    </DndContext>
  )
}

function SortableRow({ id, children }: {
  id: string
  children: (handle: DragHandleProps, dragging: { ref: (el: HTMLElement | null) => void; style: CSSProperties; className: string }) => ReactNode
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id })
  return children(
    { label: '', attributes: attributes as unknown as Record<string, unknown>, listeners, setActivatorNodeRef },
    {
      ref: setNodeRef,
      style: { transform: CSS.Transform.toString(transform), transition },
      className: `st-sortable-item${isDragging ? ' is-dragging' : ''}`,
    },
  )
}
