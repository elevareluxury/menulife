// Edge Function: approve-access-request
// Requires secrets in Supabase dashboard:
//   SUPABASE_SERVICE_ROLE_KEY  (auto-injected by Supabase)
//   SITE_URL = https://menulife.app  (add manually)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

const DEFAULT_FEATURES: Record<string, Record<string, boolean>> = {
  menu: {
    delivery: false, takeaway: false, reservations: false,
    advanced_analytics: false, pdf_import: false,
    multi_language: true, custom_branding: false,
  },
  pro: {
    delivery: true, takeaway: true, reservations: true,
    advanced_analytics: true, pdf_import: true,
    multi_language: true, custom_branding: true,
  },
  total: {
    delivery: true, takeaway: true, reservations: true,
    advanced_analytics: true, pdf_import: true,
    multi_language: true, custom_branding: true,
  },
}

const DEFAULT_ONBOARDING = {
  logo_uploaded:      false,
  products_added:     false,
  tables_created:     false,
  waiters_registered: false,
  qr_generated:       false,
  first_order:        false,
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verify caller JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonResponse({ error: 'Unauthorized' }, 401)

    const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !callerUser) return jsonResponse({ error: 'Unauthorized' }, 401)

    // Verify superadmin
    const { data: superAdmin } = await supabaseAdmin
      .from('super_admins')
      .select('id')
      .eq('user_id', callerUser.id)
      .maybeSingle()
    if (!superAdmin) return jsonResponse({ error: 'Forbidden: superadmin only' }, 403)

    const body = await req.json() as {
      requestId: string
      plan?: string
      features?: Record<string, boolean>
    }

    const { requestId } = body
    const plan = (['menu', 'pro', 'total'].includes(body.plan ?? '')) ? body.plan! : 'menu'
    const features = body.features ?? DEFAULT_FEATURES[plan] ?? DEFAULT_FEATURES['menu']

    // Get pending request
    const { data: request, error: reqError } = await supabaseAdmin
      .from('access_requests')
      .select('*')
      .eq('id', requestId)
      .eq('status', 'pending')
      .single()
    if (reqError || !request) return jsonResponse({ error: 'Solicitud no encontrada o ya procesada' }, 404)

    // Create auth user
    const { data: { user: newUser }, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: request.email,
      email_confirm: true,
      user_metadata: { name: request.name, business_name: request.business_name },
    })
    if (createError || !newUser) {
      return jsonResponse({ error: createError?.message ?? 'Error creando usuario' }, 400)
    }

    // Build unique slug
    const baseSlug = (request.business_name as string)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 40)
    const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`

    // Create restaurant
    const { data: restaurant, error: restaurantError } = await supabaseAdmin
      .from('restaurants')
      .insert({
        owner_id:          newUser.id,
        slug,
        name:              request.business_name,
        email:             request.email,
        city:              request.city  ?? null,
        phone:             request.phone ?? null,
        plan,
        features,
        onboarding_steps:  DEFAULT_ONBOARDING,
        subscription_status: 'trial',
        trial_ends_at:     new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        is_active:         true,
        onboarding_completed: false,
      })
      .select('id')
      .single()

    if (restaurantError) {
      await supabaseAdmin.auth.admin.deleteUser(newUser.id)
      return jsonResponse({ error: restaurantError.message }, 400)
    }

    // Log the action
    await supabaseAdmin.from('admin_logs').insert({
      admin_id:    callerUser.id,
      action:      'approve_request',
      target_type: 'access_request',
      target_id:   requestId,
      details:     { plan, features, restaurant_id: restaurant?.id },
    })

    // Send magic link email
    const siteUrl = Deno.env.get('SITE_URL') ?? 'https://menulife.app'
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: request.email,
      options: { redirectTo: `${siteUrl}/onboarding` },
    })
    if (linkError) console.error('Magic link error:', linkError.message)

    // Mark request approved
    await supabaseAdmin
      .from('access_requests')
      .update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: callerUser.id })
      .eq('id', requestId)

    return jsonResponse({
      success:     true,
      email:       request.email,
      restaurantId: restaurant?.id,
      magicLink:   linkData?.properties?.action_link ?? null,
    })
  } catch (err) {
    console.error('Unexpected error:', err)
    return jsonResponse({ error: String(err) }, 500)
  }
})
