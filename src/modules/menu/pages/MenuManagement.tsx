import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { useRestaurant } from '../hooks/useRestaurant'
import { useMenuSections } from '../hooks/useMenuSections'
import { SectionList } from '../components/SectionList'
import { SectionModal } from '../components/SectionModal'

export function MenuManagement() {
  const { restaurant, loading: restaurantLoading } = useRestaurant()
  const { sections, loading: sectionsLoading } = useMenuSections(restaurant?.id)
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false)

  if (restaurantLoading || sectionsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!restaurant) {
    return (
      <Card className="text-center text-gray-500 py-12">
        No se encontró el restaurante asociado a tu cuenta.
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Menú</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {restaurant.name} · {sections.length} {sections.length === 1 ? 'sección' : 'secciones'}
          </p>
        </div>
        <Button onClick={() => setIsSectionModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva sección
        </Button>
      </div>

      {/* Empty state */}
      {sections.length === 0 ? (
        <Card className="text-center py-16">
          <div className="text-5xl mb-4">🍽️</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Tu menú está vacío</h3>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">
            Creá tu primera sección (Entradas, Principales, Postres...) para empezar a cargar platos.
          </p>
          <Button onClick={() => setIsSectionModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Crear primera sección
          </Button>
        </Card>
      ) : (
        <SectionList sections={sections} restaurantId={restaurant.id} />
      )}

      <SectionModal
        isOpen={isSectionModalOpen}
        onClose={() => setIsSectionModalOpen(false)}
        restaurantId={restaurant.id}
      />
    </div>
  )
}
