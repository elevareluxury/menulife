import { Warehouse } from 'lucide-react'

export default function InventarioPage() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center">
      <Warehouse className="w-12 h-12 mb-4" style={{ color: '#374151' }} />
      <h2 className="text-xl font-semibold text-white mb-2">Inventario</h2>
      <p style={{ color: 'rgba(255,255,255,0.4)' }}>Próximamente</p>
    </div>
  )
}
