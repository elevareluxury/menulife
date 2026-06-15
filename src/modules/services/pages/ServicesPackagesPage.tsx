import { useState, useEffect } from 'react'
import { Plus, Package2 } from 'lucide-react'
import { useRestaurant } from '@/modules/menu/hooks/useRestaurant'
import { usePackageTemplates } from '../hooks/usePackageTemplates'
import { PackageTemplateCard } from '../components/packages/PackageTemplateCard'
import { CreatePackageTemplateDrawer } from '../components/packages/CreatePackageTemplateDrawer'
import { useTerminology } from '../hooks/useTerminology'
import { ServiceEmptyState } from '../components/ServiceEmptyState'
import type { PackageTemplate } from '../packages/packageTypes'

export function ServicesPackagesPage() {
  const { restaurant } = useRestaurant()
  const hook           = usePackageTemplates(restaurant?.id)
  const { term }       = useTerminology()

  const [showCreate, setShowCreate] = useState(false)
  const [editTpl,    setEditTpl]    = useState<PackageTemplate | null>(null)

  useEffect(() => {
    hook.fetch()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant?.id])

  const handleSave = async (input: Omit<PackageTemplate, 'id' | 'restaurant_id' | 'created_at' | 'updated_at'>) => {
    if (editTpl) {
      await hook.update(editTpl.id, input)
    } else {
      await hook.create(input)
    }
    setEditTpl(null)
    setShowCreate(false)
  }

  return (
    <div className="max-w-2xl mx-auto pb-16">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-white">{term('packages')}</h1>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Definí plantillas para ofrecer a tus {term('customers').toLowerCase()}
          </p>
        </div>
        <button
          onClick={() => { setEditTpl(null); setShowCreate(true) }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
          style={{ background: '#F4705A', color: '#fff' }}
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nuevo paquete</span>
        </button>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Activos',   value: '—' },
          { label: 'Vendidos',  value: '—' },
          { label: 'Por vencer',value: '—' },
        ].map(m => (
          <div
            key={m.label}
            className="rounded-2xl p-4"
            style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <p className="text-lg font-bold text-white mb-0.5">{m.value}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {m.label}
            </p>
          </div>
        ))}
      </div>

      {/* List */}
      {hook.loading ? (
        <div className="flex justify-center py-20">
          <div
            className="w-6 h-6 border-2 rounded-full animate-spin"
            style={{ borderColor: 'rgba(255,255,255,0.08)', borderTopColor: '#F4705A' }}
          />
        </div>
      ) : hook.templates.length === 0 ? (
        <ServiceEmptyState
          icon={Package2}
          title="Sin plantillas creadas"
          description="Creá tu primera plantilla y empezá a vender bundles de sesiones, horas o créditos."
          action={{ label: 'Crear primera plantilla', onClick: () => setShowCreate(true) }}
        />
      ) : (
        <div className="space-y-3">
          {hook.templates.map(t => (
            <PackageTemplateCard
              key={t.id}
              template={t}
              onEdit={tpl => { setEditTpl(tpl); setShowCreate(true) }}
              onArchive={id => hook.archive(id)}
            />
          ))}
        </div>
      )}

      <CreatePackageTemplateDrawer
        open={showCreate}
        template={editTpl}
        onClose={() => { setShowCreate(false); setEditTpl(null) }}
        defaultCurrency={restaurant?.default_currency ?? 'ARS'}
        onSave={handleSave}
      />
    </div>
  )
}
