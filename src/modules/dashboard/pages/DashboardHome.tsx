import { Card } from '@/components/ui/Card'

export function DashboardHome() {
  return (
    <div>
      <h2 className="text-3xl font-bold mb-6">Dashboard</h2>

      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <h3 className="text-lg font-semibold mb-2">Menú</h3>
          <p className="text-gray-600">Próximamente: Editor de menú</p>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold mb-2">Pedidos</h3>
          <p className="text-gray-600">Próximamente: Gestión de pedidos</p>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold mb-2">QR</h3>
          <p className="text-gray-600">Próximamente: Generador de QR</p>
        </Card>
      </div>
    </div>
  )
}
