// Columnas de `restaurants` que puede leer un visitante sin cuenta (menú público, catálogo, reservas, seguimiento del
// pedido, presupuesto, logins de mozo/delivery/cocina y la landing de referidos). La base le da a `anon` SELECT sólo
// sobre estas columnas (migración 20261108000001_restaurants_public_columns.sql): pedir `*` o una columna privada
// (email, teléfono, dirección, dueño, plan, suscripción, notas…) sin sesión devuelve "permission denied".
// Si una pantalla pública necesita otra columna, sumarla acá Y en la migración (lo verifica publicRestaurant.test.ts).
export const PUBLIC_RESTAURANT_COLUMNS = [
  'id', 'slug', 'name', 'is_active', 'business_type',
  'logo_url', 'cover_image_url', 'description', 'city', 'hub_category', 'social_links',
  'default_language', 'allow_language_switch', 'default_currency',
  'schedule', 'business_hours',
  'menu_accent_color', 'menu_card_style', 'show_prices', 'show_descriptions', 'show_calories',
  'delivery_enabled', 'delivery_time_estimate', 'delivery_min_order', 'delivery_fee_type', 'delivery_fee_value',
  'delivery_zones',
  'takeaway_enabled', 'takeaway_time_estimate',
  'reservations_enabled', 'reservations_collect_guests', 'reservations_advance_days', 'reservations_min_hours',
  'reservations_max_party', 'reservations_time_slots', 'reservations_message',
] as const

/** Para `.select(...)` de las pantallas públicas (nunca `select('*')` sin sesión). */
export const PUBLIC_RESTAURANT_SELECT = PUBLIC_RESTAURANT_COLUMNS.join(', ')
