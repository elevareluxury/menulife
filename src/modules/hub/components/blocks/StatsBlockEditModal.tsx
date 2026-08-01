import { useState } from 'react'
import { X, BarChart3, Plus, Trash2 } from 'lucide-react'
import { validateBlockConfig } from '@/modules/hub/lib/blocksConfig'

const ACC = '#F4705A'
const inputCls = 'w-full rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 bg-[#0F1115] border border-gray-800 focus:outline-none focus:border-[#F4705A] transition-all'

interface StatItem {
  value: string
  label: string
  icon?: string
}

interface StatsBlockEditModalProps {
  config: { items?: StatItem[] }
  onSave: (config: Record<string, any>) => Promise<void>
  onClose: () => void
}

const EMPTY_ITEM: StatItem = { value: '', label: '' }

export function StatsBlockEditModal({ config, onSave, onClose }: StatsBlockEditModalProps) {
  const [items, setItems] = useState<StatItem[]>(
    config.items?.length ? config.items : [{ ...EMPTY_ITEM }],
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updateItem(idx: number, field: keyof StatItem, val: string) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: val } : it))
    setError(null)
  }

  function addItem() {
    if (items.length >= 4) return
    setItems(prev => [...prev, { ...EMPTY_ITEM }])
  }

  function removeItem(idx: number) {
    if (items.length <= 1) return
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleSave() {
    const cleaned = items
      .filter(it => it.value.trim() && it.label.trim())
      .map(it => ({ value: it.value.trim(), label: it.label.trim() }))

    const newConfig = { items: cleaned }
    const validation = validateBlockConfig('stats', newConfig)
    if (!validation.success) {
      setError(validation.error ?? 'Configuración inválida')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave(validation.data)
      onClose()
    } catch {
      setError('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div style={{
        width: '100%', maxWidth: 500,
        background: '#161A24', borderRadius: '24px 24px 0 0',
        border: '1px solid rgba(255,255,255,0.08)',
        padding: 24, maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'rgba(244,112,90,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <BarChart3 size={18} color={ACC} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ color: '#fff', fontWeight: 700, fontSize: 16, margin: 0 }}>Estadísticas</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: 0 }}>
              Hasta 4 números destacados
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
          {items.map((item, idx) => (
            <div key={idx} style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16, padding: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontFamily: 'monospace' }}>
                  #{idx + 1}
                </span>
                {items.length > 1 && (
                  <button onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 4 }}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                    Valor
                  </label>
                  <input
                    className={inputCls}
                    placeholder="10+"
                    value={item.value}
                    onChange={e => updateItem(idx, 'value', e.target.value)}
                    maxLength={20}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                    Descripción
                  </label>
                  <input
                    className={inputCls}
                    placeholder="años de experiencia"
                    value={item.label}
                    onChange={e => updateItem(idx, 'label', e.target.value)}
                    maxLength={60}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {items.length < 4 && (
          <button
            onClick={addItem}
            style={{
              width: '100%', padding: '10px', borderRadius: 14,
              background: 'rgba(244,112,90,0.08)',
              border: '1px dashed rgba(244,112,90,0.35)',
              color: ACC, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              marginBottom: 16,
            }}
          >
            <Plus size={16} />
            Agregar estadística
          </button>
        )}

        {error && (
          <p style={{ color: '#EF4444', fontSize: 13, marginBottom: 16 }}>{error}</p>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '12px', borderRadius: 14,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 2, padding: '12px', borderRadius: 14,
              background: ACC, border: 'none',
              color: '#fff', fontSize: 14, fontWeight: 700, cursor: saving ? 'wait' : 'pointer',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
