import { useState, useEffect, useRef } from 'react'

declare const gsap: any

/* ─────────────────────────────────────────────
   DATOS DEL MENÚ INTERACTIVO
───────────────────────────────────────────── */
type MenuItem = { id: string; emoji: string; name: string; desc: string; price: number }
const MENU: Record<string, MenuItem[]> = {
  pastas: [
    { id: 'carbonara',  emoji: '🍝', name: 'Pasta Carbonara', desc: 'Panceta, parmesano, huevo', price: 18 },
    { id: 'risotto',    emoji: '🍋', name: 'Risotto Limone',  desc: 'Limón, albahaca, crema',   price: 22 },
    { id: 'tagliata',   emoji: '🥩', name: 'Tagliata',        desc: 'Rúcula, parmesano, cherry', price: 34 },
  ],
  carnes: [
    { id: 'bife',  emoji: '🥩', name: 'Bife de Chorizo', desc: 'Con papas rústicas',  price: 42 },
    { id: 'pollo', emoji: '🍗', name: 'Pollo al Limón',  desc: 'Con ensalada verde',  price: 28 },
  ],
  postres: [
    { id: 'tiramisu',   emoji: '🍮', name: 'Tiramisú',    desc: 'Clásico italiano',   price: 12 },
    { id: 'pannacotta', emoji: '🍦', name: 'Panna Cotta', desc: 'Con frutos rojos',   price: 10 },
  ],
  bebidas: [
    { id: 'agua', emoji: '🥤', name: 'Agua mineral',    desc: '', price: 4  },
    { id: 'vino', emoji: '🍷', name: 'Vino de la casa', desc: '', price: 15 },
    { id: 'cafe', emoji: '☕', name: 'Café espresso',   desc: '', price: 5  },
  ],
}
type Tab = keyof typeof MENU
const TABS: Tab[] = ['pastas', 'carnes', 'postres', 'bebidas']
const TAB_LABELS: Record<Tab, string> = { pastas: 'Pastas', carnes: 'Carnes', postres: 'Postres', bebidas: 'Bebidas' }

/* ─────────────────────────────────────────────
   SECCIÓN PRINCIPAL
───────────────────────────────────────────── */
export function ExperiencesSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (typeof gsap === 'undefined') return
    const ST = (window as any).ScrollTrigger
    if (!ST) return

    gsap.fromTo('[data-exp-title]',
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out',
        scrollTrigger: { trigger: '[data-exp-title]', start: 'top 85%' } })

    gsap.fromTo('[data-exp-card]',
      { opacity: 0, y: 60 },
      { opacity: 1, y: 0, duration: 0.75, ease: 'power3.out', stagger: 0.15,
        scrollTrigger: { trigger: '[data-exp-card]', start: 'top 85%' } })
  }, [])

  return (
    <section ref={sectionRef} style={{
      background: 'var(--ml-off-white)',
      padding: '96px 24px',
    }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        {/* Header */}
        <div data-exp-title style={{ textAlign: 'center', marginBottom: '72px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--ml-salmon)', fontFamily: 'var(--font-jakarta)', marginBottom: '12px' }}>
            PLATAFORMA
          </p>
          <h2 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 'clamp(36px,5vw,56px)', color: '#1a1a1a', lineHeight: 1.1, margin: 0 }}>
            Una plataforma.{' '}
            <em style={{ color: 'var(--ml-salmon)', fontStyle: 'italic' }}>Tres experiencias.</em>
          </h2>
        </div>

        {/* Cards grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px',
        }}>
          <ExperienceCard data-exp-card index={0} role="— EXPERIENCIA DEL CLIENTE" title="Escanear. Pedir. Listo.">
            <InteractiveMenu />
          </ExperienceCard>

          <ExperienceCard data-exp-card index={1} role="— EXPERIENCIA DEL MOZO" title="Tu equipo lo aprende en minutos.">
            <WaiterMockup />
            <WaiterFeatures />
          </ExperienceCard>

          <ExperienceCard data-exp-card index={2} role="— EXPERIENCIA DEL DUEÑO" title="Control total.">
            <DashboardMockup />
          </ExperienceCard>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   CARD WRAPPER
───────────────────────────────────────────── */
function ExperienceCard({ children, role, title, index, ...rest }: {
  children: React.ReactNode; role: string; title: string; index: number
  [k: string]: any
}) {
  const cardRef = useRef<HTMLDivElement>(null)

  return (
    <div
      ref={cardRef}
      {...rest}
      style={{
        background:     'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(10px)',
        border:         '1px solid rgba(255,255,255,0.95)',
        borderRadius:   '24px',
        boxShadow:      '0 20px 60px rgba(0,0,0,0.07)',
        overflow:       'hidden',
        transition:     'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease',
        display:        'flex',
        flexDirection:  'column',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform  = 'translateY(-8px) scale(1.01)'
        e.currentTarget.style.boxShadow  = '0 30px 80px rgba(0,0,0,0.11)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform  = ''
        e.currentTarget.style.boxShadow  = '0 20px 60px rgba(0,0,0,0.07)'
      }}
    >
      {children}
      <div style={{ padding: '20px 24px 24px' }}>
        <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--ml-salmon)', fontFamily: 'var(--font-jakarta)', marginBottom: '6px' }}>
          {role}
        </p>
        <h3 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: '22px', color: '#1a1a1a', margin: 0, lineHeight: 1.2 }}>
          {title}
        </h3>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   CARD 1 — MENÚ INTERACTIVO
───────────────────────────────────────────── */
function InteractiveMenu() {
  const [tab,  setTab]  = useState<Tab>('pastas')
  const [cart, setCart] = useState<Record<string, number>>({})

  const add = (id: string) => setCart(p => ({ ...p, [id]: (p[id] || 0) + 1 }))
  const sub = (id: string) => setCart(p => {
    const next = { ...p, [id]: Math.max(0, (p[id] || 0) - 1) }
    if (next[id] === 0) delete next[id]
    return next
  })

  const allItems = Object.values(MENU).flat()
  const total = Object.entries(cart).reduce((s, [id, qty]) => {
    const item = allItems.find(i => i.id === id)
    return s + (item ? item.price * qty : 0)
  }, 0)
  const hasCart = total > 0

  return (
    <div style={{
      background:   '#0F1115',
      borderRadius: '16px 16px 0 0',
      overflow:     'hidden',
      margin:       '0',
      height:       '380px',
      display:      'flex',
      flexDirection:'column',
      position:     'relative',
    }}>
      {/* Notch */}
      <div style={{ height: '6px', background: '#0a0c10', flexShrink: 0 }} />

      {/* Menu header */}
      <div style={{ background: '#0F1115', padding: '10px 14px 8px', flexShrink: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-syne)' }}>La Trattoria</div>
        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-jakarta)' }}>Menú digital · Mesa 5</div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '6px', padding: '8px 12px', background: '#13161c', flexShrink: 0, overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding:      '5px 12px',
            borderRadius: '50px',
            border:       tab === t ? 'none' : '1px solid rgba(255,255,255,0.15)',
            background:   tab === t ? 'var(--ml-salmon)' : 'transparent',
            color:        tab === t ? '#fff' : 'rgba(255,255,255,0.55)',
            fontSize:     '11px', fontWeight: 600,
            cursor:       'pointer', whiteSpace: 'nowrap',
            fontFamily:   'var(--font-jakarta)',
            transition:   'all 0.18s',
            flexShrink:   0,
          }}>{TAB_LABELS[t]}</button>
        ))}
      </div>

      {/* Items */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        {MENU[tab].map(item => (
          <div key={item.id} style={{
            display:      'flex', alignItems: 'center',
            padding:      '10px 14px',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
            gap:          '10px',
          }}>
            <span style={{ fontSize: '20px', flexShrink: 0 }}>{item.emoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#fff', fontFamily: 'var(--font-jakarta)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
              {item.desc && <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.38)', fontFamily: 'var(--font-jakarta)' }}>{item.desc}</div>}
            </div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ml-salmon)', flexShrink: 0, fontFamily: 'var(--font-jakarta)' }}>${item.price}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              <button onClick={() => sub(item.id)} style={{
                width: '24px', height: '24px', borderRadius: '50%',
                border: '1px solid rgba(255,255,255,0.2)', background: 'transparent',
                color: '#fff', fontSize: '14px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                transition: 'all 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--ml-salmon)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'}
              >−</button>
              <span style={{ width: '18px', textAlign: 'center', fontSize: '12px', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-jakarta)' }}>
                {cart[item.id] || 0}
              </span>
              <button onClick={() => add(item.id)} style={{
                width: '24px', height: '24px', borderRadius: '50%',
                border: 'none', background: 'var(--ml-salmon)',
                color: '#fff', fontSize: '14px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                transition: 'all 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--ml-salmon-light)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--ml-salmon)'}
              >+</button>
            </div>
          </div>
        ))}
      </div>

      {/* Cart footer — slide up when items exist */}
      <div style={{
        position:   'absolute', bottom: 0, left: 0, right: 0,
        padding:    '12px',
        transform:  hasCart ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        zIndex:     10,
      }}>
        <div style={{
          background: 'var(--ml-salmon)', borderRadius: '50px',
          padding: '12px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer',
        }}>
          <span style={{ color: '#fff', fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-jakarta)' }}>
            Ver carrito →
          </span>
          <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-jakarta)' }}>
            ${total.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   CARD 2 — MOZO
───────────────────────────────────────────── */
const WAITER_STATES = [
  {
    title: 'Vista de mesas',
    content: (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
        {[
          { n: 1, st: 'Libre',            c: '#10B981' },
          { n: 2, st: 'Ocupada · 2p',     c: '#F4705A' },
          { n: 3, st: 'Ocupada · 4p',     c: '#F4705A' },
          { n: 4, st: 'Esp. pago',         c: '#F59E0B' },
          { n: 5, st: 'Ocupada · 3p',     c: '#F4705A' },
          { n: 6, st: 'Libre',            c: '#10B981' },
        ].map(m => (
          <div key={m.n} style={{
            background:   `${m.c}18`,
            border:       `1px solid ${m.c}44`,
            borderRadius: '10px', padding: '8px 6px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '16px', fontWeight: 800, color: m.c, fontFamily: 'var(--font-syne)' }}>{m.n}</div>
            <div style={{ fontSize: '9px', color: m.c, fontFamily: 'var(--font-jakarta)', lineHeight: 1.3, marginTop: '2px' }}>{m.st}</div>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: 'Mesa 3 — Pedido activo',
    content: (
      <div>
        {[['Pasta Carbonara','x2','$36'],['Risotto Limone','x1','$22'],['Vino de la casa','x2','$30']].map(([name, qty, price]) => (
          <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '12px', fontFamily: 'var(--font-jakarta)' }}>{name} <span style={{ color: 'rgba(255,255,255,0.35)' }}>{qty}</span></span>
            <span style={{ color: 'var(--ml-salmon)', fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-jakarta)' }}>{price}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', fontWeight: 700 }}>
          <span style={{ color: '#fff', fontFamily: 'var(--font-jakarta)', fontSize: '13px' }}>Total</span>
          <span style={{ color: 'var(--ml-salmon)', fontFamily: 'var(--font-jakarta)', fontSize: '13px' }}>$88</span>
        </div>
        <button style={{ width: '100%', marginTop: '12px', padding: '10px', background: 'var(--ml-salmon)', border: 'none', borderRadius: '50px', color: '#fff', fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>
          Enviar a cocina
        </button>
      </div>
    ),
  },
  {
    title: '🔔 ¡Pedido listo!',
    content: (
      <div style={{ textAlign: 'center', paddingTop: '8px' }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>🍽️</div>
        <div style={{ color: '#fff', fontSize: '14px', fontWeight: 700, fontFamily: 'var(--font-syne)', marginBottom: '6px' }}>Mesa 2 — Tagliata</div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontFamily: 'var(--font-jakarta)', marginBottom: '16px' }}>Retiro de cocina</div>
        <button style={{ padding: '10px 24px', background: '#10B981', border: 'none', borderRadius: '50px', color: '#fff', fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>
          Confirmar entrega ✓
        </button>
      </div>
    ),
  },
]

function WaiterMockup() {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const iv = setInterval(() => setIdx(p => (p + 1) % 3), 3200)
    return () => clearInterval(iv)
  }, [])

  const state = WAITER_STATES[idx]

  return (
    <div style={{ background: '#161a22', padding: '16px', margin: '0', minHeight: '240px', position: 'relative', overflow: 'hidden' }}>
      {/* Phone shell */}
      <div style={{
        background: '#0F1115', borderRadius: '16px', padding: '14px',
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{
          fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.5)',
          fontFamily: 'var(--font-jakarta)', marginBottom: '12px',
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <span style={{ color: '#fff' }}>MenuLife</span>
          <span style={{ background: 'var(--ml-salmon)', color: '#fff', borderRadius: '4px', padding: '1px 6px', fontSize: '8px' }}>MOZO</span>
        </div>

        <div style={{
          fontSize: '11px', fontWeight: 600, color: 'var(--ml-salmon)',
          fontFamily: 'var(--font-jakarta)', marginBottom: '10px',
        }}>{state.title}</div>

        <div style={{ animation: `ml-fade-up 0.35s ease both` }}>
          {state.content}
        </div>
      </div>

      {/* State dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '12px' }}>
        {[0,1,2].map(i => (
          <div key={i} onClick={() => setIdx(i)} style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: i === idx ? 'var(--ml-salmon)' : 'rgba(255,255,255,0.2)',
            cursor: 'pointer', transition: 'all 0.2s',
          }} />
        ))}
      </div>
    </div>
  )
}

function WaiterFeatures() {
  const feats = ['Interfaz familiar — sin curva de aprendizaje', 'Órdenes en tiempo real', 'Onboarding por WhatsApp', 'Listo en una tarde']
  return (
    <div style={{ padding: '0 24px 4px' }}>
      {feats.map(f => (
        <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 0', fontFamily: 'var(--font-jakarta)', fontSize: '13px', color: 'var(--ml-gray-700)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
          <span style={{ color: 'var(--ml-salmon)', fontWeight: 700, fontSize: '11px', flexShrink: 0 }}>✓</span>{f}
        </div>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────
   CARD 3 — DASHBOARD
───────────────────────────────────────────── */
function DashboardMockup() {
  const [revenue,   setRevenue]   = useState(0)
  const [cubiertos, setCubiertos] = useState(48)
  const [notif,     setNotif]     = useState<string | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  // Counter on entry
  useEffect(() => {
    const target = 2840
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      observer.disconnect()
      const start = Date.now()
      const dur   = 2000
      const tick  = () => {
        const t = Math.min(1, (Date.now() - start) / dur)
        const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
        setRevenue(Math.round(target * ease))
        if (t < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }, { threshold: 0.3 })
    if (cardRef.current) observer.observe(cardRef.current)
    return () => observer.disconnect()
  }, [])

  // Live cubiertos + notification
  useEffect(() => {
    const iv = setInterval(() => {
      setCubiertos(p => p + 1)
      setNotif(`Mesa ${Math.floor(Math.random() * 8) + 1} — $${(Math.random() * 60 + 20).toFixed(0)} pagado`)
      setTimeout(() => setNotif(null), 2200)
    }, 4800)
    return () => clearInterval(iv)
  }, [])

  return (
    <div ref={cardRef} style={{ background: '#0F1115', padding: '16px', overflow: 'hidden', position: 'relative' }}>
      {/* Header */}
      <div style={{ marginBottom: '14px' }}>
        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.38)', fontFamily: 'var(--font-jakarta)', marginBottom: '2px' }}>Buenos días, Carlos</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
          <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: '38px', color: '#fff', lineHeight: 1 }}>
            ${revenue.toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', color: '#10B981', fontWeight: 600, fontFamily: 'var(--font-jakarta)', paddingBottom: '5px' }}>↑ +12%</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '4px' }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10B981', display: 'inline-block', animation: 'pulse-dot 2s infinite' }} />
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-jakarta)' }}>En vivo</span>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
        {[
          [cubiertos.toString(), 'Cubiertos'],
          ['$59',   'Ticket prom.'],
          ['94%',   'Satisfacción'],
          ['12',    'Reseñas'],
        ].map(([v, l]) => (
          <div key={l} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '10px' }}>
            <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: '20px', color: '#fff' }}>{v}</div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.38)', fontFamily: 'var(--font-jakarta)' }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '5px', height: '52px', marginBottom: '10px' }}>
        {[35,52,44,78,65,90,72].map((h, i) => (
          <div key={i} style={{
            flex: 1, borderRadius: '4px 4px 0 0',
            background: i === 5
              ? 'linear-gradient(to top, var(--ml-salmon-dark), var(--ml-salmon))'
              : 'linear-gradient(to top, rgba(244,112,90,0.2), rgba(244,112,90,0.45))',
            height: `${h}%`, transition: 'height 0.4s ease',
          }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-jakarta)' }}>
        {['L','M','X','J','V','S','D'].map(d => <span key={d}>{d}</span>)}
      </div>

      {/* Live notification */}
      {notif && (
        <div style={{
          position:  'absolute', bottom: '16px', right: '16px',
          background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
          borderRadius: '10px', padding: '8px 12px',
          animation: 'ml-slide-right 0.3s ease both',
          maxWidth: '180px',
        }}>
          <div style={{ fontSize: '10px', color: '#10B981', fontWeight: 600, fontFamily: 'var(--font-jakarta)' }}>🟢 {notif}</div>
        </div>
      )}
    </div>
  )
}
