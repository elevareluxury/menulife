import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { setSiteFlagsLocal, useSiteFlags } from '@/lib/siteFlags'

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
}

export function LandingConfigTab() {
  const [cfg, setCfg] = useState<SiteConfig>({
    demo_link: 'mailto:contacto@menulife.digital',
    contact_link: 'mailto:contacto@menulife.digital',
  })
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  useEffect(() => {
    void loadConfig()
  }, [])

  async function loadConfig() {
    const { data } = await (supabase as any).from('site_config').select('id, demo_link, contact_link').limit(1).maybeSingle()
    if (data) setCfg(data as SiteConfig)
  }

  async function handleSave() {
    setSaving(true)
    setSavedMsg('')
    const payload = {
      demo_link: cfg.demo_link,
      contact_link: cfg.contact_link,
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

      <BusinessSwitch />

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

// Mostrar u ocultar Mycen Business en la landing (sección, precios, menú y preguntas). Se aplica enseguida, sin publicar.
function BusinessSwitch() {
  const { business } = useSiteFlags()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function toggle() {
    setBusy(true)
    setError('')
    const { data, error: err } = await (supabase as any).rpc('admin_set_site_flag', { p_key: 'business', p_enabled: !business })
    setBusy(false)
    if (err || !data) setError('No se pudo cambiar. ¿Aplicaste el SQL de interruptores?')
    else setSiteFlagsLocal({ business: (data as { business?: boolean }).business === true })
  }

  return (
    <div style={CARD}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#F5F7FA', margin: '0 0 6px' }}>Mycen Business en la landing</h2>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
            {business
              ? 'Visible: se ven la sección de Business, los precios y sus preguntas.'
              : 'Oculto: la landing muestra sólo la identidad y Life OS. Quien ya tiene un negocio lo sigue usando igual.'}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={business}
          aria-label="Mostrar Mycen Business en la landing"
          onClick={toggle}
          disabled={busy}
          style={{
            flexShrink: 0, width: '52px', height: '30px', borderRadius: '999px', border: 'none', padding: '3px',
            background: business ? '#4ade80' : 'rgba(255,255,255,0.15)', cursor: busy ? 'wait' : 'pointer',
            display: 'flex', justifyContent: business ? 'flex-end' : 'flex-start', transition: 'background 0.15s',
          }}
        >
          <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#fff', display: 'block' }} />
        </button>
      </div>
      {error && <p role="alert" style={{ fontSize: '13px', color: '#f87171', margin: '12px 0 0' }}>{error}</p>}
    </div>
  )
}
