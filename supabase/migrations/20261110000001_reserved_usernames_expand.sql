-- =============================================================================
-- Nombres reservados para el lanzamiento: nadie puede registrar una dirección mycen.id/{usuario} que confunda o
-- suplante. Se suman a reserved_usernames (la lista de src/lib/reservedUsernames.ts; el test de unidad falla si se
-- desincronizan), con el motivo en `reason`:
--   · staff:   equipo, soporte, moderación, verificación y variantes de la marca (mycenid, mycen-support…)
--   · brand:   marcas y servicios muy conocidos (apple, google, paypal, mercadopago, openai…)
--   · blocked: insultos comunes en español e inglés y términos de odio evidentes
--
-- La validación (mycen_validate_username, check_username) sólo mira el nombre al crear un perfil o al cambiarle el
-- username: quien ya tenía uno de estos nombres lo conserva y su perfil sigue publicado. Esta migración no toca
-- ningún perfil. Para ver si alguno ya está tomado:
--   select p.username, r.reason, p.status, p.created_at
--   from public.profiles p join public.reserved_usernames r on r.username = p.username
--   where r.reason in ('staff', 'brand', 'blocked') order by r.reason, p.username;
--
-- Idempotente (on conflict do nothing). Deshacer:
--   delete from public.reserved_usernames where reason in ('staff', 'brand', 'blocked');
-- =============================================================================
begin;

insert into public.reserved_usernames (username, reason) values
  -- Equipo, soporte y variantes de la marca
  ('mycenid','staff'),('mycen-id','staff'),('mycenapp','staff'),('mycen-app','staff'),('mycenhq','staff'),
  ('mycen-hq','staff'),('getmycen','staff'),('mycen-official','staff'),('mycenofficial','staff'),
  ('mycen-oficial','staff'),('mycenoficial','staff'),('mycen-support','staff'),('mycensupport','staff'),
  ('mycen-soporte','staff'),('mycensoporte','staff'),('mycen-help','staff'),('mycenhelp','staff'),
  ('mycen-ayuda','staff'),('mycenayuda','staff'),('mycen-team','staff'),('mycenteam','staff'),
  ('mycen-equipo','staff'),('mycenequipo','staff'),('mycen-staff','staff'),('mycenstaff','staff'),
  ('mycen-admin','staff'),('mycenadmin','staff'),('mycen-security','staff'),('mycen-seguridad','staff'),
  ('mycen-legal','staff'),('mycen-status','staff'),('mycen-news','staff'),('mycen-blog','staff'),
  ('team-mycen','staff'),('teammycen','staff'),('equipo-mycen','staff'),('soporte-mycen','staff'),
  ('support-mycen','staff'),('staff','staff'),('team','staff'),('equipo','staff'),('moderacion','staff'),
  ('moderation','staff'),('moderador','staff'),('moderadora','staff'),('moderator','staff'),('mod','staff'),
  ('mods','staff'),('administrador','staff'),('administradora','staff'),('administrator','staff'),
  ('sysadmin','staff'),('system','staff'),('sistema','staff'),('owner','staff'),('founder','staff'),
  ('verificado','staff'),('verificada','staff'),('verified','staff'),('verificacion','staff'),
  ('verification','staff'),('verify','staff'),('verificar','staff'),('security','staff'),('seguridad','staff'),
  ('trust','staff'),('safety','staff'),('trust-safety','staff'),('abuse','staff'),('abuso','staff'),
  ('report','staff'),('reportar','staff'),('denuncia','staff'),('denuncias','staff'),('compliance','staff'),
  ('helpdesk','staff'),('help-center','staff'),('centro-de-ayuda','staff'),('soporte-tecnico','staff'),
  ('customer-service','staff'),('atencion-al-cliente','staff'),('info','staff'),('informacion','staff'),
  ('noreply','staff'),('no-reply','staff'),('postmaster','staff'),('webmaster','staff'),('hostmaster','staff'),
  ('mailer-daemon','staff'),('mail','staff'),('email','staff'),('correo','staff'),('notificaciones','staff'),
  ('notifications','staff'),('news','staff'),('novedades','staff'),('noticias','staff'),('press','staff'),
  ('prensa','staff'),('careers','staff'),('empleos','staff'),('trabajos','staff'),('developers','staff'),
  ('developer','staff'),('dev','staff'),('billing','staff'),('facturacion','staff'),('pagos','staff'),
  ('payments','staff'),('account','staff'),('accounts','staff'),('cuenta','staff'),('cuentas','staff'),
  ('password','staff'),('contrasena','staff'),('login-help','staff'),('cookies','staff'),('gdpr','staff'),
  ('dmca','staff'),('copyright','staff'),
  -- Marcas y servicios conocidos
  ('apple','brand'),('icloud','brand'),('iphone','brand'),('google','brand'),('gmail','brand'),
  ('youtube','brand'),('android','brand'),('meta','brand'),('facebook','brand'),('instagram','brand'),
  ('whatsapp','brand'),('microsoft','brand'),('windows','brand'),('outlook','brand'),('hotmail','brand'),
  ('xbox','brand'),('linkedin','brand'),('github','brand'),('amazon','brand'),('aws','brand'),
  ('twitch','brand'),('tiktok','brand'),('twitter','brand'),('xcom','brand'),('x-com','brand'),
  ('snapchat','brand'),('pinterest','brand'),('reddit','brand'),('discord','brand'),('telegram','brand'),
  ('wechat','brand'),('onlyfans','brand'),('patreon','brand'),('linktree','brand'),('tinder','brand'),
  ('yahoo','brand'),('bing','brand'),('firefox','brand'),('chrome','brand'),('samsung','brand'),
  ('huawei','brand'),('xiaomi','brand'),('sony','brand'),('playstation','brand'),('nintendo','brand'),
  ('steam','brand'),('roblox','brand'),('tesla','brand'),('spacex','brand'),('nvidia','brand'),
  ('intel','brand'),('amd','brand'),('ibm','brand'),('adobe','brand'),('canva','brand'),('figma','brand'),
  ('notion','brand'),('slack','brand'),('zoom','brand'),('dropbox','brand'),('wordpress','brand'),
  ('wix','brand'),('openai','brand'),('chatgpt','brand'),('anthropic','brand'),('claude','brand'),
  ('copilot','brand'),('midjourney','brand'),('perplexity','brand'),('paypal','brand'),('venmo','brand'),
  ('cashapp','brand'),('zelle','brand'),('stripe','brand'),('mercadopago','brand'),('mercado-pago','brand'),
  ('mercadolibre','brand'),('mercado-libre','brand'),('revolut','brand'),('nubank','brand'),('uala','brand'),
  ('binance','brand'),('coinbase','brand'),('metamask','brand'),('visa','brand'),('mastercard','brand'),
  ('amex','brand'),('americanexpress','brand'),('westernunion','brand'),('bitcoin','brand'),
  ('ethereum','brand'),('santander','brand'),('bbva','brand'),('itau','brand'),('bancolombia','brand'),
  ('nequi','brand'),('yape','brand'),('pix','brand'),('netflix','brand'),('spotify','brand'),('disney','brand'),
  ('hbo','brand'),('primevideo','brand'),('soundcloud','brand'),('cnn','brand'),('bbc','brand'),
  ('shopify','brand'),('ebay','brand'),('aliexpress','brand'),('alibaba','brand'),('temu','brand'),
  ('shein','brand'),('walmart','brand'),('ikea','brand'),('nike','brand'),('adidas','brand'),('uber','brand'),
  ('lyft','brand'),('cabify','brand'),('rappi','brand'),('pedidosya','brand'),('ifood','brand'),
  ('glovo','brand'),('doordash','brand'),('airbnb','brand'),('booking','brand'),('expedia','brand'),
  ('tripadvisor','brand'),('cocacola','brand'),('coca-cola','brand'),('mcdonalds','brand'),
  ('starbucks','brand'),('fbi','brand'),('cia','brand'),('nasa','brand'),('unicef','brand'),('fifa','brand'),
  ('nba','brand'),
  -- Insultos y términos de odio
  ('puta','blocked'),('putas','blocked'),('puto','blocked'),('putos','blocked'),('puton','blocked'),
  ('mierda','blocked'),('pendejo','blocked'),('pendeja','blocked'),('boludo','blocked'),('boluda','blocked'),
  ('pelotudo','blocked'),('pelotuda','blocked'),('gilipollas','blocked'),('cabron','blocked'),
  ('cabrona','blocked'),('hijodeputa','blocked'),('hijo-de-puta','blocked'),('hdp','blocked'),
  ('malparido','blocked'),('malparida','blocked'),('gonorrea','blocked'),('verga','blocked'),
  ('chupapija','blocked'),('mamaguevo','blocked'),('culiao','blocked'),('culiado','blocked'),
  ('conchetumare','blocked'),('conchatumadre','blocked'),('pajero','blocked'),('pajera','blocked'),
  ('culo','blocked'),('imbecil','blocked'),('idiota','blocked'),('estupido','blocked'),('estupida','blocked'),
  ('tarado','blocked'),('retrasado','blocked'),('mogolico','blocked'),('fuck','blocked'),('fucker','blocked'),
  ('fucking','blocked'),('fuckyou','blocked'),('fuck-you','blocked'),('motherfucker','blocked'),
  ('shit','blocked'),('bullshit','blocked'),('bitch','blocked'),('bitches','blocked'),('asshole','blocked'),
  ('dickhead','blocked'),('cunt','blocked'),('pussy','blocked'),('whore','blocked'),('slut','blocked'),
  ('bastard','blocked'),('wanker','blocked'),('twat','blocked'),('prick','blocked'),('douchebag','blocked'),
  ('jackass','blocked'),('dumbass','blocked'),('retard','blocked'),('retarded','blocked'),('porn','blocked'),
  ('porno','blocked'),('pornhub','blocked'),('xxx','blocked'),('nsfw','blocked'),('sex','blocked'),
  ('sexo','blocked'),('nazi','blocked'),('nazis','blocked'),('neonazi','blocked'),('hitler','blocked'),
  ('heilhitler','blocked'),('siegheil','blocked'),('kkk','blocked'),('whitepower','blocked'),
  ('white-power','blocked'),('1488','blocked'),('nigger','blocked'),('niggers','blocked'),('nigga','blocked'),
  ('faggot','blocked'),('fag','blocked'),('kike','blocked'),('spic','blocked'),('chink','blocked'),
  ('tranny','blocked'),('beaner','blocked'),('wetback','blocked'),('gook','blocked'),('paki','blocked'),
  ('maricon','blocked'),('marica','blocked'),('trolo','blocked'),('sudaca','blocked'),('negrata','blocked')
on conflict (username) do nothing;

commit;
