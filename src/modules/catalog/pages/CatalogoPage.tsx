import { ShoppingBag } from 'lucide-react'

export default function CatalogoPage() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center">
      <ShoppingBag className="w-12 h-12 mb-4" style={{ color: '#374151' }} />
      <h2 className="text-xl font-semibold text-white mb-2">Catálogo</h2>
      <p style={{ color: 'rgba(255,255,255,0.4)' }}>Próximamente</p>
    </div>
  )
}
