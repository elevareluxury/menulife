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

const INPUT_STYLE = {
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
}

const SELECT_STYLE = {
  ...INPUT_STYLE,
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
  transition: 'opacity 0.15s',
}

type SiteConfig = {
  id?: string
  demo_link: string
  contact_link: string
  tester_restaurant_id: string | null
}

type Restaurant = { id: string; name: string }

export function LandingConfigTab() {
  const [cfg, setCfg] = useState<SiteConfig>({
    demo_link: 'mailto:contacto@menulife.digital',
    contact_link: 'mailto:contacto@menulife.digital',
    tester_restaurant_id: null,
  })
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  useEffect(() => {
    void loadConfig()
    void loadRestaurants()
  }, [])

  async function loadConfig() {
    const { data } = await (supabase as any).from('site_config').select('*').limit(1).maybeSingle()
    if (data) setCfg(data as SiteConfig)
  }

  async function loadRestaurants() {
    const { data } = await (supabase as any)
      .from('restaurants')
      .select('id, name')
      .order('name')
    if (data) setRestaurants(data as Restaurant[])
  }

  async function handleSave() {
    setSaving(true)
    setSavedMsg('')
    const payload = {
      demo_link: cfg.demo_link,
      contact_link: cfg.contact_link,
      tester_restaurant_id: cfg.tester_restaurant_id || null,
    }

    const { error } = cfg.id
      ? await (supabase as any).from('site_config').update(payload).eq('id', cfg.id)
      : await (supabase as any).from('site_config').insert(payload)

    setSaving(false)
    if (error) {
      setSavedMsg('❌ ' + ((error as any).message ?? 'Error al guardar'))
    } else {
      setSavedMsg('✅ Guardado')
      await loadConfig()
    }
  }

  return (
    <div style={{ maxWidth: '720px' }}>
      <h1 style={{ fontWeight: 700, fontSize: '22px', color: '#F5F7FA', marginBottom: '8px' }}>
        Landing Config
      </h1>
      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '32px' }}>
        Configuración global de la landing page.
      </p>

      {/* Links */}
      <div style={CARD}>
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#F5F7FA', marginBottom: '20px' }}>
          Links de contacto
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={LABEL_STYLE}>Demo link</label>
            <input
              style={INPUT_STYLE}
              value={cfg.demo_link}
              onChange={e => setCfg(p => ({ ...p, demo_link: e.target.value }))}
              placeholder="mailto:contacto@menulife.digital"
            />
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>
              Usado en el botón "Reservar demo" del Hero y CTA final.
            </p>
          </div>
          <div>
            <label style={LABEL_STYLE}>Contact link</label>
            <input
              style={INPUT_STYLE}
              value={cfg.contact_link}
              onChange={e => setCfg(p => ({ ...p, contact_link: e.target.value }))}
              placeholder="mailto:contacto@menulife.digital"
            />
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>
              Usado en Navbar y footer.
            </p>
          </div>
        </div>
      </div>

      {/* Tester restaurant */}
      <div style={CARD}>
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#F5F7FA', marginBottom: '8px' }}>
          🧪 Restaurante tester
        </h2>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '20px' }}>
          El restaurante cuyo menú se muestra en el iframe del Hero de la landing.
          La ruta del iframe es <code style={{ color: '#FF6B7A' }}>/r/[slug]</code>.
        </p>
        <div>
          <label style={LABEL_STYLE}>Restaurante</label>
          <select
            style={SELECT_STYLE}
            value={cfg.tester_restaurant_id ?? ''}
            onChange={e => setCfg(p => ({ ...p, tester_restaurant_id: e.target.value || null }))}
          >
            <option value="">— Sin seleccionar —</option>
            {restaurants.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button style={BTN} onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
        {savedMsg && (
          <span style={{ fontSize: '13px', color: savedMsg.startsWith('✅') ? '#4ade80' : '#f87171' }}>
            {savedMsg}
          </span>
        )}
      </div>
    </div>
  )
}
