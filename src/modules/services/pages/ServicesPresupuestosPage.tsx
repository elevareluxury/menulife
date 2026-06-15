import { useState, useEffect } from 'react'
import { Plus, ScrollText } from 'lucide-react'
import { useRestaurant } from '@/modules/menu/hooks/useRestaurant'
import { useQuoteTemplates } from '../hooks/useQuoteTemplates'
import { QuoteTemplateCard } from '../components/quotes/QuoteTemplateCard'
import { CreateQuoteTemplateDrawer } from '../components/quotes/CreateQuoteTemplateDrawer'
import type { QuoteTemplate } from '../quotes/quoteTypes'

export function ServicesPresupuestosPage() {
  const { restaurant } = useRestaurant()
  const hook           = useQuoteTemplates(restaurant?.id)

  const [showCreate, setShowCreate] = useState(false)
  const [editTpl,    setEditTpl]    = useState<QuoteTemplate | null>(null)

  useEffect(() => {
    hook.fetch()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant?.id])

  const handleSave = async (input: Omit<QuoteTemplate, 'id' | 'restaurant_id' | 'created_at' | 'updated_at'>) => {
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
          <h1 className="text-lg font-bold text-white">Presupuestos</h1>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Plantillas reutilizables para crear cotizaciones y propuestas
          </p>
        </div>
        <button
          onClick={() => { setEditTpl(null); setShowCreate(true) }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
          style={{ background: '#F4705A', color: '#fff' }}
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nueva plantilla</span>
        </button>
      </div>

      {/* Metrics (preparados — sin datos reales todavía) */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Plantillas',  value: hook.templates.length > 0 ? hook.templates.length : '—' },
          { label: 'Pendientes',  value: '—' },
          { label: 'Conversión',  value: '—' },
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
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div
            className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4"
            style={{ background: 'rgba(244,112,90,0.08)', border: '1px solid rgba(244,112,90,0.15)' }}
          >
            <ScrollText className="w-7 h-7" style={{ color: 'rgba(244,112,90,0.5)' }} />
          </div>
          <p className="text-sm font-semibold text-white mb-1">Sin plantillas creadas</p>
          <p className="text-xs mb-5 max-w-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Creá tu primera plantilla para empezar a generar cotizaciones y cerrar ventas más rápido.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: '#F4705A', color: '#fff' }}
          >
            Crear primera plantilla
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {hook.templates.map(t => (
            <QuoteTemplateCard
              key={t.id}
              template={t}
              onEdit={tpl => { setEditTpl(tpl); setShowCreate(true) }}
              onArchive={id => hook.archive(id)}
            />
          ))}
        </div>
      )}

      <CreateQuoteTemplateDrawer
        open={showCreate}
        template={editTpl}
        onClose={() => { setShowCreate(false); setEditTpl(null) }}
        defaultCurrency={restaurant?.default_currency ?? 'ARS'}
        onSave={handleSave}
      />
    </div>
  )
}
