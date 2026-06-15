import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { useQuotes } from '../../hooks/useQuotes'
import { useQuoteTemplates } from '../../hooks/useQuoteTemplates'
import { QuoteCard } from './QuoteCard'
import { CreateQuoteDrawer } from './CreateQuoteDrawer'
import type { QuoteStatus } from '../../quotes/quoteTypes'
import type { ServiceCustomer } from '../../types/customer'

interface CustomerQuotesSectionProps {
  customer:         ServiceCustomer
  restaurantId:     string
  defaultCurrency?: string
}

export function CustomerQuotesSection({ customer, restaurantId, defaultCurrency }: CustomerQuotesSectionProps) {
  const quoteHook    = useQuotes(restaurantId)
  const templateHook = useQuoteTemplates(restaurantId)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    quoteHook.fetchByCustomer(customer.id)
    templateHook.fetch()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer.id, restaurantId])

  const activeCount = quoteHook.quotes.filter(q =>
    ['sent', 'viewed'].includes(q.status)
  ).length

  const handleCreated = () => {
    setShowCreate(false)
    quoteHook.fetchByCustomer(customer.id)
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
          <h2 className="text-sm font-bold text-white">Cotizaciones</h2>
          {activeCount > 0 && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(59,130,246,0.12)', color: '#3B82F6' }}
            >
              {activeCount} pendiente{activeCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
          style={{ background: '#F4705A', color: '#fff' }}
        >
          <Plus className="w-3.5 h-3.5" />
          Nueva
        </button>
      </div>

      <div className="p-4 space-y-3">
        {quoteHook.loading ? (
          <div className="flex justify-center py-8">
            <div
              className="w-5 h-5 border-2 rounded-full animate-spin"
              style={{ borderColor: 'rgba(255,255,255,0.08)', borderTopColor: '#F4705A' }}
            />
          </div>
        ) : quoteHook.quotes.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Sin cotizaciones
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="text-xs font-semibold mt-2"
              style={{ color: '#F4705A' }}
            >
              + Crear cotización
            </button>
          </div>
        ) : (
          quoteHook.quotes.map(quote => (
            <QuoteCard
              key={quote.id}
              quote={quote}
              onChangeStatus={(id, status: QuoteStatus) => quoteHook.updateStatus(id, status)}
            />
          ))
        )}
      </div>

      <CreateQuoteDrawer
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleCreated}
        customer={customer}
        templates={templateHook.templates}
        onCreate={quoteHook.create}
        defaultCurrency={defaultCurrency}
      />
    </div>
  )
}
