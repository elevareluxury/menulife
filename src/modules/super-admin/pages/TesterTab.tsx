import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const CARD = {
  background: '#0A0D12',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '16px',
  padding: '28px 32px',
  marginBottom: '24px',
}

const LABEL_STYLE = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 600,
  color: 'rgba(255,255,255,0.5)',
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
  marginBottom: '8px',
}

const SELECT_STYLE = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '10px',
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.04)',
  color: '#F5F7FA',
  fontSize: '14px',
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box' as const,
  cursor: 'pointer',
}

const BTN = {
  padding: '10px 24px',
  borderRadius: '10px',
  border: 'none',
  background: '#FF6B7A',
  color: '#fff',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
}

type Restaurant = { id: string; name: string; slug?: string }

export function TesterTab() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [selected, setSelected] = useState<string>('')
  const [configId, setConfigId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  const [previewSlug, setPreviewSlug] = useState<string>('')

  useEffect(() => {
    void loadData()
  }, [])

  async function loadData() {
    const [{ data: rests }, { data: cfg }] = await Promise.all([
      (supabase as any).from('restaurants').select('id, name, slug').order('name'),
      (supabase as any).from('site_config').select('id, tester_restaurant_id').limit(1).maybeSingle(),
    ])
    if (rests) setRestaurants(rests as Restaurant[])
    if (cfg?.tester_restaurant_id) {
      setSelected(cfg.tester_restaurant_id)
      setConfigId(cfg.id)
      const r = (rests as Restaurant[])?.find(x => x.id === cfg.tester_restaurant_id)
      if (r?.slug) setPreviewSlug(r.slug)
    }
  }

  async function handleSave() {
    setSaving(true)
    setSavedMsg('')
    const payload = { tester_restaurant_id: selected || null }
    const { error } = configId
      ? await (supabase as any).from('site_config').update(payload).eq('id', configId)
      : await (supabase as any).from('site_config').insert(payload)
    setSaving(false)
    if (error) {
      setSavedMsg('❌ ' + ((error as any).message ?? 'Error'))
    } else {
      setSavedMsg('✅ Guardado')
      const r = restaurants.find(x => x.id === selected)
      if (r?.slug) setPreviewSlug(r.slug)
    }
  }

  return (
    <div style={{ maxWidth: '720px' }}>
      <h1 style={{ fontWeight: 700, fontSize: '22px', color: '#F5F7FA', marginBottom: '8px' }}>
        🧪 Tester
      </h1>
      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '32px' }}>
        Seleccioná el restaurante que aparece en el iframe de la landing page.
      </p>

      <div style={CARD}>
        <div style={{ marginBottom: '20px' }}>
          <label style={LABEL_STYLE}>Restaurante tester</label>
          <select
            style={SELECT_STYLE}
            value={selected}
            onChange={e => setSelected(e.target.value)}
          >
            <option value="">— Sin seleccionar —</option>
            {restaurants.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button style={BTN} onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
          {savedMsg && (
            <span style={{ fontSize: '13px', color: savedMsg.startsWith('✅') ? '#4ade80' : '#f87171' }}>
              {savedMsg}
            </span>
          )}
        </div>
      </div>

      {previewSlug && (
        <div style={CARD}>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '12px' }}>
            Preview del iframe — <code style={{ color: '#FF6B7A' }}>/r/{previewSlug}</code>
          </p>
          <div style={{
            width: '280px', height: '500px', borderRadius: '28px',
            border: '6px solid #2a2a2a', overflow: 'hidden', background: '#000',
          }}>
            <iframe
              src={`/r/${previewSlug}`}
              style={{ width: '100%', height: '100%', border: 'none' }}
              title="Preview"
            />
          </div>
        </div>
      )}
    </div>
  )
}
