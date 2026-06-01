import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

declare const gsap: any

/* ─────────────────────────────────────────────
   SECCIÓN PRINCIPAL
───────────────────────────────────────────── */
export function ExperiencesSection() {
  const { t } = useTranslation()
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
            {t('experiences.label')}
          </p>
          <h2 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 'clamp(36px,5vw,56px)', color: '#1a1a1a', lineHeight: 1.1, margin: 0 }}>
            {t('experiences.title')}{' '}
            <em style={{ color: 'var(--ml-salmon)', fontStyle: 'italic' }}>{t('experiences.title_accent')}</em>
          </h2>
        </div>

        {/* 2-card grid: Cliente + Mozo */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px',
          marginBottom: '32px',
        }}>
          <ExperienceCard data-exp-card index={0} role={`— ${t('experiences.client_tag')}`} title={t('experiences.client_title')}>
            <ClientTextContent t={t} />
          </ExperienceCard>

          <ExperienceCard data-exp-card index={1} role={`— ${t('experiences.waiter_tag')}`} title={t('experiences.waiter_title')}>
            <WaiterMockup />
            <WaiterFeatures t={t} />
            <WaiterWhatsApp />
          </ExperienceCard>
        </div>

        {/* Owner section — full width */}
        <OwnerSection t={t} />
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

function WaiterFeatures({ t }: { t: (k: string) => string }) {
  const feats = [t('experiences.waiter_f1'), t('experiences.waiter_f2'), t('experiences.waiter_f3'), t('experiences.waiter_f4')]
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

function WaiterWhatsApp() {
  return (
    <div style={{ padding: '14px 24px 20px' }}>
      <a
        href="https://wa.me/?text=Tutorial%20de%20MenuLife"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          textDecoration: 'none', color: '#25D366',
          fontFamily: 'var(--font-jakarta)', fontSize: '13px', fontWeight: 600,
          padding: '8px 14px', borderRadius: '50px',
          border: '1px solid rgba(37,211,102,0.25)',
          background: 'rgba(37,211,102,0.06)',
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(37,211,102,0.12)'; e.currentTarget.style.borderColor = 'rgba(37,211,102,0.5)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(37,211,102,0.06)'; e.currentTarget.style.borderColor = 'rgba(37,211,102,0.25)' }}
      >
        📱 Compartir tutorial por WhatsApp →
      </a>
    </div>
  )
}

function ClientTextContent({ t }: { t: (k: string) => string }) {
  return (
    <div style={{
      background: '#0F1115',
      padding: '32px 24px',
      minHeight: '240px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      gap: '16px',
    }}>
      <div style={{ fontSize: '48px', lineHeight: 1 }}>📱</div>
      <p style={{
        color: 'rgba(255,255,255,0.85)',
        fontFamily: 'var(--font-jakarta)',
        fontSize: '16px',
        lineHeight: 1.7,
        margin: 0,
      }}>
        Tus clientes <strong style={{ color: '#fff' }}>escanean el QR</strong>, exploran el menú y{' '}
        <strong style={{ color: '#fff' }}>piden en segundos</strong>.
      </p>
      <p style={{
        color: 'rgba(255,255,255,0.5)',
        fontFamily: 'var(--font-jakarta)',
        fontSize: '14px',
        lineHeight: 1.65,
        margin: 0,
      }}>
        Sin descargas. Sin registros.{' '}
        <strong style={{ color: 'rgba(255,255,255,0.75)' }}>Cero fricción.</strong>
        <br />
        Desde cualquier celular. En cualquier mesa.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
        {[t('experiences.client_feat1'), t('experiences.client_feat2'), t('experiences.client_feat3')].map(f => (
          <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-jakarta)', fontSize: '13px', color: 'rgba(255,255,255,0.55)' }}>
            <span style={{ color: 'var(--ml-salmon)', fontSize: '11px', fontWeight: 700 }}>✓</span>{f}
          </div>
        ))}
      </div>
    </div>
  )
}

function OwnerSection({ t }: { t: (k: string) => string }) {
  return (
    <div
      data-exp-card
      style={{
        background: '#0F1115',
        borderRadius: '24px',
        overflow: 'hidden',
        border: '1px solid rgba(244,112,90,0.18)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
      }}
    >
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.2fr)',
        gap: '0',
      }} className="owner-section-grid">
        {/* Text side */}
        <div style={{ padding: '48px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '16px' }}>
          <p style={{
            fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
            color: 'var(--ml-salmon)', fontFamily: 'var(--font-jakarta)',
          }}>
            — {t('experiences.owner_tag')}
          </p>
          <h2 style={{
            fontFamily: 'var(--font-syne)', fontWeight: 800,
            fontSize: 'clamp(32px,4vw,52px)',
            color: '#fff', lineHeight: 1.08, margin: 0,
          }}>
            {t('experiences.owner_title')}{' '}
            <em style={{ color: 'var(--ml-salmon)', fontStyle: 'italic', display: 'block' }}>
              {t('experiences.owner_title_accent')}
            </em>
          </h2>
          <p style={{
            fontFamily: 'var(--font-jakarta)', fontSize: '15px', lineHeight: 1.65,
            color: 'rgba(255,255,255,0.55)', margin: 0, maxWidth: '380px',
          }}>
            {t('experiences.owner_desc')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
            {[t('experiences.owner_f1'), t('experiences.owner_f2'), t('experiences.owner_f3')].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'var(--font-jakarta)', fontSize: '14px', color: 'rgba(255,255,255,0.65)' }}>
                <span style={{ color: 'var(--ml-salmon)', fontSize: '12px', fontWeight: 700 }}>✓</span>
                <strong style={{ color: 'rgba(255,255,255,0.8)' }}>{f}</strong>
              </div>
            ))}
          </div>
        </div>

        {/* Dashboard mockup side */}
        <div style={{ background: '#080b10', padding: '32px', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
          <DashboardMockup t={t} />
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   CARD 3 — DASHBOARD
───────────────────────────────────────────── */
function DashboardMockup({ t }: { t: (k: string) => string }) {
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
        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.38)', fontFamily: 'var(--font-jakarta)', marginBottom: '2px' }}>{t('experiences.owner_greeting')}</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
          <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: '38px', color: '#fff', lineHeight: 1 }}>
            ${revenue.toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', color: '#10B981', fontWeight: 600, fontFamily: 'var(--font-jakarta)', paddingBottom: '5px' }}>↑ +12%</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '4px' }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10B981', display: 'inline-block', animation: 'pulse-dot 2s infinite' }} />
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-jakarta)' }}>{t('experiences.owner_live')}</span>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
        {[
          [cubiertos.toString(), t('experiences.owner_covers')],
          ['$59',   t('experiences.owner_ticket')],
          ['94%',   t('experiences.owner_satisfaction')],
          ['12',    t('experiences.owner_reviews')],
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
