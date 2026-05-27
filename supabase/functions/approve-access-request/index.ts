// Edge Function: approve-access-request
// Requires secrets in Supabase dashboard:
//   SUPABASE_SERVICE_ROLE_KEY  (auto-injected by Supabase)
//   SITE_URL = https://menulife.app  (add manually)
//
// SQL needed before this works:
//   ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
//
//   CREATE TABLE IF NOT EXISTS access_requests (
//     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
//     name TEXT NOT NULL,
//     email TEXT NOT NULL UNIQUE,
//     business_name TEXT NOT NULL,
//     phone TEXT,
//     city TEXT,
//     message TEXT,
//     status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
//     created_at TIMESTAMPTZ DEFAULT NOW(),
//     reviewed_at TIMESTAMPTZ,
//     reviewed_by UUID REFERENCES auth.users(id)
//   );
//   ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;
//   CREATE POLICY "Anyone can request access" ON access_requests FOR INSERT WITH CHECK (true);
//   CREATE POLICY "Superadmins view requests" ON access_requests FOR SELECT
//     USING (auth.uid() IN (SELECT user_id FROM super_admins));
//   CREATE POLICY "Superadmins update requests" ON access_requests FOR UPDATE
//     USING (auth.uid() IN (SELECT user_id FROM super_admins));
//
//   -- Allow superadmins to manage restaurants
//   CREATE POLICY "Superadmins view all restaurants" ON restaurants FOR SELECT
//     USING (auth.uid() IN (SELECT user_id FROM super_admins));
//   CREATE POLICY "Superadmins update restaurants" ON restaurants FOR UPDATE
//     USING (auth.uid() IN (SELECT user_id FROM super_admins));

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

    const body = await req.json() as { requestId: string; plan?: string }
    const { requestId } = body
    const plan = (['menu', 'pro', 'total'].includes(body.plan ?? '')) ? body.plan! : 'menu'

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

    // Create restaurant (rollback user on error)
    const { error: restaurantError } = await supabaseAdmin
      .from('restaurants')
      .insert({
        owner_id: newUser.id,
        slug,
        name: request.business_name,
        city: request.city ?? null,
        phone: request.phone ?? null,
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        subscription_status: 'trial',
        plan,
        onboarding_completed: false,
      })
    if (restaurantError) {
      await supabaseAdmin.auth.admin.deleteUser(newUser.id)
      return jsonResponse({ error: restaurantError.message }, 400)
    }

    // Send magic link email
    const siteUrl = Deno.env.get('SITE_URL') ?? 'http://localhost:5173'
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
      success: true,
      email: request.email,
      magicLink: linkData?.properties?.action_link ?? null,
    })
  } catch (err) {
    console.error('Unexpected error:', err)
    return jsonResponse({ error: String(err) }, 500)
  }
})
