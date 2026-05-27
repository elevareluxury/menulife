import { useState } from 'react'
import { Button } from '@/components/ui/Button'

export type QuickRange = 'today' | 'yesterday' | '7d' | '30d' | 'custom'

interface DateRangePickerProps {
  desde: Date
  hasta: Date
  onChange: (desde: Date, hasta: Date) => void
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function toInput(d: Date) {
  return d.toISOString().slice(0, 10)
}

function fromInput(s: string) {
  const [y, m, day] = s.split('-').map(Number)
  return new Date(y, m - 1, day)
}

export function DateRangePicker({ desde, hasta, onChange }: DateRangePickerProps) {
  const [active, setActive] = useState<QuickRange>('today')
  const [customDesde, setCustomDesde] = useState(toInput(desde))
  const [customHasta, setCustomHasta] = useState(toInput(hasta))

  const pick = (range: QuickRange) => {
    setActive(range)
    const now = startOfDay(new Date())
    if (range === 'today')     return onChange(now, now)
    if (range === 'yesterday') { const y = new Date(now.getTime() - 86400000); return onChange(y, y) }
    if (range === '7d')        return onChange(new Date(now.getTime() - 6 * 86400000), now)
    if (range === '30d')       return onChange(new Date(now.getTime() - 29 * 86400000), now)
  }

  const applyCustom = () => {
    const d = fromInput(customDesde)
    const h = fromInput(customHasta)
    if (isNaN(d.getTime()) || isNaN(h.getTime()) || d > h) return
    const diffDays = (h.getTime() - d.getTime()) / 86400000
    if (diffDays > 90) return
    onChange(d, h)
  }

  const RANGES: { id: QuickRange; label: string }[] = [
    { id: 'today',     label: 'Hoy' },
    { id: 'yesterday', label: 'Ayer' },
    { id: '7d',        label: '7 días' },
    { id: '30d',       label: '30 días' },
    { id: 'custom',    label: 'Custom' },
  ]

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 flex-wrap">
        {RANGES.map(r => (
          <button
            key={r.id}
            onClick={() => pick(r.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              active === r.id
                ? 'bg-[#FF6B7A] text-white shadow-sm'
                : 'bg-white/8 text-gray-400 hover:text-gray-200 border border-white/10'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {active === 'custom' && (
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Desde</label>
            <input
              type="date"
              value={customDesde}
              max={customHasta}
              onChange={e => setCustomDesde(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm bg-white/8 border border-white/10 text-gray-200 outline-none focus:border-[#FF6B7A]"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Hasta</label>
            <input
              type="date"
              value={customHasta}
              min={customDesde}
              max={toInput(new Date())}
              onChange={e => setCustomHasta(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm bg-white/8 border border-white/10 text-gray-200 outline-none focus:border-[#FF6B7A]"
            />
          </div>
          <Button size="sm" onClick={applyCustom}>Aplicar</Button>
        </div>
      )}
    </div>
  )
}
