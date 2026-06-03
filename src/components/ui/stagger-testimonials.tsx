import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

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

interface ListItem extends Testimonial {
  tempId: number
}

export function StaggerTestimonials({ testimonials: initialTestimonials, lang = 'es' }: StaggerTestimonialsProps) {
  const [cardSize, setCardSize] = useState(365)
  const [list, setList] = useState<ListItem[]>(
    initialTestimonials.map((t, i) => ({ ...t, tempId: i }))
  )
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

  const handleMove = (steps: number) => {
    const newList = [...list]
    if (steps > 0) {
      for (let i = steps; i > 0; i--) {
        const item = newList.shift()
        if (!item) return
        newList.push({ ...item, tempId: Math.random() })
      }
    } else {
      for (let i = steps; i < 0; i++) {
        const item = newList.pop()
        if (!item) return
        newList.unshift({ ...item, tempId: Math.random() })
      }
    }
    setList(newList)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX
  }
  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current
    if (Math.abs(diff) > 50) handleMove(diff > 0 ? 1 : -1)
  }

  useEffect(() => {
    const update = () => setCardSize(window.innerWidth >= 640 ? 365 : 280)
    update()
    window.addEventListener('resize', update, { passive: true })
    return () => window.removeEventListener('resize', update)
  }, [])

  useEffect(() => {
    setList(initialTestimonials.map((t, i) => ({ ...t, tempId: i })))
  }, [initialTestimonials])

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ height: 520 }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {list.map((testimonial, index) => {
        const half = list.length % 2 ? (list.length + 1) / 2 : list.length / 2
        const position = index - half
        const isCenter = position === 0

        const text =
          lang === 'en' && testimonial.content_en
            ? testimonial.content_en
            : testimonial.content

        return (
          <div
            key={testimonial.tempId}
            onClick={() => handleMove(position)}
            className="absolute left-1/2 top-1/2 cursor-pointer"
            style={{
              width: cardSize,
              height: cardSize,
              borderRadius: '20px',
              padding: '32px',
              background: isCenter
                ? 'linear-gradient(135deg, #F4705A 0%, #e05545 100%)'
                : 'rgba(255,255,255,0.04)',
              border: isCenter
                ? '1px solid rgba(255,255,255,0.2)'
                : '1px solid rgba(255,255,255,0.08)',
              color: 'white',
              transform: `
                translate(-50%, -50%)
                translateX(${(cardSize / 1.5) * position}px)
                translateY(${isCenter ? -40 : position % 2 ? 15 : -15}px)
                rotate(${isCenter ? 0 : position % 2 ? 2.5 : -2.5}deg)
                scale(${isCenter ? 1 : 0.9})
              `,
              boxShadow: isCenter
                ? '0 20px 60px rgba(244,112,90,0.3)'
                : '0 8px 24px rgba(0,0,0,0.2)',
              zIndex: isCenter ? 10 : 5 - Math.abs(position),
              opacity: Math.abs(position) > 3 ? 0 : 1,
              transition: 'all 500ms ease-in-out',
            }}
          >
            {/* Avatar */}
            {testimonial.avatar_url ? (
              <img
                src={testimonial.avatar_url}
                alt={testimonial.name}
                style={{
                  width: 48, height: 48, borderRadius: '50%',
                  objectFit: 'cover', marginBottom: 16,
                  border: '2px solid rgba(255,255,255,0.2)',
                }}
              />
            ) : (
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: isCenter ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 16, fontSize: '1.25rem', fontWeight: 700,
              }}>
                {testimonial.name.charAt(0)}
              </div>
            )}

            {/* Contenido */}
            <p style={{
              fontSize: isCenter ? '1.0625rem' : '0.9375rem',
              lineHeight: 1.6,
              fontWeight: 400,
              opacity: isCenter ? 1 : 0.7,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 5,
              WebkitBoxOrient: 'vertical',
            } as React.CSSProperties}>
              "{text}"
            </p>

            {/* Autor */}
            <div style={{ position: 'absolute', bottom: 32, left: 32, right: 32 }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, opacity: isCenter ? 1 : 0.8 }}>
                {testimonial.name}
              </p>
              <p style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: 2 }}>
                {testimonial.role}, {testimonial.business}
              </p>
            </div>
          </div>
        )
      })}

      {/* Flechas — solo desktop */}
      <div className="hidden sm:flex absolute bottom-6 left-1/2 -translate-x-1/2 gap-3">
        {[
          { label: 'Anterior', Icon: ChevronLeft,  step: -1 },
          { label: 'Siguiente', Icon: ChevronRight, step:  1 },
        ].map(({ label, Icon, step }) => (
          <button
            key={label}
            onClick={() => handleMove(step)}
            aria-label={label}
            style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 200ms',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(244,112,90,0.2)'
              e.currentTarget.style.borderColor = '#F4705A'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
            }}
          >
            <Icon size={20} />
          </button>
        ))}
      </div>

      {/* Swipe hint — solo mobile */}
      <p
        className="sm:hidden absolute bottom-4 left-1/2 -translate-x-1/2 text-xs whitespace-nowrap"
        style={{ color: 'rgba(255,255,255,0.3)' }}
      >
        ← Deslizá para ver más →
      </p>
    </div>
  )
}
