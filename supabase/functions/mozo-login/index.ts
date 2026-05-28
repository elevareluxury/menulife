import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { create } from 'https://deno.land/x/djwt@v2.8/mod.ts'
import bcrypt from 'npm:bcryptjs'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { pin, restaurant_id, waiter_id } = await req.json()

    if (!pin || !restaurant_id || !waiter_id) {
      throw new Error('pin, restaurant_id y waiter_id son requeridos')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch waiter by id — do NOT filter by pin (it may be hashed)
    const { data: mozo, error } = await supabase
      .from('waiters')
      .select('id, first_name, last_name, avatar_url, is_active, is_on_shift, restaurant_id, pin')
      .eq('id', waiter_id)
      .eq('restaurant_id', restaurant_id)
      .eq('is_active', true)
      .single()

    if (error || !mozo) {
      return new Response(
        JSON.stringify({ error: 'PIN incorrecto' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify PIN — supports both bcrypt hashes and legacy plain text (progressive migration)
    const storedPin: string = mozo.pin ?? ''
    const isHashed = storedPin.startsWith('$2')
    let isValid = false

    if (isHashed) {
      isValid = await bcrypt.compare(pin, storedPin)
    } else {
      // Legacy plain-text comparison
      isValid = storedPin === pin
      if (isValid) {
        // Migrate to hashed on first successful plain-text login
        const newHash = await bcrypt.hash(pin, 10)
        await supabase.from('waiters').update({ pin: newHash }).eq('id', mozo.id)
      }
    }

    if (!isValid) {
      return new Response(
        JSON.stringify({ error: 'PIN incorrecto' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(Deno.env.get('JWT_SECRET') ?? 'your-secret-key'),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const token = await create(
      { alg: 'HS256', typ: 'JWT' },
      {
        mozo_id: mozo.id,
        restaurant_id: mozo.restaurant_id,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
      },
      key
    )

    // Never return the pin field to the client
    const { pin: _pin, ...mozoSafe } = mozo

    return new Response(
      JSON.stringify({ token, mozo: mozoSafe }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
