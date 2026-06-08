import { useState } from 'react'
import { useRestaurant } from '@/modules/menu/hooks/useRestaurant'
import { CategoriasTab } from '../components/CategoriasTab'
import { ProductosTab } from '../components/ProductosTab'
import { MovimientosTab } from '../components/MovimientosTab'
import { AlertasTab } from '../components/AlertasTab'
import { ReportesTab } from '../components/ReportesTab'
import { cn } from '@/lib/utils'
import { Warehouse } from 'lucide-react'

type Tab = 'productos' | 'movimientos' | 'alertas' | 'categorias' | 'reportes'

const TABS: { id: Tab; label: string }[] = [
  { id: 'productos',    label: 'Productos' },
  { id: 'movimientos',  label: 'Movimientos' },
  { id: 'alertas',      label: 'Alertas' },
  { id: 'categorias',   label: 'Categorías' },
  { id: 'reportes',     label: 'Reportes' },
]

export default function InventarioPage() {
  const { restaurant, loading } = useRestaurant()
  const [activeTab, setActiveTab] = useState<Tab>('productos')
  const [openMovimientoForProduct, setOpenMovimientoForProduct] = useState<string | undefined>(undefined)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-2 border-[#F4705A] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!restaurant) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <Warehouse className="w-12 h-12 mb-4 text-gray-600" />
        <p className="text-white/40">No se encontró el restaurante</p>
      </div>
    )
  }

  const restaurantId = restaurant.id

  const handleReponerFromAlerta = (productId: string) => {
    setOpenMovimientoForProduct(productId)
    setActiveTab('movimientos')
  }

  return (
    <div className="min-h-full" style={{ background: '#0F1115' }}>
      <div className="max-w-7xl mx-auto px-4 pt-4 pb-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Inventario</h1>
          <p className="text-white/40 text-sm mt-1">Gestión de productos, stock y movimientos</p>
        </div>

        {/* Tab bar */}
        <div className="overflow-x-auto scrollbar-hide mb-6">
          <div className="flex gap-1 bg-[#1a1a1a] border border-gray-800 rounded-xl p-1 w-fit min-w-full sm:min-w-0">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
                  activeTab === tab.id
                    ? 'text-white'
                    : 'text-white/40 hover:text-white/70'
                )}
                style={activeTab === tab.id ? { background: '#F4705A' } : {}}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        {activeTab === 'productos' && (
          <ProductosTab restaurantId={restaurantId} />
        )}
        {activeTab === 'movimientos' && (
          <MovimientosTab
            restaurantId={restaurantId}
            prefillProductId={openMovimientoForProduct}
            onPrefillConsumed={() => setOpenMovimientoForProduct(undefined)}
          />
        )}
        {activeTab === 'alertas' && (
          <AlertasTab
            restaurantId={restaurantId}
            onReponer={handleReponerFromAlerta}
          />
        )}
        {activeTab === 'categorias' && (
          <CategoriasTab restaurantId={restaurantId} />
        )}
        {activeTab === 'reportes' && (
          <ReportesTab restaurantId={restaurantId} />
        )}
      </div>
    </div>
  )
}
