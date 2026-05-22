import { Card } from '@/components/ui/Card'

export function SuperDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Super Admin</h1>
      <p className="text-sm text-gray-500 mb-8">Gestión global de menulife</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Restaurantes', value: '0' },
          { label: 'Usuarios', value: '0' },
          { label: 'Pedidos totales', value: '0' },
        ].map(({ label, value }) => (
          <Card key={label}>
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}
