import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  const { to, firstName, restaurantName, date, time, partySize, status } = await req.json()

  // TODO: set RESEND_API_KEY in Supabase Dashboard → Edge Functions → Settings → Secrets
  if (!RESEND_API_KEY) {
    console.log('[send-reservation-email] RESEND_API_KEY not configured — email not sent', {
      to, firstName, restaurantName, date, time, partySize, status,
    })
    return new Response(JSON.stringify({ skipped: true, reason: 'RESEND_API_KEY not set' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const subject = status === 'confirmed'
    ? `✅ Reserva confirmada — ${restaurantName}`
    : `❌ Reserva cancelada — ${restaurantName}`

  const html = `
    <div style="font-family: Inter, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #0F1115;">
        ${status === 'confirmed' ? '¡Tu reserva está confirmada!' : 'Reserva cancelada'}
      </h2>
      <p>Hola ${firstName},</p>
      <p>${status === 'confirmed'
        ? `Te esperamos en <strong>${restaurantName}</strong>.`
        : `Lamentablemente tu reserva en <strong>${restaurantName}</strong> fue cancelada.`
      }</p>
      <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>📅 Fecha:</strong> ${date}</p>
        <p style="margin: 4px 0;"><strong>🕐 Hora:</strong> ${time}</p>
        <p style="margin: 4px 0;"><strong>👥 Personas:</strong> ${partySize}</p>
      </div>
      ${status === 'confirmed'
        ? '<p>Si necesitás cancelar o modificar, contactanos directamente.</p>'
        : '<p>Podés hacer una nueva reserva cuando quieras.</p>'
      }
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="font-size: 12px; color: #999;">Enviado por MenuLife</p>
    </div>
  `

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'MenuLife <reservas@menulife.digital>',
      to: [to],
      subject,
      html,
    }),
  })

  const data = await res.json()
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  })
})
