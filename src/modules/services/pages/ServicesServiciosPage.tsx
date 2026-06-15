import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Layers } from 'lucide-react'
import { useRestaurant } from '@/modules/menu/hooks/useRestaurant'
import { useServiceCatalog } from '../hooks/useServiceCatalog'
import { useServiceCatalogResources } from '../hooks/useServiceCatalogResources'
import { useServiceResourceTypes } from '../hooks/useServiceResourceTypes'
import { useTerminology } from '../hooks/useTerminology'
import { ServiceCard } from '../components/catalog/ServiceCard'
import { CreateServiceDrawer } from '../components/catalog/CreateServiceDrawer'
import { ServiceEmptyState } from '../components/ServiceEmptyState'
import type { ServiceCatalogItem } from '../types/booking'
import type { CatalogResourceEntry } from '../hooks/useServiceCatalogResources'

export function ServicesServiciosPage() {
  const { restaurant } = useRestaurant()
  const restaurantId = restaurant?.id
  const defaultCurrency = restaurant?.default_currency ?? 'ARS'

  const catalogHook   = useServiceCatalog(restaurantId)
  const resourcesHook = useServiceCatalogResources(restaurantId)
  const { types: resourceTypes } = useServiceResourceTypes(restaurantId)
  const { term } = useTerminology()

  const [drawerOpen,    setDrawerOpen]    = useState(false)
  const [editItem,      setEditItem]      = useState<ServiceCatalogItem | null>(null)
  const [editResources, setEditResources] = useState<CatalogResourceEntry[]>([])
  const [confirmDelete, setConfirmDelete] = useState<ServiceCatalogItem | null>(null)
  const [search,        setSearch]        = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  useEffect(() => { catalogHook.fetchForManagement() }, [catalogHook.fetchForManagement])

  const openCreate = () => {
    setEditItem(null)
    setEditResources([])
    setDrawerOpen(true)
  }

  const openEdit = useCallback(async (item: ServiceCatalogItem) => {
    const resources = await resourcesHook.fetchByCatalog(item.id)
    setEditItem(item)
    setEditResources(resources.map(r => ({
      resource_type_id: r.resource_type_id,
      quantity:         r.quantity,
      is_required:      r.is_required,
    })))
    setDrawerOpen(true)
  }, [resourcesHook])

  const handleSave = useCallback(async (
    input: Partial<ServiceCatalogItem>,
    resourceEntries: CatalogResourceEntry[],
  ): Promise<boolean> => {
    if (editItem) {
      const ok = await catalogHook.update(editItem.id, input)
      if (!ok) return false
      await resourcesHook.setForCatalog(editItem.id, resourceEntries)
      return true
    } else {
      const newId = await catalogHook.create(input)
      if (!newId) return false
      await resourcesHook.setForCatalog(newId, resourceEntries)
      return true
    }
  }, [editItem, catalogHook, resourcesHook])

  const handleDelete = useCallback(async () => {
    if (!confirmDelete) return
    await catalogHook.remove(confirmDelete.id)
    setConfirmDelete(null)
  }, [confirmDelete, catalogHook])

  const categories = Array.from(
    new Set(catalogHook.items.map(i => i.category).filter(Boolean) as string[])
  )

  const filtered = catalogHook.items.filter(item => {
    const matchSearch = !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.category ?? '').toLowerCase().includes(search.toLowerCase())
    const matchCat = !activeCategory || item.category === activeCategory
    return matchSearch && matchCat
  })

  const activeCount = catalogHook.items.filter(i => i.is_active).length

  return (
    <div className="flex flex-col h-full" style={{ background: '#0F1115' }}>

      {/* Header */}
      <div className="px-4 pt-5 pb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">
              {term('services')}
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {catalogHook.items.length} {catalogHook.items.length === 1 ? 'servicio' : 'servicios'}
              {activeCount < catalogHook.items.length && (
                <span style={{ color: '#22C55E' }}>
                  {' '}· {activeCount} activos
                </span>
              )}
            </p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-opacity hover:opacity-80"
            style={{ background: '#F4705A', color: '#fff' }}
          >
            <Plus className="w-3.5 h-3.5" />
            Nuevo
          </button>
        </div>

        {/* Search */}
        <div className="mt-3 relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          />
          <input
            type="text"
            placeholder="Buscar servicio..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 rounded-xl text-sm outline-none"
            style={{
              background: '#13161C',
              border: '1px solid rgba(255,255,255,0.06)',
              color: '#fff',
            }}
          />
        </div>

        {/* Category pills */}
        {categories.length > 0 && (
          <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setActiveCategory(null)}
              className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors"
              style={{
                background: activeCategory === null ? '#F4705A' : 'rgba(255,255,255,0.06)',
                color:      activeCategory === null ? '#fff'    : 'rgba(255,255,255,0.5)',
              }}
            >
              Todos
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
                className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors"
                style={{
                  background: activeCategory === cat ? '#F4705A' : 'rgba(255,255,255,0.06)',
                  color:      activeCategory === cat ? '#fff'    : 'rgba(255,255,255,0.5)',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {catalogHook.loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#F4705A', borderTopColor: 'transparent' }} />
          </div>
        ) : filtered.length === 0 ? (
          <ServiceEmptyState
            icon={Layers}
            title={search || activeCategory ? 'Sin resultados' : 'Sin servicios aún'}
            description={
              search || activeCategory
                ? 'Probá con otro término o categoría'
                : 'Creá tu primer servicio para empezar a recibir turnos'
            }
            action={!search && !activeCategory ? { label: 'Crear servicio', onClick: openCreate } : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {filtered.map(item => (
              <ServiceCard
                key={item.id}
                item={item}
                onEdit={openEdit}
                onToggleActive={catalogHook.toggleActive}
                onDelete={setConfirmDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Drawer */}
      <CreateServiceDrawer
        open={drawerOpen}
        item={editItem}
        initialResources={editResources}
        defaultCurrency={defaultCurrency}
        resourceTypes={resourceTypes}
        onClose={() => { setDrawerOpen(false); setEditItem(null) }}
        onSave={handleSave}
      />

      {/* Delete confirmation */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: 'rgba(0,0,0,0.7)' }}
        >
          <div
            className="w-full max-w-xs rounded-2xl p-5"
            style={{ background: '#1c1f26', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <p className="text-sm font-semibold text-white mb-1">Eliminar servicio</p>
            <p className="text-xs mb-5" style={{ color: 'rgba(255,255,255,0.5)' }}>
              ¿Eliminás <span className="text-white font-medium">"{confirmDelete.name}"</span>? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold transition-opacity hover:opacity-80"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2 rounded-xl text-xs font-semibold transition-opacity hover:opacity-80"
                style={{ background: '#EF4444', color: '#fff' }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
