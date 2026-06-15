import { Layers } from 'lucide-react'
import { ServicesPlaceholderPage } from './ServicesPlaceholderPage'
import { useTerminology } from '../hooks/useTerminology'

export function ServicesServiciosPage() {
  const { term } = useTerminology()
  return (
    <ServicesPlaceholderPage
      icon={Layers}
      title={term('services')}
      description="Catálogo de servicios con precios, duraciones y disponibilidad"
      features={[
        { icon: '💼', title: 'Catálogo de servicios', description: 'Definí cada servicio con nombre, descripción y duración' },
        { icon: '💰', title: 'Precios personalizados', description: 'Precios fijos, por sesión o por paquete' },
        { icon: '⏱', title: 'Duraciones configurables', description: 'De 15 minutos a días completos según el servicio' },
        { icon: '📦', title: 'Paquetes y membresías', description: 'Vendé sesiones en conjunto con descuento' },
        { icon: '🎨', title: 'Imagen y descripción', description: 'Mostrá tu oferta de forma profesional al cliente' },
      ]}
    />
  )
}
