-- =============================================================================
-- Acentos nuevos (después de la etapa 15): a plasma, ion, nebulosa y aurora se suman sol, rosa, lima, luna, mono,
-- grafito, pizarra y arena. Los colores viven en src/design/tokens.css y src/design/themes.ts; la base sólo valida
-- los nombres. La conversión de colores libres de antes (mycen_nearest_accent) no cambia: sigue eligiendo entre los
-- 4 originales. Idempotente.
-- =============================================================================

begin;

create or replace function public.mycen_valid_profile_look(p_theme jsonb)
returns boolean language sql immutable as $$
  select p_theme is null or (
    jsonb_typeof(p_theme) = 'object'
    and (p_theme -> 'layout' is null
         or p_theme ->> 'layout' in ('credencial', 'portada', 'editorial', 'bento', 'clasica'))
    and (p_theme -> 'mode' is null
         or p_theme ->> 'mode' in ('universo', 'amanecer', 'dark', 'light', 'auto'))
    and (p_theme -> 'accent' is null
         or p_theme ->> 'accent' in ('plasma', 'ion', 'nebulosa', 'aurora', 'sol', 'rosa', 'lima', 'luna', 'mono', 'grafito', 'pizarra', 'arena')
         or p_theme ->> 'accent' ~ '^#[0-9A-Fa-f]{6}$')
    and (p_theme -> 'huella_variant' is null
         or p_theme ->> 'huella_variant' in ('orbitas', 'hilos', 'constelacion', 'pulso'))
    and (p_theme -> 'cover' is null or jsonb_typeof(p_theme -> 'cover') = 'null' or (
         jsonb_typeof(p_theme -> 'cover') = 'object'
         and p_theme -> 'cover' ->> 'type' in ('huella', 'imagen')
         and (p_theme -> 'cover' -> 'url' is null or jsonb_typeof(p_theme -> 'cover' -> 'url') = 'null' or (
              jsonb_typeof(p_theme -> 'cover' -> 'url') = 'string'
              and char_length(p_theme -> 'cover' ->> 'url') <= 2048
              and p_theme -> 'cover' ->> 'url' ~ '^https://')))))
$$;

create or replace function public.mycen_upgrade_theme(p_theme jsonb)
returns jsonb language sql immutable as $$
  select coalesce(p_theme, '{}'::jsonb) || jsonb_build_object(
    'layout', case when p_theme ->> 'layout' in ('credencial', 'portada', 'editorial', 'bento', 'clasica')
                   then p_theme ->> 'layout' else 'clasica' end,
    'mode', case when p_theme ->> 'mode' in ('light', 'amanecer') then 'amanecer' else 'universo' end,
    'accent', case
      when p_theme ->> 'accent' in ('plasma', 'ion', 'nebulosa', 'aurora', 'sol', 'rosa', 'lima', 'luna', 'mono', 'grafito', 'pizarra', 'arena') then p_theme ->> 'accent'
      when p_theme ->> 'accent' ~ '^#?[0-9A-Fa-f]{6}$' then public.mycen_nearest_accent(p_theme ->> 'accent')
      else 'plasma' end)
$$;

commit;
