import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/hooks/useLanguage'
import toast from 'react-hot-toast'

interface FormData {
  name: string
  email: string
  business_name: string
  phone: string
  city: string
  message: string
}

const EMPTY: FormData = { name: '', email: '', business_name: '', phone: '', city: '', message: '' }

const BASE_INPUT: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: '10px',
  background: 'rgba(255,255,255,0.06)',
  color: '#fff',
  fontSize: '14px',
  fontFamily: 'var(--font-jakarta)',
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
  boxSizing: 'border-box',
}

function DarkInput({ label, required, ...props }: {
  label: string
  required?: boolean
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      <label style={{ display: 'block', fontFamily: 'var(--font-jakarta)', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: '6px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {label} {required && <span style={{ color: 'var(--ml-salmon)' }}>*</span>}
      </label>
      <input
        {...props}
        required={required}
        onFocus={e => { setFocused(true); props.onFocus?.(e) }}
        onBlur={e => { setFocused(false); props.onBlur?.(e) }}
        style={{
          ...BASE_INPUT,
          border: `1px solid ${focused ? 'var(--ml-salmon)' : 'rgba(255,255,255,0.1)'}`,
          boxShadow: focused ? '0 0 0 3px rgba(244,112,90,0.12)' : 'none',
        }}
      />
    </div>
  )
}

function DarkTextarea({ label, charCount, ...props }: {
  label: string
  charCount?: number
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      <label style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-jakarta)', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: '6px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        <span>{label}</span>
        {charCount !== undefined && <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>{charCount}/500</span>}
      </label>
      <textarea
        {...props}
        onFocus={e => { setFocused(true); props.onFocus?.(e) }}
        onBlur={e => { setFocused(false); props.onBlur?.(e) }}
        style={{
          ...BASE_INPUT as React.CSSProperties,
          resize: 'none',
          border: `1px solid ${focused ? 'var(--ml-salmon)' : 'rgba(255,255,255,0.1)'}`,
          boxShadow: focused ? '0 0 0 3px rgba(244,112,90,0.12)' : 'none',
        } as React.CSSProperties}
      />
    </div>
  )
}

export function AccessRequestPage() {
  const { t } = useTranslation()
  const { currentLang, toggleLanguage } = useLanguage()
  const [form, setForm] = useState<FormData>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState('')

  const update = (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }))

  const validate = (): boolean => {
    if (form.name.trim().length < 2) { toast.error(t('access_request.validation_name_min')); return false }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) { toast.error(t('access_request.validation_email_invalid')); return false }
    if (!form.business_name.trim()) { toast.error(t('access_request.validation_business_required')); return false }
    if (form.message.length > 500) { toast.error(t('access_request.validation_message_max')); return false }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const { error } = await supabase.from('access_requests').insert({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        business_name: form.business_name.trim(),
        phone: form.phone.trim() || null,
        city: form.city.trim() || null,
        message: form.message.trim() || null,
      })
      if (error) {
        if (error.code === '23505') { toast.error(t('access_request.error_duplicate')); return }
        throw error
      }
      setSubmittedEmail(form.email.trim().toLowerCase())
      setSubmitted(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('access_request.error_submit'))
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: '#0F1115', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ textAlign: 'center', maxWidth: '440px' }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: 'rgba(244,112,90,0.12)', border: '2px solid var(--ml-salmon)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
            animation: 'ml-float 3s ease-in-out infinite',
          }}>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--ml-salmon)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20,6 9,17 4,12" />
            </svg>
          </div>
          <h2 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: '28px', color: '#fff', marginBottom: '12px' }}>
            {t('access_request.success_title')}
          </h2>
          <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '15px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, marginBottom: '24px' }}>
            {t('access_request.success_subtitle')}<br />
            {t('access_request.success_email')} <span style={{ color: '#fff', fontWeight: 600 }}>{submittedEmail}</span>
          </p>
          <div style={{
            padding: '14px 18px',
            background: 'rgba(244,112,90,0.08)', border: '1px solid rgba(244,112,90,0.2)',
            borderRadius: '14px', marginBottom: '32px',
          }}>
            <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '13px', color: 'rgba(255,255,255,0.55)' }}>
              {t('access_request.success_follow')}{' '}
              <a href="https://instagram.com/menulife.app" target="_blank" rel="noopener noreferrer"
                style={{ color: 'var(--ml-salmon)', fontWeight: 600, textDecoration: 'none' }}>
                @menulife.app
              </a>
            </p>
          </div>
          <Link to="/" style={{ fontFamily: 'var(--font-jakarta)', fontSize: '13px', color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>
            {t('access_request.success_back')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0F1115' }} className="flex flex-col lg:flex-row">
      {/* Floating language toggle */}
      <button
        onClick={toggleLanguage}
        style={{
          position: 'fixed', top: '16px', right: '16px', zIndex: 100,
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '6px 12px', borderRadius: '50px',
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
          color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-jakarta)',
          fontSize: '12px', fontWeight: 600, cursor: 'pointer', backdropFilter: 'blur(8px)',
        }}
      >
        <Globe size={13} />
        {currentLang === 'es' ? 'ES' : 'EN'}
      </button>

      {/* Left panel — value prop (desktop only) */}
      <div
        className="hidden lg:flex lg:flex-col lg:justify-center"
        style={{
          width: '42%',
          flexShrink: 0,
          borderRight: '1px solid rgba(255,255,255,0.05)',
          padding: '64px 52px',
          position: 'relative', overflow: 'hidden',
        }}
      >
        {/* Salmon ambient glow */}
        <div style={{
          position: 'absolute', bottom: '-100px', left: '-100px',
          width: '500px', height: '500px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(244,112,90,0.1) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', textDecoration: 'none', marginBottom: '52px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'var(--ml-salmon)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: '18px',
          }}>M</div>
          <span style={{ color: '#fff', fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '20px' }}>MenuLife</span>
        </Link>

        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: 'rgba(244,112,90,0.1)', border: '1px solid rgba(244,112,90,0.25)',
          borderRadius: '50px', padding: '5px 14px',
          marginBottom: '20px', alignSelf: 'flex-start',
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--ml-salmon)', flexShrink: 0, animation: 'ml-chat-dot 1.2s ease-in-out infinite' }} />
          <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '12px', fontWeight: 600, color: 'var(--ml-salmon)' }}>
            {t('access_request.badge')}
          </span>
        </div>

        {/* Headline */}
        <h1 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 'clamp(30px,2.8vw,42px)', color: '#fff', lineHeight: 1.15, marginBottom: '16px' }}>
          {t('access_request.hero_title')}<br />
          <em style={{ color: 'var(--ml-salmon)', fontStyle: 'italic' }}>{t('access_request.hero_accent')}</em>
        </h1>
        <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '14px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.75, marginBottom: '36px', maxWidth: '300px' }}>
          {t('access_request.hero_subtitle')}
        </p>

        {/* Trust list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '36px' }}>
          {[
            { icon: '⚡', text: t('access_request.point_1') },
            { icon: '📱', text: t('access_request.point_2') },
            { icon: '📊', text: t('access_request.point_3') },
          ].map(({ icon, text }) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{
                width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px',
              }}>{icon}</span>
              <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>{text}</span>
            </div>
          ))}
        </div>

        {/* Testimonial */}
        <div style={{
          padding: '16px 18px',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
          borderLeft: '3px solid var(--ml-salmon)',
          borderRadius: '0 12px 12px 0',
        }}>
          <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '13px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, fontStyle: 'italic', margin: '0 0 8px' }}>
            "{t('access_request.testimonial')}"
          </p>
          <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: 600, margin: 0 }}>
            {t('access_request.testimonial_author')}
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{
        flex: 1,
        background: '#13161e',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        padding: '48px 24px',
        overflowY: 'auto',
      }}>
        {/* Mobile logo */}
        <Link to="/" className="flex lg:hidden" style={{ alignItems: 'center', gap: '10px', textDecoration: 'none', marginBottom: '28px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'var(--ml-salmon)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: '16px',
          }}>M</div>
          <span style={{ color: '#fff', fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '18px' }}>MenuLife</span>
        </Link>

        <div style={{
          width: '100%', maxWidth: '480px',
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '20px', padding: '32px 28px',
        }}>
          <h2 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: '20px', color: '#fff', margin: '0 0 4px' }}>
            {t('access_request.form_title')}
          </h2>
          <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '13px', color: 'rgba(255,255,255,0.3)', margin: '0 0 24px' }}>
            {t('access_request.form_subtitle')}
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <DarkInput
              label={t('access_request.field_name')} required
              placeholder={t('access_request.field_name_placeholder')}
              value={form.name}
              onChange={update('name')}
            />
            <DarkInput
              label={t('access_request.field_email')} required type="email"
              placeholder={t('access_request.field_email_placeholder')}
              value={form.email}
              onChange={update('email')}
            />
            <DarkInput
              label={t('access_request.field_business')} required
              placeholder={t('access_request.field_business_placeholder')}
              value={form.business_name}
              onChange={update('business_name')}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <DarkInput
                label={t('access_request.field_phone')} type="tel"
                placeholder={t('access_request.field_phone_placeholder')}
                value={form.phone}
                onChange={update('phone')}
              />
              <DarkInput
                label={t('access_request.field_city')}
                placeholder={t('access_request.field_city_placeholder')}
                value={form.city}
                onChange={update('city')}
              />
            </div>
            <DarkTextarea
              label={t('access_request.field_message')}
              charCount={form.message.length}
              placeholder={t('access_request.field_message_placeholder')}
              value={form.message}
              onChange={update('message')}
              maxLength={500}
              rows={3}
            />

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '14px',
                borderRadius: '50px', border: 'none',
                background: loading ? 'rgba(244,112,90,0.45)' : 'var(--ml-salmon)',
                color: '#fff', fontSize: '14px', fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-jakarta)',
                position: 'relative', overflow: 'hidden',
                transition: 'all 0.2s',
                marginTop: '4px',
              }}
              onMouseEnter={e => { if (!loading) { e.currentTarget.style.boxShadow = '0 0 28px rgba(244,112,90,0.45)'; e.currentTarget.style.transform = 'scale(1.01)' } }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = '' }}
            >
              {loading ? t('access_request.submit_loading') : t('access_request.submit_button')}
              {!loading && (
                <span style={{
                  position: 'absolute', top: 0, left: '-100%', width: '100%', height: '100%',
                  background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)',
                  animation: 'ml-shimmer 3s infinite',
                }} />
              )}
            </button>

            <p style={{ textAlign: 'center', fontFamily: 'var(--font-jakarta)', fontSize: '11px', color: 'rgba(255,255,255,0.2)', margin: 0 }}>
              {t('access_request.trust_1')}. {t('access_request.trust_2')}. {t('access_request.trust_3')}.
            </p>
          </form>
        </div>

        <p style={{ marginTop: '18px', fontFamily: 'var(--font-jakarta)', fontSize: '13px', color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
          {t('access_request.login_link')}{' '}
          <Link to="/login" style={{ color: 'var(--ml-salmon)', fontWeight: 600, textDecoration: 'none' }}>
            {t('access_request.login_cta')}
          </Link>
        </p>
      </div>
    </div>
  )
}
