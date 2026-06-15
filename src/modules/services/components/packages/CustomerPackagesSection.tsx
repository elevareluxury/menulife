import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { usePackages } from '../../hooks/usePackages'
import { usePackageUsage } from '../../hooks/usePackageUsage'
import { usePackageTemplates } from '../../hooks/usePackageTemplates'
import { PackageCard } from './PackageCard'
import { CreatePackageDrawer } from './CreatePackageDrawer'
import { computePackageItemSummaries } from '../../packages/packageUtils'
import type { PackageStatus, PackageUsage } from '../../packages/packageTypes'

interface CustomerPackagesSectionProps {
  customerId:   string
  restaurantId: string
}

export function CustomerPackagesSection({ customerId, restaurantId }: CustomerPackagesSectionProps) {
  const pkgHook      = usePackages(restaurantId)
  const usageHook    = usePackageUsage(restaurantId)
  const templateHook = usePackageTemplates(restaurantId)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    pkgHook.fetchByCustomer(customerId)
    usageHook.fetchByCustomer(customerId)
    templateHook.fetch()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, restaurantId])

  const handleCreated = () => {
    setShowCreate(false)
    pkgHook.fetchByCustomer(customerId)
    usageHook.fetchByCustomer(customerId)
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-white">Paquetes</h2>
          {pkgHook.packages.filter(p => p.status === 'active').length > 0 && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E' }}
            >
              {pkgHook.packages.filter(p => p.status === 'active').length} activo
            </span>
          )}
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
          style={{ background: '#F4705A', color: '#fff' }}
        >
          <Plus className="w-3.5 h-3.5" />
          Asignar
        </button>
      </div>

      <div className="p-4 space-y-3">
        {pkgHook.loading ? (
          <div className="flex justify-center py-8">
            <div
              className="w-5 h-5 border-2 rounded-full animate-spin"
              style={{ borderColor: 'rgba(255,255,255,0.08)', borderTopColor: '#F4705A' }}
            />
          </div>
        ) : pkgHook.packages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Sin paquetes asignados
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="text-xs font-semibold mt-2"
              style={{ color: '#F4705A' }}
            >
              + Asignar paquete
            </button>
          </div>
        ) : (
          pkgHook.packages.map(pkg => {
            const pkgUsages: PackageUsage[] = usageHook.usagesByPackage[pkg.id] ?? []
            const summaries = pkg.template
              ? computePackageItemSummaries(pkg.template.items, pkgUsages)
              : []
            return (
              <PackageCard
                key={pkg.id}
                pkg={pkg}
                summaries={summaries}
                onChangeStatus={(id, status: PackageStatus) => pkgHook.updateStatus(id, status)}
              />
            )
          })
        )}
      </div>

      <CreatePackageDrawer
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleCreated}
        templates={templateHook.templates}
        customerId={customerId}
        onCreate={pkgHook.create}
      />
    </div>
  )
}
