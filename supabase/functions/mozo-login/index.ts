import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { create } from 'https://deno.land/x/djwt@v2.8/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { pin, restaurant_id } = await req.json()

    if (!pin || !restaurant_id) {
      throw new Error('PIN y restaurant_id son requeridos')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: mozo, error } = await supabase
      .from('waiters')
      .select('*')
      .eq('restaurant_id', restaurant_id)
      .eq('pin', pin)
      .eq('is_active', true)
      .single()

    if (error || !mozo) {
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

    return new Response(
      JSON.stringify({ token, mozo }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
