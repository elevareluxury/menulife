import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, Users, Check, Plus, Minus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import type { Restaurant, Reservation } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

type Step = 'data' | 'datetime' | 'guests' | 'success'

const OCCASIONS = ['Ninguna', 'Cumpleaños', 'Aniversario', 'Cena de negocios', 'Otro']

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAYS_LABEL = ['L','M','M','J','V','S','D']

function pad(n: number) { return n.toString().padStart(2, '0') }


function formatDateLabel(dateStr: string) {
  const [y,m,d] = dateStr.split('-').map(Number)
  const date = new Date(y, m-1, d)
  const opts: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
  return date.toLocaleDateString('es-AR', opts)
}

interface CalendarProps {
  selected: string
  onSelect: (d: string) => void
  maxDays: number
  minHours: number
}

function MiniCalendar({ selected, onSelect, maxDays, minHours }: CalendarProps) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const firstDay = new Date(viewYear, viewMonth, 1)
  const startDow = (firstDay.getDay() + 6) % 7 // Monday=0
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

  const maxDate = new Date(today)
  maxDate.setDate(maxDate.getDate() + maxDays)

  const minDate = new Date(today)
  minDate.setHours(minDate.getHours() + minHours)

  const cells: (number | null)[] = Array(startDow).fill(null)
  for (let i = 1; i <= daysInMonth; i++) cells.push(i)

  const isDisabled = (day: number) => {
    const d = new Date(viewYear, viewMonth, day)
    return d < minDate || d > maxDate
  }

  const isSelected = (day: number) => {
    return selected === `${viewYear}-${pad(viewMonth+1)}-${pad(day)}`
  }

  const isToday = (day: number) => {
    return day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear()
  }

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(v => v - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(v => v + 1) }
    else setViewMonth(m => m + 1)
  }

  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', padding: '16px' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button type="button" onClick={prevMonth} style={{ color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
          <ChevronLeft size={18} />
        </button>
        <span style={{ color: '#fff', fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '14px' }}>
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button type="button" onClick={nextMonth} style={{ color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
          <ChevronRight size={18} />
        </button>
      </div>
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-2">
        {DAYS_LABEL.map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.35)', padding: '2px 0' }}>{d}</div>
        ))}
      </div>
      {/* Days */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />
          const disabled = isDisabled(day)
          const sel = isSelected(day)
          const tod = isToday(day)
          return (
            <button
              key={day}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(`${viewYear}-${pad(viewMonth+1)}-${pad(day)}`)}
              style={{
                width: '36px', height: '36px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '10px', fontSize: '13px', fontWeight: sel ? 700 : 500,
                background: sel ? 'var(--ml-salmon, #F4705A)' : 'transparent',
                color: disabled ? 'rgba(255,255,255,0.2)' : sel ? '#fff' : '#fff',
                border: tod && !sel ? '1px solid var(--ml-salmon, #F4705A)' : '1px solid transparent',
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface FormState {
  firstName: string
  lastName: string
  phone: string
  email: string
  partySize: number
  date: string
  time: string
  occasion: string
  notes: string
  guests: string[]
}

const EMPTY: FormState = {
  firstName: '', lastName: '', phone: '', email: '',
  partySize: 2, date: '', time: '', occasion: 'Ninguna', notes: '', guests: [],
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: '12px',
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.05)',
  color: '#f5f5f5', fontSize: '15px', outline: 'none',
  fontFamily: 'var(--font-jakarta)',
}

// ── Subcomponents defined OUTSIDE to prevent re-mount on every form keystroke ──

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: '6px', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'var(--font-jakarta)' }}>
        {label}
      </label>
      {children}
      {hint && <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '4px', fontFamily: 'var(--font-jakarta)' }}>{hint}</p>}
    </div>
  )
}

function FormHeader({ title, onBack, slug, accentColor }: { title: string; onBack?: () => void; slug: string; accentColor: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
      {onBack ? (
        <button type="button" onClick={onBack} style={{ color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
          <ArrowLeft size={20} />
        </button>
      ) : (
        <Link to={`/r/${slug}`} style={{ color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={20} />
        </Link>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
        <CalendarDays size={16} style={{ color: accentColor }} />
        <span style={{ color: '#fff', fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '15px' }}>{title}</span>
      </div>
    </div>
  )
}

function CtaButton({ onClick, label, loading, accentColor }: { onClick: () => void; label: string; loading: boolean; accentColor: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      style={{
        width: '100%', padding: '14px', borderRadius: '50px', border: 'none',
        background: loading ? 'rgba(244,112,90,0.45)' : accentColor,
        color: '#fff', fontSize: '15px', fontWeight: 600,
        cursor: loading ? 'not-allowed' : 'pointer',
        fontFamily: 'var(--font-jakarta)', transition: 'all 0.2s',
      }}
    >
      {loading ? 'Cargando...' : label}
    </button>
  )
}

export function ReservationFormPage() {
  const { slug } = useParams()
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [step, setStep] = useState<Step>('data')
  const [form, setForm] = useState<FormState>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [created, setCreated] = useState<Reservation | null>(null)

  useEffect(() => {
    if (!slug) return
    db.from('restaurants').select('*').eq('slug', slug).eq('is_active', true).single()
      .then(({ data }: { data: Restaurant | null }) => {
        if (data) setRestaurant(data)
        else toast.error('Restaurante no encontrado')
      })
  }, [slug])

  if (!restaurant) {
    return (
      <div style={{ minHeight: '100vh', background: '#0D0D0D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '24px', height: '24px', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#F4705A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  const accentColor = restaurant.menu_accent_color ?? '#F4705A'
  const slots = restaurant.reservations_time_slots ?? []
  const maxDays = restaurant.reservations_advance_days ?? 30
  const minHours = restaurant.reservations_min_hours ?? 2
  const maxParty = restaurant.reservations_max_party ?? 20
  const collectGuests = restaurant.reservations_collect_guests ?? false
  const confirmMessage = restaurant.reservations_message ?? '¡Gracias por tu reserva! Te esperamos.'

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm(prev => ({ ...prev, [k]: v }))

  const validateStep1 = () => {
    if (!form.firstName.trim()) { toast.error('Ingresá tu nombre'); return false }
    if (!form.lastName.trim()) { toast.error('Ingresá tu apellido'); return false }
    if (!form.phone.trim()) { toast.error('Ingresá tu teléfono'); return false }
    return true
  }

  const validateStep2 = () => {
    if (!form.date) { toast.error('Elegí una fecha'); return false }
    if (!form.time) { toast.error('Elegí un horario'); return false }
    return true
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const { data, error } = await db
        .from('reservations')
        .insert({
          restaurant_id: restaurant.id,
          first_name: form.firstName.trim(),
          last_name: form.lastName.trim(),
          phone: form.phone.trim(),
          email: form.email.trim() || null,
          party_size: form.partySize,
          reservation_date: form.date,
          reservation_time: form.time,
          occasion: form.occasion === 'Ninguna' ? null : form.occasion,
          notes: form.notes.trim() || null,
          guests_data: form.guests.map(g => ({ name: g })),
          collect_guests: collectGuests,
          source: 'menu',
          status: 'pending',
        })
        .select()
        .single()

      if (error) throw error
      setCreated(data as Reservation)
      setStep('success')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear la reserva')
    } finally {
      setLoading(false)
    }
  }

  // Google Calendar URL
  const googleCalendarUrl = () => {
    if (!created) return '#'
    const dt = `${created.reservation_date.replace(/-/g, '')}T${created.reservation_time.replace(':', '')}00`
    const dtEnd = dt
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Reserva en ${restaurant.name}`)}&dates=${dt}/${dtEnd}&details=${encodeURIComponent(`Reserva para ${created.party_size} personas`)}`
  }

  // ── STEP 1: Data ──
  if (step === 'data') return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'var(--font-jakarta)' }}>
      <FormHeader title="Reservar mesa" slug={slug ?? ''} accentColor={accentColor} />
      <div style={{ maxWidth: '520px', margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          {restaurant.logo_url && <img src={restaurant.logo_url} alt="" style={{ width: '36px', height: '36px', borderRadius: '10px', objectFit: 'cover' }} />}
          <span style={{ color: '#fff', fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '18px' }}>{restaurant.name}</span>
        </div>

        <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Tus datos</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Field label="Nombre *">
            <input style={inputStyle} placeholder="Juan" value={form.firstName} onChange={e => set('firstName', e.target.value)} />
          </Field>
          <Field label="Apellido *">
            <input style={inputStyle} placeholder="Pérez" value={form.lastName} onChange={e => set('lastName', e.target.value)} />
          </Field>
        </div>

        <Field label="Teléfono / WhatsApp *" hint="Te contactamos por acá para confirmar">
          <input style={inputStyle} type="tel" placeholder="+54 9 11 1234-5678" value={form.phone} onChange={e => set('phone', e.target.value)} />
        </Field>

        <Field label="Email" hint="Para enviarte la confirmación">
          <input style={inputStyle} type="email" placeholder="juan@email.com" value={form.email} onChange={e => set('email', e.target.value)} />
        </Field>

        <Field label={`Cantidad de personas * (máx. ${maxParty})`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '10px 16px' }}>
            <button type="button" onClick={() => set('partySize', Math.max(1, form.partySize - 1))}
              style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Minus size={14} />
            </button>
            <span style={{ flex: 1, textAlign: 'center', color: '#fff', fontWeight: 600, fontSize: '15px' }}>{form.partySize} {form.partySize === 1 ? 'persona' : 'personas'}</span>
            <button type="button" onClick={() => set('partySize', Math.min(maxParty, form.partySize + 1))}
              style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Plus size={14} />
            </button>
          </div>
        </Field>

        <CtaButton label="Continuar →" onClick={() => { if (validateStep1()) setStep('datetime') }} loading={loading} accentColor={accentColor} />
      </div>
    </div>
  )

  // ── STEP 2: Date + Time ──
  if (step === 'datetime') return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'var(--font-jakarta)' }}>
      <FormHeader title="Elegí fecha y hora" onBack={() => setStep('data')} slug={slug ?? ''} accentColor={accentColor} />
      <div style={{ maxWidth: '520px', margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '100px' }}>

        <div>
          <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>Fecha</p>
          <MiniCalendar selected={form.date} onSelect={d => set('date', d)} maxDays={maxDays} minHours={minHours} />
        </div>

        {form.date && (
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>Horario disponible</p>
            {slots.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>No hay horarios configurados.</p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {slots.map(s => (
                  <button
                    key={s} type="button"
                    onClick={() => set('time', s)}
                    style={{
                      padding: '8px 16px', borderRadius: '10px', fontSize: '14px', fontWeight: 600,
                      border: `1px solid ${form.time === s ? accentColor : 'rgba(255,255,255,0.12)'}`,
                      background: form.time === s ? accentColor : 'rgba(255,255,255,0.04)',
                      color: form.time === s ? '#fff' : 'rgba(255,255,255,0.8)',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <Field label="Ocasión especial (opcional)">
          <select
            value={form.occasion}
            onChange={e => set('occasion', e.target.value)}
            style={{ ...inputStyle, appearance: 'none' }}
          >
            {OCCASIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>

        <Field label="Nota o pedido especial">
          <textarea
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            rows={2}
            placeholder="Mesa cerca de la ventana, silla para bebé..."
            style={{ ...inputStyle as React.CSSProperties, resize: 'none' }}
          />
        </Field>

        <CtaButton
          label={collectGuests ? 'Continuar →' : 'Confirmar reserva →'}
          onClick={() => {
            if (!validateStep2()) return
            if (collectGuests) {
              set('guests', Array(form.partySize - 1).fill(''))
              setStep('guests')
            } else {
              handleSubmit()
            }
          }}
          loading={loading}
          accentColor={accentColor}
        />
      </div>
    </div>
  )

  // ── STEP 3: Guests (optional) ──
  if (step === 'guests') return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'var(--font-jakarta)' }}>
      <FormHeader title="Datos de tu mesa" onBack={() => setStep('datetime')} slug={slug ?? ''} accentColor={accentColor} />
      <div style={{ maxWidth: '520px', margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '100px' }}>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '14px', lineHeight: 1.6 }}>
          Completá los datos de cada persona que va a venir con vos
        </p>

        {form.guests.map((g, i) => (
          <Field key={i} label={`Acompañante ${i + 1}`}>
            <input
              style={inputStyle}
              placeholder="Nombre y Apellido"
              value={g}
              onChange={e => {
                const next = [...form.guests]
                next[i] = e.target.value
                set('guests', next)
              }}
            />
          </Field>
        ))}

        <CtaButton label="Confirmar reserva →" onClick={handleSubmit} loading={loading} accentColor={accentColor} />
      </div>
    </div>
  )

  // ── SUCCESS ──
  if (step === 'success' && created) return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'var(--font-jakarta)' }}>
      <div style={{ maxWidth: '440px', width: '100%', textAlign: 'center' }}>
        {/* Check icon */}
        <div style={{
          width: '80px', height: '80px', borderRadius: '50%',
          background: 'rgba(16,185,129,0.12)', border: '2px solid #10B981',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
        }}>
          <Check size={34} color="#10B981" strokeWidth={2.5} />
        </div>

        <h1 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: '26px', color: '#fff', marginBottom: '16px' }}>
          ¡Reserva confirmada!
        </h1>

        {/* Summary card */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px', marginBottom: '20px', textAlign: 'left' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {restaurant.logo_url && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <img src={restaurant.logo_url} alt="" style={{ width: '32px', height: '32px', borderRadius: '8px', objectFit: 'cover' }} />
                <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>{restaurant.name}</span>
              </div>
            )}
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>📅 {formatDateLabel(created.reservation_date)} · {created.reservation_time}</span>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}><Users size={14} style={{ display: 'inline', marginRight: '4px' }} />{created.party_size} {created.party_size === 1 ? 'persona' : 'personas'}</span>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>📱 Te confirmamos por WhatsApp</span>
          </div>
        </div>

        {/* Confirm message */}
        {confirmMessage && (
          <div style={{ background: `${accentColor}14`, border: `1px solid ${accentColor}30`, borderRadius: '12px', padding: '14px', marginBottom: '20px' }}>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontStyle: 'italic' }}>"{confirmMessage}"</p>
          </div>
        )}

        {/* Calendar — Google only */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '14px', marginBottom: '20px' }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
            Agregar al calendario
          </p>
          <a
            href={googleCalendarUrl()} target="_blank" rel="noopener noreferrer"
            style={{ display: 'block', padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px', fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}
          >
            📅 Agregar a Google Calendar
          </a>
        </div>

        <Link
          to={`/r/${slug}`}
          style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', textDecoration: 'none', fontFamily: 'var(--font-jakarta)' }}
        >
          ← Volver al menú
        </Link>
      </div>
    </div>
  )

  return null
}
