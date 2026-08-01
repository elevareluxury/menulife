import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { HubC } from '@/modules/hub/lib/themeConfig'

const db = supabase as any

interface ContactFormBlockProps {
  config: {
    title?: string
    showPhoneField?: boolean
    emailNotifications?: boolean
  }
  restaurantId: string
  C: HubC
}

const inputStyle = (C: HubC): React.CSSProperties => ({
  width: '100%',
  padding: '12px 16px',
  borderRadius: 14,
  border: `1px solid ${C.bdr}`,
  background: C.sur,
  color: C.t1,
  fontSize: 14,
  outline: 'none',
  fontFamily: "'DM Sans',sans-serif",
  boxSizing: 'border-box',
  WebkitAppearance: 'none',
})

export function ContactFormBlock({ config, restaurantId, C }: ContactFormBlockProps) {
  const {
    title = 'Contáctame',
    showPhoneField = false,
    emailNotifications = true,
  } = config

  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [phone, setPhone]     = useState('')
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !message.trim()) return
    setIsSending(true)
    setError(null)

    const { data: submission, error: insertError } = await db
      .from('hub_contact_submissions')
      .insert({
        restaurant_id: restaurantId,
        name:    name.trim(),
        email:   email.trim() || null,
        phone:   phone.trim() || null,
        message: message.trim(),
      })
      .select()
      .single()

    if (insertError) {
      setError('No pudimos enviar tu mensaje. Intentá de nuevo.')
      setIsSending(false)
      return
    }

    if (emailNotifications !== false) {
      try {
        await supabase.functions.invoke('send-contact-notification', {
          body: { submission_id: submission.id },
        })
      } catch (emailErr) {
        console.error('Email notification failed:', emailErr)
      }
    }

    setName('')
    setEmail('')
    setPhone('')
    setMessage('')
    setSuccess(true)
    setIsSending(false)
  }

  if (success) {
    return (
      <section style={{ width: '100%', padding: '0 20px', paddingTop: 32 }}>
        <div style={{
          background: C.sur,
          border: `1px solid ${C.bdr}`,
          borderRadius: 20,
          padding: '40px 20px',
          textAlign: 'center',
        }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: `${C.acc}20`,
            border: `1.5px solid ${C.acc}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: 22,
          }}>
            ✓
          </div>
          <p style={{
            color: C.t1,
            fontFamily: "'Syne',sans-serif",
            fontWeight: 700,
            fontSize: 18,
            margin: '0 0 8px',
          }}>
            ¡Mensaje enviado!
          </p>
          <p style={{ color: C.t3, fontSize: 13, margin: 0 }}>
            Te contactaremos a la brevedad.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section style={{ width: '100%', padding: '0 20px', paddingTop: 32 }}>
      <p style={{
        fontFamily: "'Syne',sans-serif",
        fontSize: 14,
        fontWeight: 700,
        color: C.t3,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: 16,
      }}>
        {title}
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          type="text"
          placeholder="Tu nombre *"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          style={inputStyle(C)}
        />

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={inputStyle(C)}
        />

        {showPhoneField && (
          <input
            type="tel"
            placeholder="Teléfono"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            style={inputStyle(C)}
          />
        )}

        <textarea
          placeholder="Tu mensaje *"
          value={message}
          onChange={e => setMessage(e.target.value)}
          required
          rows={4}
          style={{
            ...inputStyle(C),
            resize: 'none',
            lineHeight: 1.6,
          }}
        />

        {error && (
          <p style={{ color: C.red, fontSize: 13, margin: 0 }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={isSending || !name.trim() || !message.trim()}
          style={{
            padding: '14px',
            borderRadius: 14,
            border: 'none',
            background: C.acc,
            color: '#fff',
            fontSize: 15,
            fontWeight: 700,
            cursor: isSending ? 'wait' : 'pointer',
            opacity: (isSending || !name.trim() || !message.trim()) ? 0.6 : 1,
            fontFamily: "'DM Sans',sans-serif",
            transition: 'opacity 0.15s',
          }}
        >
          {isSending ? 'Enviando…' : 'Enviar mensaje'}
        </button>
      </form>
    </section>
  )
}
