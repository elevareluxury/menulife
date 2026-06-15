import { useState, useMemo } from 'react'
import { Plus, FolderOpen, Users, Zap, MoonIcon } from 'lucide-react'
import { useRestaurant } from '@/modules/menu/hooks/useRestaurant'
import { useServiceResources } from '../hooks/useServiceResources'
import { useServiceResourceTypes } from '../hooks/useServiceResourceTypes'
import { useTerminology } from '../hooks/useTerminology'
import { ResourceCard } from '../components/ResourceCard'
import { CreateResourceModal } from '../components/CreateResourceModal'
import { EditResourceModal } from '../components/EditResourceModal'
import type { ServiceResource, ResourceStatus } from '../hooks/useServiceResources'

/* ── Stat mini-card ──────────────────────────────────────────── */

interface StatCardProps {
  label: string
  value: number
  icon: React.ReactNode
  accent?: string
}

function StatCard({ label, value, icon, accent = 'rgba(255,255,255,0.15)' }: StatCardProps) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-2xl flex-1 min-w-0"
      style={{ backgroundColor: '#1c1f26', border: '1px solid #2a2d35' }}
    >
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${accent}18` }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold text-white leading-none">{value}</p>
        <p className="text-[10px] mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</p>
      </div>
    </div>
  )
}

/* ── Empty state ─────────────────────────────────────────────── */

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ backgroundColor: 'rgba(244,112,90,0.08)', border: '1px solid rgba(244,112,90,0.2)' }}
      >
        <FolderOpen className="w-7 h-7" style={{ color: '#F4705A' }} />
      </div>
      <h3 className="text-base font-bold text-white mb-1">Sin recursos todavía</h3>
      <p className="text-sm mb-6 max-w-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
        Agregá tu primer recurso — una persona, sala, cancha o cualquier elemento de tu negocio.
      </p>
      <button
        onClick={onNew}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
        style={{ backgroundColor: '#F4705A' }}
      >
        <Plus className="w-4 h-4" /> Crear primer recurso
      </button>
    </div>
  )
}

/* ── Empty filtered state ────────────────────────────────────── */

function EmptyFiltered({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
        No hay recursos de tipo <span className="text-white/60 font-medium">"{label}"</span>
      </p>
    </div>
  )
}

/* ── Delete confirm ──────────────────────────────────────────── */

function DeleteConfirm({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 text-center"
        style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)' }}
        >
          <FolderOpen className="w-5 h-5" style={{ color: '#F87171' }} />
        </div>
        <h3 className="text-base font-bold text-white mb-1">Eliminar recurso</h3>
        <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.45)' }}>
          ¿Eliminás <span className="text-white font-semibold">"{name}"</span>?
          Esta acción no se puede deshacer.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: '#EF4444' }}
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Loading skeleton ────────────────────────────────────────── */

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl p-4 animate-pulse"
          style={{ backgroundColor: '#1c1f26', border: '1px solid #2a2d35', height: 160 }}
        />
      ))}
    </div>
  )
}

/* ── Main page ───────────────────────────────────────────────── */

export function ServicesRecursosPage() {
  const { restaurant, loading: restaurantLoading } = useRestaurant()
  const { resources, loading, stats, create, update, setStatus, remove } = useServiceResources(restaurant?.id)
  const { types, loading: typesLoading } = useServiceResourceTypes(restaurant?.id)
  const { term } = useTerminology()

  const [showCreate, setShowCreate]   = useState(false)
  const [editTarget, setEditTarget]   = useState<ServiceResource | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ServiceResource | null>(null)
  const [activeTypeFilter, setActiveTypeFilter] = useState<string | null>(null)

  /* ── Filtered resources ─────────────────────────────────────── */
  const displayed = useMemo(
    () => activeTypeFilter
      ? resources.filter(r => r.resource_type_id === activeTypeFilter)
      : resources,
    [resources, activeTypeFilter]
  )

  /* ── Type filter tabs (only types that have at least 1 resource) ── */
  const activeTabs = useMemo(() => {
    const usedTypeIds = new Set(resources.map(r => r.resource_type_id))
    return types.filter(t => usedTypeIds.has(t.id))
  }, [types, resources])

  const handleDelete = async () => {
    if (!deleteTarget) return
    await remove(deleteTarget.id)
    setDeleteTarget(null)
  }

  const handleStatusChange = (id: string, status: ResourceStatus) => {
    setStatus(id, status)
  }

  /* ── Guard ──────────────────────────────────────────────────── */
  if (restaurantLoading || typesLoading) {
    return (
      <div className="min-h-full" style={{ background: '#0F1115' }}>
        <div className="max-w-7xl mx-auto px-4 pt-5 pb-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="w-32 h-6 rounded-lg animate-pulse" style={{ background: '#1c1f26' }} />
              <div className="w-48 h-3 rounded-lg animate-pulse mt-2" style={{ background: '#1c1f26' }} />
            </div>
          </div>
          <SkeletonGrid />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full" style={{ background: '#0F1115' }}>
      <div className="max-w-7xl mx-auto px-4 pt-5 pb-10">

        {/* ── HEADER ─────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-white">{term('resources')}</h1>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {stats.total === 0
                ? 'Salas, profesionales y equipos de tu negocio'
                : `${stats.total} ${stats.total !== 1 ? term('resources') : term('resources', 'singular')} registrado${stats.total !== 1 ? 's' : ''}`
              }
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
            style={{ backgroundColor: '#F4705A' }}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuevo</span>
          </button>
        </div>

        {/* ── STATS ──────────────────────────────────────────── */}
        {stats.total > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <StatCard
              label="Total"
              value={stats.total}
              icon={<FolderOpen className="w-4 h-4" style={{ color: '#F4705A' }} />}
              accent="#F4705A"
            />
            <StatCard
              label="Disponibles"
              value={stats.available}
              icon={<Users className="w-4 h-4" style={{ color: '#22C55E' }} />}
              accent="#22C55E"
            />
            <StatCard
              label="Ocupados"
              value={stats.busy}
              icon={<Zap className="w-4 h-4" style={{ color: '#F59E0B' }} />}
              accent="#F59E0B"
            />
            <StatCard
              label="Inactivos"
              value={stats.inactive}
              icon={<MoonIcon className="w-4 h-4" style={{ color: '#6B7280' }} />}
              accent="#6B7280"
            />
          </div>
        )}

        {/* ── TYPE FILTER TABS ───────────────────────────────── */}
        {activeTabs.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 mb-4" style={{ scrollbarWidth: 'none' }}>
            <button
              onClick={() => setActiveTypeFilter(null)}
              className="flex-shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{
                backgroundColor: !activeTypeFilter ? '#F4705A' : 'rgba(255,255,255,0.06)',
                color: !activeTypeFilter ? '#fff' : 'rgba(255,255,255,0.5)',
              }}
            >
              Todos
            </button>
            {activeTabs.map(type => {
              const isActive = activeTypeFilter === type.id
              const count = resources.filter(r => r.resource_type_id === type.id).length
              return (
                <button
                  key={type.id}
                  onClick={() => setActiveTypeFilter(isActive ? null : type.id)}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    backgroundColor: isActive ? `${type.color}18` : 'rgba(255,255,255,0.06)',
                    color: isActive ? type.color : 'rgba(255,255,255,0.5)',
                    border: `1px solid ${isActive ? `${type.color}40` : 'transparent'}`,
                  }}
                >
                  {type.name}
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                    style={{ backgroundColor: isActive ? `${type.color}20` : 'rgba(255,255,255,0.08)' }}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {/* ── CONTENT ────────────────────────────────────────── */}
        {loading ? (
          <SkeletonGrid />
        ) : resources.length === 0 ? (
          <EmptyState onNew={() => setShowCreate(true)} />
        ) : displayed.length === 0 ? (
          <EmptyFiltered label={types.find(t => t.id === activeTypeFilter)?.name ?? ''} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {displayed.map(resource => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                onStatusChange={handleStatusChange}
                onEdit={setEditTarget}
                onDelete={r => setDeleteTarget(resources.find(x => x.id === r) ?? null)}
              />
            ))}

            {/* Add more card */}
            <button
              onClick={() => setShowCreate(true)}
              className="flex flex-col items-center justify-center rounded-2xl p-4 transition-all duration-200 group"
              style={{
                backgroundColor: 'transparent',
                border: '1.5px dashed rgba(255,255,255,0.1)',
                minHeight: 140,
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(244,112,90,0.4)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-2 transition-colors"
                style={{ backgroundColor: 'rgba(244,112,90,0.08)' }}
              >
                <Plus className="w-5 h-5" style={{ color: 'rgba(244,112,90,0.6)' }} />
              </div>
              <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Agregar
              </span>
            </button>
          </div>
        )}
      </div>

      {/* ── MODALS ─────────────────────────────────────────────── */}
      {showCreate && restaurant && (
        <CreateResourceModal
          restaurantId={restaurant.id}
          types={types}
          onClose={() => setShowCreate(false)}
          onCreate={create}
        />
      )}

      {editTarget && (
        <EditResourceModal
          resource={editTarget}
          types={types}
          onClose={() => setEditTarget(null)}
          onSave={async (id, input) => {
            const ok = await update(id, input)
            return ok
          }}
        />
      )}

      {deleteTarget && (
        <DeleteConfirm
          name={deleteTarget.name}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
