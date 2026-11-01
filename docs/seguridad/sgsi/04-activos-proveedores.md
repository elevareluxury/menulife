# 04 · Activos, proveedores y registro de tratamientos

## Inventario de activos (27001 A.5.9–5.11)

| Activo | Dónde | Dueño | Clasificación |
|---|---|---|---|
| Base de datos de producción (cuentas, perfiles, Life OS, mensajes, suscriptores) | Supabase (proyecto `fcuiolmzfnhxyukkyeht`) | Responsable técnico | Confidencial / Personal |
| Archivos subidos (fotos de perfil, módulos, PDFs) | Supabase Storage (`profile-media`, `profile-files`, buckets de Business) | Responsable técnico | Público por link (sin listado) |
| Código fuente, migraciones, CI | GitHub `elevareluxury/menulife` (privado) | Responsable técnico | Interno |
| Aplicación web y funciones `api/` | Vercel (proyecto `menulife`) | Responsable técnico | Público |
| Dominio y DNS `mycen.id` (+ `menulife.digital` redirigido) | Registrador / Vercel | Dirección | Crítico |
| Envío de mails (`team@mycen.id`, mails de la cuenta) | Resend + casilla de correo | Responsable técnico | Interno |
| Claves y secretos (service role, Resend, Turnstile, Google, Apple, push) | Paneles de cada proveedor | Responsable técnico | Secreto |
| Apps de iOS y Android | App Store Connect / Google Play Console | Dirección | Público |
| Cuentas de administración de todo lo anterior | Cada proveedor, con 2FA | Dirección | Secreto |

### Clasificación

- **Secreto:** claves y accesos de administración. Sólo en paneles y gestor de contraseñas; nunca en el repo, chats ni
  mails. Si se expone: rotar ([plan ante incidentes](../../lanzamiento/incidentes.md#rotar-claves)).
- **Confidencial / Personal:** todo lo que es de una cuenta (Life OS, mensajes, suscriptores, email). RLS: sólo su dueño.
- **Interno:** código, métricas agregadas, errores. Equipo.
- **Público:** lo que la persona publica en su perfil.

## Proveedores y subencargados (27001 A.5.19–5.23 · SOC 2 CC9.2 · 27701 7.5)

Se revisa cada año (certificaciones vigentes, DPA, región y cambios de subencargados). Un proveedor nuevo entra a esta
tabla y a la política de privacidad (12 idiomas) **antes** de usarse.

| Proveedor | Para qué | Datos | Certificaciones | DPA |
|---|---|---|---|---|
| Supabase | Base de datos, acceso, archivos | Todos los de la cuenta | SOC 2 Tipo II; infraestructura AWS (ISO 27001) | Sí (supabase.com/legal/dpa) |
| Vercel | Web y funciones `api/` | Pedidos HTTP (sin guardar IP en Mycen) | SOC 2 Tipo II, ISO 27001 | Sí (vercel.com/legal/dpa) |
| Resend | Mails de la cuenta | Email y contenido del mail | SOC 2 Tipo II | Sí |
| Cloudflare (Turnstile) | Anti-bots en registro y acceso | Señales del navegador durante la verificación | SOC 2 Tipo II, ISO 27001 | Sí |
| Google (OAuth) / Apple (Sign in) | Iniciar sesión | Nombre, email, foto (sólo si la persona elige) | ISO 27001 | Términos del proveedor |
| YouTube, Vimeo, Spotify, SoundCloud, TikTok | Reproductores | Sólo al tocar "Reproducir" (antes, nada) | Propias | Políticas propias (informado en privacidad) |
| Hosting del podcast del dueño | Audio del podcast | Sólo al tocar "Escuchar" | — | Informado en privacidad |
| Anthropic | Importar menú desde PDF (Business) | El PDF que sube el negocio | SOC 2 Tipo II, ISO 27001 | Sí. **Se deja de usar al borrar `import-menu-pdf`** (actualizar privacidad entonces) |
| Mercado Pago | Cobros de Business | Pago en Mercado Pago | PCI DSS | Términos del proveedor |
| Apple App Store / Google Play | Distribución de las apps | Descarga e instalación | ISO 27001 | Términos del proveedor |

## Registro de tratamientos (27701 7.2.8 · GDPR art. 30 · Ley 25.326)

| Tratamiento | Datos | Personas | Finalidad | Base legal | Plazo | Destinatarios |
|---|---|---|---|---|---|---|
| Cuenta | Nombre, email, contraseña (hash), idioma, zona | Usuarios | Dar el servicio | Contrato | Mientras exista la cuenta | Supabase, Resend |
| Perfil público | Lo que la persona publica | Usuarios | Mostrar su identidad | Contrato | Hasta que lo borre | Público |
| Life OS | Metas, hábitos, tareas, dinero, diario | Usuarios | Organización personal | Contrato | Hasta que lo borre | Supabase |
| Estadísticas de visitas | Eventos con hash diario, sin IP | Visitantes | Mostrar visitas al dueño | Interés legítimo | Mientras exista el perfil | Dueño del perfil (agregado) |
| Mensajes y colaboraciones | Nombre, contacto, mensaje | Visitantes | Que el dueño reciba contactos | Consentimiento (envío) | Hasta que el dueño los borre | Dueño del perfil |
| Suscriptores | Email, nombre opcional, consentimiento | Visitantes | Lista del dueño | Consentimiento | Hasta que el dueño o la persona lo pida | Dueño del perfil |
| Encuestas | Opción + hash diario | Visitantes | Resultados de la encuesta | Interés legítimo | Mientras exista el módulo | Público (sólo cantidades) |
| Uso de la app | Eventos sin contenido, día de uso, plataforma, idioma, zona | Usuarios | Saber si funciona y cómo crece | Interés legítimo | 25 meses | Equipo (agregado) |
| Errores | Mensaje, pantalla, versión; personas con hash | Usuarios / visitantes | Arreglar fallas | Interés legítimo | Hasta resolver; personas 90 días | Equipo |
| Denuncias y verificación | Motivo, mensaje, link | Usuarios / visitantes | Moderación y confianza | Interés legítimo / obligación legal | Mientras haga falta para moderar | Equipo |
| Bitácora del equipo | Acción, cuenta afectada, fecha | Usuarios / equipo | Rendir cuentas de lo que hace el equipo | Interés legítimo / obligación legal | 3 años | Equipo |
