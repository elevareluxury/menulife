import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useTerminologyStore } from '@/store/terminologyStore'
import { TERMINOLOGY_PRESETS } from '@/modules/services/terminology/presets'
import { TERM_META, DEFAULT_TERMS, resolveTerms } from '@/modules/services/terminology/defaults'
import type { TerminologyTerms } from '@/modules/services/terminology/types'
import toast from 'react-hot-toast'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

interface TerminologiaTabProps {
  restaurantId: string
}

export function TerminologiaTab({ restaurantId }: TerminologiaTabProps) {
  const storeTerms   = useTerminologyStore(s => s.terms)
  const storePreset  = useTerminologyStore(s => s.preset)
  const setTerminology = useTerminologyStore(s => s.setTerminology)

  const [selectedPreset, setSelectedPreset] = useState<string>(storePreset ?? 'default')
  const [customTerms, setCustomTerms] = useState<Partial<TerminologyTerms>>(storeTerms)
  const [saving, setSaving] = useState(false)

  // Sync from store when it loads (first time)
  useEffect(() => {
    setSelectedPreset(storePreset ?? 'default')
    setCustomTerms(storeTerms)
  }, [storePreset, storeTerms])

  function applyPreset(presetId: string) {
    const preset = TERMINOLOGY_PRESETS.find(p => p.id === presetId)
    if (!preset) return
    setSelectedPreset(presetId)
    setCustomTerms(presetId === 'default' ? {} : { ...preset.terms })
  }

  function updateTerm(key: keyof TerminologyTerms, form: 'singular' | 'plural', value: string) {
    setCustomTerms(prev => {
      const current = prev[key] ?? DEFAULT_TERMS[key]
      return { ...prev, [key]: { ...current, [form]: value } }
    })
    if (selectedPreset !== 'default') setSelectedPreset('custom')
  }

  async function handleSave() {
    setSaving(true)
    try {
      const termsToSave = selectedPreset === 'default' ? {} : customTerms
      const { error } = await db
        .from('service_terminology')
        .upsert(
          { restaurant_id: restaurantId, preset: selectedPreset, terms: termsToSave },
          { onConflict: 'restaurant_id' },
        )

      if (error) throw error

      setTerminology(termsToSave, selectedPreset)
      toast.success('Terminología guardada')
    } catch {
      toast.error('No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  const resolved = resolveTerms(customTerms)

  return (
    <div className="space-y-6">

      {/* Preset grid */}
      <div
        className="rounded-2xl p-5"
        style={{ backgroundColor: '#1c1f26', border: '1px solid #2a2d35' }}
      >
        <p className="text-sm font-bold text-white mb-1">Tipo de industria</p>
        <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Elegí un preset para adaptar el vocabulario a tu negocio de un click.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TERMINOLOGY_PRESETS.map(preset => {
            const isSelected = selectedPreset === preset.id
            return (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset.id)}
                className="flex flex-col items-start gap-1.5 p-3 rounded-xl text-left transition-all"
                style={{
                  backgroundColor: isSelected ? 'rgba(244,112,90,0.1)' : 'rgba(255,255,255,0.03)',
                  border: `1.5px solid ${isSelected ? '#F4705A' : 'rgba(255,255,255,0.08)'}`,
                }}
              >
                <span className="text-xl leading-none">{preset.emoji}</span>
                <div>
                  <p
                    className="text-xs font-semibold leading-tight"
                    style={{ color: isSelected ? '#F4705A' : 'rgba(255,255,255,0.8)' }}
                  >
                    {preset.label}
                  </p>
                  <p className="text-[10px] mt-0.5 leading-tight" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {preset.description}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Term editors */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: '1px solid #2a2d35' }}
      >
        <div
          className="px-5 py-3.5"
          style={{ backgroundColor: '#1c1f26', borderBottom: '1px solid #2a2d35' }}
        >
          <p className="text-sm font-bold text-white">Personalización por concepto</p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Ajustá los términos individuales para tu negocio.
          </p>
        </div>

        <div style={{ backgroundColor: '#161920' }}>
          {TERM_META.map((meta, idx) => {
            const pair = resolved[meta.key]
            const isCustom = customTerms[meta.key] !== undefined
            return (
              <div
                key={meta.key}
                className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                style={{
                  borderTop: idx > 0 ? '1px solid rgba(255,255,255,0.04)' : undefined,
                }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white">{pair.plural}</p>
                    {isCustom && (
                      <span
                        className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: 'rgba(244,112,90,0.15)', color: '#F4705A' }}
                      >
                        editado
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {meta.description}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      Singular
                    </label>
                    <input
                      type="text"
                      value={pair.singular}
                      onChange={e => updateTerm(meta.key, 'singular', e.target.value)}
                      placeholder={DEFAULT_TERMS[meta.key].singular}
                      className="w-28 rounded-lg px-2.5 py-1.5 text-sm font-medium text-white transition-all outline-none"
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = 'rgba(244,112,90,0.5)' }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      Plural
                    </label>
                    <input
                      type="text"
                      value={pair.plural}
                      onChange={e => updateTerm(meta.key, 'plural', e.target.value)}
                      placeholder={DEFAULT_TERMS[meta.key].plural}
                      className="w-28 rounded-lg px-2.5 py-1.5 text-sm font-medium text-white transition-all outline-none"
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = 'rgba(244,112,90,0.5)' }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end gap-3">
        <button
          onClick={() => { applyPreset('default') }}
          className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
          style={{
            backgroundColor: 'rgba(255,255,255,0.05)',
            color: 'rgba(255,255,255,0.5)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          Restablecer
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
          style={{ backgroundColor: '#F4705A' }}
        >
          {saving ? 'Guardando…' : 'Guardar terminología'}
        </button>
      </div>
    </div>
  )
}
