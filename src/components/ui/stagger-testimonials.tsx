import { motion } from 'framer-motion'

export interface Testimonial {
  id: string
  name: string
  role: string
  business: string
  content: string
  content_en?: string | null
  avatar_url?: string | null
}

interface StaggerTestimonialsProps {
  testimonials: Testimonial[]
  lang?: 'es' | 'en'
}

export function StaggerTestimonials({ testimonials, lang = 'es' }: StaggerTestimonialsProps) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '24px',
      padding: '0 24px',
      maxWidth: '1100px',
      margin: '0 auto',
    }}>
      {testimonials.map((t, i) => {
        const text = lang === 'en' && t.content_en ? t.content_en : t.content
        return (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.6, delay: i * 0.12, ease: [0.21, 0.47, 0.32, 0.98] }}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '20px',
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            {/* Header: avatar + name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              {t.avatar_url ? (
                <img
                  src={t.avatar_url}
                  alt={t.name}
                  style={{
                    width: 48, height: 48, borderRadius: '50%',
                    objectFit: 'cover', flexShrink: 0,
                  }}
                />
              ) : (
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'rgba(244,112,90,0.15)',
                  border: '1px solid rgba(244,112,90,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.25rem', fontWeight: 700, color: '#F4705A', flexShrink: 0,
                }}>
                  {t.name.charAt(0)}
                </div>
              )}
              <div>
                <p style={{
                  fontWeight: 600, color: '#fff',
                  fontSize: '0.9375rem', margin: 0,
                  fontFamily: 'var(--font-jakarta)',
                }}>
                  {t.name}
                </p>
                <p style={{
                  fontSize: '0.8125rem',
                  color: 'rgba(255,255,255,0.45)',
                  margin: '2px 0 0',
                }}>
                  {t.role} · {t.business}
                </p>
              </div>
            </div>

            {/* Quote */}
            <p style={{
              fontSize: '0.9375rem',
              lineHeight: 1.7,
              color: 'rgba(255,255,255,0.72)',
              margin: 0,
              flex: 1,
            }}>
              "{text}"
            </p>
          </motion.div>
        )
      })}
    </div>
  )
}
