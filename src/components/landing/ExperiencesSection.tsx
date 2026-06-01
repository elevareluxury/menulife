import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { QrCode, Zap, LayoutGrid, Bell, TrendingUp } from 'lucide-react'

const STEP_ICONS = [QrCode, Zap, LayoutGrid, Bell, TrendingUp]

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

        {/* 2-card grid: Cliente + Equipo */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px',
          marginBottom: '32px',
        }}>
          <ExperienceCard data-exp-card index={0} role={`— ${t('experiences.client_tag')}`} title={t('experiences.client_title')}>
            <FlowStepsContent t={t} />
          </ExperienceCard>

          <ExperienceCard data-exp-card index={1} role={`— ${t('experiences.waiter_tag')}`} title={t('experiences.waiter_title')}>
            <TeamFeaturesContent t={t} />
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
   CARD 1 — CLIENTE (5 pasos animados)
───────────────────────────────────────────── */
function FlowStepsContent({ t }: { t: (k: string) => string }) {
  const containerRef = useRef<HTMLDivElement>(null)

  const steps = [1, 2, 3, 4, 5].map((n, i) => ({
    num: n,
    Icon: STEP_ICONS[i],
    title: t(`flow.step${n}_title`),
    desc:  t(`flow.step${n}_desc`),
  }))

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      observer.disconnect()
      el.querySelectorAll<HTMLElement>('.flow-step-circle').forEach((node, i) => {
        setTimeout(() => node.classList.add('flow-visible'), i * 100)
      })
      el.querySelectorAll<HTMLElement>('.flow-step-text').forEach((node, i) => {
        setTimeout(() => node.classList.add('flow-visible'), 160 + i * 100)
      })
    }, { threshold: 0.25 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div style={{ background: '#0F1115', padding: '28px 16px 24px' }}>
      <div
        ref={containerRef}
        style={{
          display: 'flex', alignItems: 'flex-start',
          overflowX: 'auto', paddingBottom: '4px',
          scrollbarWidth: 'none',
        }}
      >
        {steps.map((step, idx) => (
          <div key={step.num} style={{ display: 'flex', alignItems: 'flex-start', flex: '1 0 auto' }}>
            {/* Step column */}
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: '10px', minWidth: '72px', maxWidth: '96px', flex: 1,
              textAlign: 'center',
            }}>
              {/* Circle */}
              <div
                className="flow-step-circle"
                style={{
                  position: 'relative',
                  width: '64px', height: '64px', borderRadius: '50%',
                  background: '#1a1e27',
                  border: '1.5px solid rgba(255,255,255,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'default', flexShrink: 0,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--ml-salmon)'
                  e.currentTarget.style.boxShadow = '0 0 18px rgba(244,112,90,0.3)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                  e.currentTarget.style.boxShadow = ''
                }}
              >
                <step.Icon style={{ width: '26px', height: '26px', color: '#fff' }} />
                <span style={{
                  position: 'absolute', top: '-6px', right: '-6px',
                  width: '20px', height: '20px', borderRadius: '50%',
                  background: 'var(--ml-salmon)', color: '#fff',
                  fontSize: '10px', fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-syne)',
                }}>{step.num}</span>
              </div>
              {/* Text */}
              <div className="flow-step-text" style={{ padding: '0 2px' }}>
                <div style={{
                  fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '12px',
                  color: '#fff', lineHeight: 1.2,
                }}>{step.title}</div>
                <div style={{
                  fontFamily: 'var(--font-jakarta)', fontSize: '11px',
                  color: 'rgba(255,255,255,0.38)', lineHeight: 1.4, marginTop: '3px',
                }}>{step.desc}</div>
              </div>
            </div>

            {/* Connector line */}
            {idx < steps.length - 1 && (
              <div style={{
                flex: '1 0 12px',
                height: '1.5px',
                background: 'rgba(255,255,255,0.12)',
                marginTop: '32px',
                minWidth: '12px',
              }} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   CARD 2 — EQUIPO (3 features, solo texto)
───────────────────────────────────────────── */
function TeamFeaturesContent({ t }: { t: (k: string) => string }) {
  const features = [
    { icon: '💬', title: t('whatsapp.f1_title'), desc: t('whatsapp.f1_desc') },
    { icon: '🎬', title: t('whatsapp.f2_title'), desc: t('whatsapp.f2_desc') },
    { icon: '🔗', title: t('whatsapp.f3_title'), desc: t('whatsapp.f3_desc') },
  ]

  return (
    <div style={{ padding: '28px 24px 20px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {features.map(f => (
        <div key={f.title} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
          <div style={{
            width: '38px', height: '38px', flexShrink: 0,
            background: 'rgba(244,112,90,0.08)',
            border: '1px solid rgba(244,112,90,0.18)',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '17px',
          }}>{f.icon}</div>
          <div>
            <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '14px', color: '#1a1a1a', marginBottom: '3px' }}>
              {f.title}
            </div>
            <div style={{ fontFamily: 'var(--font-jakarta)', fontSize: '13px', color: 'var(--ml-gray-500)', lineHeight: 1.5 }}>
              {f.desc}
            </div>
          </div>
        </div>
      ))}
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
