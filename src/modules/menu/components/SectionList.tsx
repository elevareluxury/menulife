import { useState } from 'react'
import { ChevronDown, ChevronRight, Edit, Plus, Trash } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import type { MenuSection } from '@/types'
import { useMenuItems } from '../hooks/useMenuItems'
import { ItemList } from './ItemList'
import { SectionModal } from './SectionModal'
import { MenuItemModal } from './MenuItemModal'

interface SectionListProps {
  sections: MenuSection[]
  restaurantId: string
}

export function SectionList({ sections, restaurantId }: SectionListProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [editingSection, setEditingSection] = useState<MenuSection | null>(null)
  const [addingItemToSection, setAddingItemToSection] = useState<string | null>(null)

  function toggleSection(sectionId: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      next.has(sectionId) ? next.delete(sectionId) : next.add(sectionId)
      return next
    })
  }

  async function handleDeleteSection(sectionId: string) {
    if (!confirm('¿Eliminar esta sección? Se eliminarán todos sus platos.')) return
    const { error } = await supabase.from('menu_sections').delete().eq('id', sectionId)
    if (error) toast.error(error.message)
    else toast.success('Sección eliminada')
  }

  return (
    <div className="space-y-3">
      {sections.map((section) => (
        <SectionCard
          key={section.id}
          section={section}
          isExpanded={expandedSections.has(section.id)}
          restaurantId={restaurantId}
          onToggle={() => toggleSection(section.id)}
          onEdit={() => setEditingSection(section)}
          onDelete={() => handleDeleteSection(section.id)}
          onAddItem={() => setAddingItemToSection(section.id)}
        />
      ))}

      {editingSection && (
        <SectionModal
          isOpen
          onClose={() => setEditingSection(null)}
          restaurantId={restaurantId}
          section={editingSection}
        />
      )}
      {addingItemToSection && (
        <MenuItemModal
          isOpen
          onClose={() => setAddingItemToSection(null)}
          restaurantId={restaurantId}
          sectionId={addingItemToSection}
        />
      )}
    </div>
  )
}

interface SectionCardProps {
  section: MenuSection
  isExpanded: boolean
  restaurantId: string
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  onAddItem: () => void
}

function SectionCard({ section, isExpanded, restaurantId, onToggle, onEdit, onDelete, onAddItem }: SectionCardProps) {
  const { items, loading } = useMenuItems(isExpanded ? section.id : null)

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={onToggle} className="p-1 rounded text-gray-400 hover:text-gray-600 transition-colors">
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        <button onClick={onToggle} className="flex-1 text-left">
          <span className="font-semibold text-gray-900">{section.name}</span>
          {section.name_en && (
            <span className="ml-2 text-sm text-gray-400">{section.name_en}</span>
          )}
          {!section.is_active && (
            <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Oculta</span>
          )}
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
          {loading ? (
            <div className="flex justify-center py-4"><Spinner size="sm" /></div>
          ) : items.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-gray-500 mb-3">No hay platos en esta sección</p>
              <Button size="sm" onClick={onAddItem}>
                <Plus className="h-4 w-4 mr-1" /> Agregar plato
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <ItemList items={items} restaurantId={restaurantId} sectionId={section.id} />
              <div className="flex justify-end">
                <Button size="sm" variant="secondary" onClick={onAddItem}>
                  <Plus className="h-4 w-4 mr-1" /> Agregar plato
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
