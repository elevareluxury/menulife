-- =============================================================================
-- MYCEN · Fase 0 · Verificación (SOLO LECTURA) — correr al final y pasarle el
-- resultado (una celda JSON) a Claude.
-- =============================================================================

select jsonb_pretty(jsonb_build_object(
  'profiles', (
    select jsonb_agg(jsonb_build_object(
      'username', p.username, 'display_name', p.display_name, 'status', p.status,
      'is_primary', p.is_primary, 'has_business', p.restaurant_id is not null,
      'primary_action', p.primary_action ->> 'label',
      'modules', (select jsonb_object_agg(t, n) from (
                    select m.type as t, count(*) as n from public.profile_modules m
                    where m.profile_id = p.id and m.deleted_at is null group by m.type) x),
      'events', (select count(*) from public.profile_events e where e.profile_id = p.id)
    ) order by p.created_at)
    from public.profiles p
  ),
  'restaurants_without_profile', (
    select jsonb_agg(r.slug) from public.restaurants r
    where not exists (select 1 from public.profiles p where p.restaurant_id = r.id)
  ),
  'public_rpc_sample', (
    select public.get_public_profile(username) - 'modules' - 'translations'
    from public.profiles where status = 'published' order by created_at limit 1
  ),
  'mp_token_column_still_exists', exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'restaurants' and column_name = 'mercadopago_access_token'
  ),
  'profile_media_bucket', exists (select 1 from storage.buckets where id = 'profile-media'),
  'reserved_usernames', (select count(*) from public.reserved_usernames)
)) as mycen_verify;
