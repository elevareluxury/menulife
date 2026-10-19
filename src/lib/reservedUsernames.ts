// Usernames / slugs que nadie puede registrar. Mantener sincronizado con `reserved_usernames` en la base
// (supabase/migrations/20261001000001_mycen_profiles_foundation.sql y las que suman nombres después, como
// 20261110000001_reserved_usernames_expand.sql); tests/unit/reservedUsernames.test.ts falla si se desincronizan.
// La base sólo valida al crear o cambiar el username: quien ya tenía uno de estos nombres lo conserva.

/**
 * Rutas y nombres técnicos del sistema: `/{nombre}` es la app, no un perfil. Las páginas públicas y el prefetch del
 * perfil los saltean. Sumar acá sólo rutas reales: un nombre nuevo deja de mostrar el perfil de quien ya lo tenga.
 */
export const SYSTEM_USERNAMES: ReadonlySet<string> = new Set([
  // Rutas existentes de la app
  'dashboard', 'login', 'logout', 'register', 'signup', 'auth', 'forgot-password', 'reset-password',
  'solicitar-acceso', 'onboarding', 'life', 'portal', 'q', 'r', 'kitchen', 'mozo', 'waiter',
  'delivery', 'super-admin', 'superadmin', 'catalogo', 'catalog',
  // Rutas de Mycen (actuales y futuras)
  'studio', 'profile', 'profiles', 'exchange', 'analytics', 'settings', 'business', 'hub',
  'intelligence', 'explore', 'pricing', 'precios', 'planes', 'about', 'acerca', 'help', 'ayuda',
  'support', 'soporte', 'contact', 'contacto', 'terms', 'terminos', 'privacy', 'privacidad', 'eliminar-cuenta',
  'legal', 'blog', 'docs', 'status', 'jobs',
  // Técnicas
  'api', 'cal', 'app', 'www', 'admin', 'root', 'static', 'assets', 'public', 'cdn', 'offline', 'sw',
  'manifest', 'favicon', 'robots', 'sitemap', 'og', 'well-known', 'null', 'undefined',
  // Marca
  'mycen', 'menulife', 'resilio', 'official', 'oficial',
])

/** Palabras que harían pasar a alguien por Mycen, su equipo o su soporte (no son rutas). */
export const STAFF_USERNAMES: ReadonlySet<string> = new Set([
  // Variantes de la marca
  'mycenid', 'mycen-id', 'mycenapp', 'mycen-app', 'mycenhq', 'mycen-hq', 'getmycen', 'mycen-official',
  'mycenofficial', 'mycen-oficial', 'mycenoficial', 'mycen-support', 'mycensupport', 'mycen-soporte',
  'mycensoporte', 'mycen-help', 'mycenhelp', 'mycen-ayuda', 'mycenayuda', 'mycen-team', 'mycenteam',
  'mycen-equipo', 'mycenequipo', 'mycen-staff', 'mycenstaff', 'mycen-admin', 'mycenadmin', 'mycen-security',
  'mycen-seguridad', 'mycen-legal', 'mycen-status', 'mycen-news', 'mycen-blog', 'team-mycen', 'teammycen',
  'equipo-mycen', 'soporte-mycen', 'support-mycen',
  // Equipo, moderación y confianza
  'staff', 'team', 'equipo', 'moderacion', 'moderation', 'moderador', 'moderadora', 'moderator', 'mod', 'mods',
  'administrador', 'administradora', 'administrator', 'sysadmin', 'system', 'sistema', 'owner', 'founder',
  'verificado', 'verificada', 'verified', 'verificacion', 'verification', 'verify', 'verificar',
  'security', 'seguridad', 'trust', 'safety', 'trust-safety', 'abuse', 'abuso', 'report', 'reportar',
  'denuncia', 'denuncias', 'compliance',
  // Soporte y comunicación oficial
  'helpdesk', 'help-center', 'centro-de-ayuda', 'soporte-tecnico', 'customer-service', 'atencion-al-cliente',
  'info', 'informacion', 'noreply', 'no-reply', 'postmaster', 'webmaster', 'hostmaster', 'mailer-daemon',
  'mail', 'email', 'correo', 'notificaciones', 'notifications', 'news', 'novedades', 'noticias', 'press',
  'prensa', 'careers', 'empleos', 'trabajos', 'developers', 'developer', 'dev', 'billing', 'facturacion',
  'pagos', 'payments', 'account', 'accounts', 'cuenta', 'cuentas', 'password', 'contrasena', 'login-help',
  'cookies', 'gdpr', 'dmca', 'copyright',
])

/** Marcas y servicios muy conocidos que alguien podría querer suplantar. */
export const BRAND_USERNAMES: ReadonlySet<string> = new Set([
  // Tecnología y redes
  'apple', 'icloud', 'iphone', 'google', 'gmail', 'youtube', 'android', 'meta', 'facebook', 'instagram', 'whatsapp',
  'microsoft', 'windows', 'outlook', 'hotmail', 'xbox', 'linkedin', 'github', 'amazon', 'aws', 'twitch', 'tiktok',
  'twitter', 'xcom', 'x-com', 'snapchat', 'pinterest', 'reddit', 'discord', 'telegram', 'wechat', 'onlyfans',
  'patreon', 'linktree', 'tinder', 'yahoo', 'bing', 'firefox', 'chrome', 'samsung', 'huawei', 'xiaomi', 'sony',
  'playstation', 'nintendo', 'steam', 'roblox', 'tesla', 'spacex', 'nvidia', 'intel', 'amd', 'ibm', 'adobe',
  'canva', 'figma', 'notion', 'slack', 'zoom', 'dropbox', 'wordpress', 'wix',
  // Inteligencia artificial
  'openai', 'chatgpt', 'anthropic', 'claude', 'copilot', 'midjourney', 'perplexity',
  // Pagos, bancos y cripto
  'paypal', 'venmo', 'cashapp', 'zelle', 'stripe', 'mercadopago', 'mercado-pago', 'mercadolibre', 'mercado-libre',
  'revolut', 'nubank', 'uala', 'binance', 'coinbase', 'metamask', 'visa', 'mastercard', 'amex', 'americanexpress',
  'westernunion', 'bitcoin', 'ethereum', 'santander', 'bbva', 'itau', 'bancolombia', 'nequi', 'yape', 'pix',
  // Streaming y medios
  'netflix', 'spotify', 'disney', 'hbo', 'primevideo', 'soundcloud', 'cnn', 'bbc',
  // Comercio, viajes y comida
  'shopify', 'ebay', 'aliexpress', 'alibaba', 'temu', 'shein', 'walmart', 'ikea', 'nike', 'adidas', 'uber', 'lyft',
  'cabify', 'rappi', 'pedidosya', 'ifood', 'glovo', 'doordash', 'airbnb', 'booking', 'expedia', 'tripadvisor',
  'cocacola', 'coca-cola', 'mcdonalds', 'starbucks',
  // Organismos
  'fbi', 'cia', 'nasa', 'unicef', 'fifa', 'nba',
])

/** Palabras que no deberían ser una dirección pública: insultos comunes (español e inglés) y términos de odio. */
export const BLOCKED_USERNAMES: ReadonlySet<string> = new Set([
  // Insultos en español
  'puta', 'putas', 'puto', 'putos', 'puton', 'mierda', 'pendejo', 'pendeja', 'boludo', 'boluda', 'pelotudo',
  'pelotuda', 'gilipollas', 'cabron', 'cabrona', 'hijodeputa', 'hijo-de-puta', 'hdp', 'malparido',
  'malparida', 'gonorrea', 'verga', 'chupapija', 'mamaguevo', 'culiao', 'culiado', 'conchetumare',
  'conchatumadre', 'pajero', 'pajera', 'culo', 'imbecil', 'idiota', 'estupido', 'estupida',
  'tarado', 'retrasado', 'mogolico',
  // Insultos en inglés
  'fuck', 'fucker', 'fucking', 'fuckyou', 'fuck-you', 'motherfucker', 'shit', 'bullshit', 'bitch', 'bitches',
  'asshole', 'dickhead', 'cunt', 'pussy', 'whore', 'slut', 'bastard', 'wanker', 'twat', 'prick', 'douchebag',
  'jackass', 'dumbass', 'retard', 'retarded',
  // Contenido sexual
  'porn', 'porno', 'pornhub', 'xxx', 'nsfw', 'sex', 'sexo',
  // Odio
  'nazi', 'nazis', 'neonazi', 'hitler', 'heilhitler', 'siegheil', 'kkk', 'whitepower', 'white-power', '1488',
  'nigger', 'niggers', 'nigga', 'faggot', 'fag', 'kike', 'spic', 'chink', 'tranny', 'beaner', 'wetback',
  'gook', 'paki', 'maricon', 'marica', 'trolo', 'sudaca', 'negrata',
])

/** Todo lo que nadie puede elegir como username (lo que valida la base). */
export const RESERVED_USERNAMES: ReadonlySet<string> = new Set([
  ...SYSTEM_USERNAMES, ...STAFF_USERNAMES, ...BRAND_USERNAMES, ...BLOCKED_USERNAMES,
])

const norm = (value: string) => value.trim().toLowerCase()

/** ¿Está prohibido elegirlo como username? (onboarding, Studio) */
export function isReservedUsername(value: string): boolean {
  return RESERVED_USERNAMES.has(norm(value))
}

/** ¿`/{value}` es una ruta del sistema y no un perfil? (páginas públicas) */
export function isSystemUsername(value: string): boolean {
  return SYSTEM_USERNAMES.has(norm(value))
}

/** Si el slug generado choca con un nombre reservado, le agrega un sufijo estable. */
export function avoidReservedSlug(slug: string): string {
  return isReservedUsername(slug) ? `${slug}-1` : slug
}
