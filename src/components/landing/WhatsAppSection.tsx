import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

declare const gsap: any

type Message = { from: 'bot' | 'user'; text: string; link?: string; highlight?: boolean }

export function WhatsAppSection() {
  const { t } = useTranslation()

  const FEATURES = [
    { icon: '💬', title: t('whatsapp.f1_title'), desc: t('whatsapp.f1_desc') },
    { icon: '🎬', title: t('whatsapp.f2_title'), desc: t('whatsapp.f2_desc') },
    { icon: '🔗', title: t('whatsapp.f3_title'), desc: t('whatsapp.f3_desc') },
  ]

  const MESSAGES: Message[] = [
    { from: 'bot',  text: t('whatsapp.msg1') },
    { from: 'bot',  text: t('whatsapp.msg2'), link: t('whatsapp.msg2_link') },
    { from: 'user', text: t('whatsapp.msg3') },
    { from: 'bot',  text: t('whatsapp.msg4'), link: t('whatsapp.msg4_link') },
    { from: 'bot',  text: t('whatsapp.msg5'), highlight: true },
  ]

  const leftRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof gsap === 'undefined') return
    const ST = (window as any).ScrollTrigger
    if (!ST) return

    gsap.fromTo('[data-wa-left]',
      { opacity: 0, x: -50 },
      { opacity: 1, x: 0, duration: 0.9, ease: 'power3.out',
        scrollTrigger: { trigger: '[data-wa-left]', start: 'top 82%' } })

    gsap.fromTo('[data-wa-chat]',
      { opacity: 0, x: 50, scale: 0.96 },
      { opacity: 1, x: 0, scale: 1, duration: 0.9, ease: 'power3.out',
        scrollTrigger: { trigger: '[data-wa-chat]', start: 'top 82%' } })
  }, [])

  return (
    <section style={{
      background: 'var(--ml-off-white)',
      padding:    '96px 24px',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px,1fr))', gap: '64px', alignItems: 'center' }}>
        {/* Left */}
        <div ref={leftRef} data-wa-left>
          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--ml-salmon)', fontFamily: 'var(--font-jakarta)', marginBottom: '14px' }}>
            {t('whatsapp.label')}
          </p>
          <h2 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 'clamp(36px,4.5vw,52px)', color: '#1a1a1a', lineHeight: 1.1, marginBottom: '20px' }}>
            {t('whatsapp.title')}{' '}
            <em style={{ color: 'var(--ml-salmon)', fontStyle: 'italic' }}>{t('whatsapp.title_accent')}</em>
          </h2>
          <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '16px', fontWeight: 300, color: 'var(--ml-gray-500)', lineHeight: 1.65, marginBottom: '36px' }}>
            {t('whatsapp.subtitle')}
          </p>

          {FEATURES.map(f => (
            <div key={f.title} style={{ display: 'flex', gap: '14px', marginBottom: '20px' }}>
              <div style={{
                width: '40px', height: '40px', flexShrink: 0,
                background: 'rgba(244,112,90,0.1)', border: '1px solid rgba(244,112,90,0.2)',
                borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
              }}>{f.icon}</div>
              <div>
                <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '15px', color: '#1a1a1a', marginBottom: '3px' }}>{f.title}</div>
                <div style={{ fontFamily: 'var(--font-jakarta)', fontSize: '13px', color: 'var(--ml-gray-500)', lineHeight: 1.5 }}>{f.desc}</div>
              </div>
            </div>
          ))}

          <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '15px', fontWeight: 500, color: '#1a1a1a', marginTop: '28px', lineHeight: 1.55 }}>
            {t('whatsapp.copy')}<br />
            <span style={{ color: 'var(--ml-gray-500)', fontWeight: 300 }}>{t('whatsapp.copy_2')}</span>
          </p>
        </div>

        {/* Right — animated WhatsApp chat */}
        <div data-wa-chat>
          <AnimatedChat messages={MESSAGES} onlineLabel={t('whatsapp.online')} />
        </div>
      </div>
    </section>
  )
}

function AnimatedChat({ messages, onlineLabel }: { messages: Message[]; onlineLabel: string }) {
  const [visible, setVisible] = useState<number[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let timers: ReturnType<typeof setTimeout>[] = []

    const show = () => {
      setVisible([])
      messages.forEach((_, i) => {
        const t = setTimeout(() => {
          setVisible(p => [...p, i])
          if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight
          }
        }, 600 + i * 900)
        timers.push(t)
      })

      const restart = setTimeout(() => {
        setVisible([])
        show()
      }, 600 + messages.length * 900 + 3000)
      timers.push(restart)
    }

    const init = setTimeout(show, 400)
    timers.push(init)

    return () => timers.forEach(clearTimeout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{
      background:   '#0d1117',
      borderRadius: '20px',
      overflow:     'hidden',
      border:       '1px solid rgba(255,255,255,0.06)',
      boxShadow:    '0 24px 80px rgba(0,0,0,0.35)',
    }}>
      {/* Chat header */}
      <div style={{
        background:  '#0a1628',
        padding:     '14px 18px',
        display:     'flex', alignItems: 'center', gap: '12px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '50%',
          background: 'linear-gradient(135deg,#25D366,#128C7E)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
        }}>🤖</div>
        <div>
          <div style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 600, color: '#fff', fontSize: '14px' }}>MenuLife Asistente</div>
          <div style={{ fontFamily: 'var(--font-jakarta)', fontSize: '11px', color: '#25D366', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#25D366', display: 'inline-block' }} />
            {onlineLabel}
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div ref={containerRef} style={{
        padding:    '16px',
        minHeight:  '340px',
        maxHeight:  '380px',
        overflowY:  'auto',
        display:    'flex',
        flexDirection: 'column',
        gap:        '10px',
        scrollBehavior: 'smooth',
      }}>
        {messages.map((msg, i) => (
          visible.includes(i) ? (
            <div key={i} style={{
              display:    'flex',
              justifyContent: msg.from === 'user' ? 'flex-end' : 'flex-start',
              animation:  'ml-fade-up 0.35s ease both',
              maxWidth:   '85%',
              alignSelf:  msg.from === 'user' ? 'flex-end' : 'flex-start',
            }}>
              <div style={{
                padding:      '10px 13px',
                borderRadius: msg.from === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                background:   msg.highlight
                  ? 'rgba(37,211,102,0.12)'
                  : msg.from === 'user'
                  ? 'rgba(45,74,45,0.9)'
                  : 'rgba(30,45,32,0.9)',
                border:       msg.highlight ? '1px solid rgba(37,211,102,0.3)' : '1px solid rgba(255,255,255,0.05)',
                fontSize:     '13px',
                lineHeight:   1.55,
                color:        '#e8e8e8',
                fontFamily:   'var(--font-jakarta)',
                whiteSpace:   'pre-line',
              }}>
                {msg.text}
                {msg.link && (
                  <div style={{
                    marginTop:    '8px',
                    padding:      '6px 12px',
                    background:   'rgba(244,112,90,0.15)',
                    border:       '1px solid rgba(244,112,90,0.3)',
                    borderRadius: '8px',
                    fontSize:     '11px',
                    color:        'var(--ml-salmon-light)',
                    fontWeight:   600,
                    whiteSpace:   'pre-line',
                  }}>{msg.link}</div>
                )}
                <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)', marginTop: '4px', textAlign: 'right' }}>
                  {new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ) : (
            i === visible.length && i < messages.length ? (
              <div key={`typing-${i}`} style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '10px 14px',
                background: 'rgba(30,45,32,0.9)',
                borderRadius: '14px 14px 14px 4px',
                width: 'fit-content',
                border: '1px solid rgba(255,255,255,0.05)',
              }}>
                {[0,1,2].map(d => (
                  <span key={d} style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    background: 'rgba(255,255,255,0.4)',
                    display: 'inline-block',
                    animation: `ml-chat-dot 1.4s ${d * 0.2}s ease-in-out infinite`,
                  }} />
                ))}
              </div>
            ) : null
          )
        ))}
      </div>
    </div>
  )
}
