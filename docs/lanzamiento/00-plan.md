# Lanzamiento mundial — análisis y plan por fases

Fecha: 4/10/2026. Alcance: la parte **gratis** de Mycen (Identity + Studio, Life OS y la landing). Mycen Business y el
Plan Pro quedan fuera. Cada fase termina como las de Identity: validación (`tsc`, tests, build, E2E), PR, CI en verde y,
si toca la base, SQL para correr a mano con verificación y vuelta atrás. **No se empieza una fase sin aprobar la anterior.**

## 1. Dónde estamos

Hecho y en producción: Identity v1 completa (fases 0–11: perfil público, Studio, publicar con versiones, proyectos y
portfolio, editor móvil y de escritorio, links y Connect, moderación, apariencia accesible, Mis Spaces), Life OS (Tu día,
Brain con tareas, hábitos, metas, dinero multimoneda, insights, Replay, sin conexión, exportar/borrar) y 12 idiomas
dentro de la app. 64 E2E + 57 unitarios + tests de base.

## 2. Lo que encontré (revisando el código)

### Bloqueantes para salir al mundo

| # | Hallazgo | Dónde | Por qué importa |
|---|---|---|---|
| B1 | **La landing está casi toda en español fijo**: el hero, Solución, Life OS, Business, Visión, el pie y otras secciones tienen el texto escrito en el código, y las traducciones de la landing existen en 6 idiomas (la app tiene 12) | `src/components/landing/*`, `src/i18n/*.ts` | Un visitante de afuera no entiende la puerta de entrada |
| B2 | **Registro, login y recuperar contraseña en español fijo** | `src/app/routes/register.tsx`, `login.tsx`, `src/pages/*Password*` | Nadie de afuera puede crear la cuenta |
| B3 | **Mails de Supabase** (confirmar cuenta, recuperar contraseña) con el servidor de correo por defecto, que tiene un límite muy bajo por hora y plantillas sin marca ni idioma | Supabase → Auth | Con tráfico real, los mails dejan de llegar |
| B4 | **La página pública es pesada**: el JS principal pesa ~1 MB y `index.html` carga GSAP, ScrollTrigger, Splitting y Three.js (para la landing) en **todas** las páginas, también en `/{username}` | `index.html`, `vite.config.ts` | Es la página que más se abre, muchas veces desde celulares con datos móviles |
| B5 | **Imágenes sin optimizar**: se suben tal cual (hasta 5 MB) y se sirven así | `studioApi.uploadMedia` | Perfiles lentos y costo de almacenamiento |
| B6 | **No hay `robots.txt` ni `sitemap.xml`**, y la imagen para compartir de la landing apunta a un archivo que no existe (`/icon-512.png`) | `public/`, `index.html` | Google no descubre los perfiles; la landing se comparte sin imagen |
| B7 | **Zoom bloqueado** (`user-scalable=no`) en landing, Studio y Life OS (la página pública ya se arregló en la Fase 9) | `index.html` | Falla de accesibilidad (WCAG 1.4.4) |
| B8 | **Legales sólo en español** y sin lo que piden otros países: base legal y transferencias internacionales (GDPR), edad mínima, proceso por derechos de autor, contacto legal | `src/modules/legal/LegalPage.tsx` | Requisito para la UE, EE. UU. y Brasil (LGPD) |
| B9 | **Google Fonts desde los servidores de Google** | `index.html` | Más lento y, en la UE, un riesgo de privacidad conocido. Conviene servirlas desde Mycen |
| B10 | **Sin aviso de errores**: si algo falla en el celular de alguien, nadie se entera | — | Imposible sostener un lanzamiento sin ver los errores |
| B11 | **Sin protección contra registros automáticos** (captcha) | registro | Spam de cuentas y usernames |
| B12 | **Life OS sin tests E2E** (Identity tiene 64) | `tests/e2e` | Cualquier cambio puede romperla sin aviso |

### Para que lo gratis esté "al máximo"

| # | Qué | Módulo |
|---|---|---|
| M1 | Recordatorios de tareas **con la app cerrada** (hoy avisan sólo con Life OS abierta) | Life OS |
| M2 | **Tareas que se repiten** (diaria, semanal, mensual) | Life OS |
| M3 | **Movimientos recurrentes y presupuesto** del mes por categoría | Life OS · Dinero |
| M4 | **Entrar con Google** (y Apple más adelante): menos fricción en todo el mundo | Cuenta |
| M5 | **Username propio** para Spaces de marca (`/estudio-ana`, decisión P1) | Identity |
| M6 | **Plantillas de arranque** por perfil (creativo, profesional, negocio, evento) | Identity |
| M7 | Accesibilidad verificada con axe en **Studio, Life OS, onboarding y landing** (hoy sólo la página pública) | Todo |
| M8 | Medición del recorrido sin cookies ni datos personales: landing → registro → perfil publicado | Producto |
| M9 | Centro de ayuda corto (preguntas frecuentes) y contacto de soporte | Producto |

## 3. Plan por fases

| Fase | Entregable | SQL | Lo que necesito de vos |
|---|---|---|---|
| **L0** | **Decisiones** (sección 4) | — | Responder la sección 4 |
| **L1** ✅ | **Velocidad y base técnica** (perfil público: de ~800 KB a 217 KB gzip): GSAP/Splitting/Three sólo en la landing; separar el JS para que la página pública cargue lo mínimo; fuentes servidas por Mycen; imágenes redimensionadas y en WebP al subirlas (avatar, portada, módulos, proyectos); zoom permitido en toda la app; imagen para compartir de la landing; presupuesto de peso en CI para que no vuelva a crecer | — | — |
| **L2** ✅ | **Buscadores**: `robots.txt`, `/sitemap.xml` con perfiles, Spaces y proyectos públicos (sin no listados, privados ni suspendidos) y el idioma real de cada perfil en el HTML que leen los buscadores. `hreflang` de la landing pasa a L3 (hace falta la landing por idioma) | Sí (RPC del sitemap) | Correr el SQL; dar de alta el sitemap en Google Search Console |
| **L3** | **La puerta de entrada en 12 idiomas**: landing completa con detección de idioma, selector y `hreflang`; registro, login y recuperar contraseña; mails de Supabase con marca y en el idioma de la persona | — | Configurar un SMTP propio (te paso los pasos; p. ej. Resend) |
| **L4** | **Legales mundiales**: términos y privacidad reescritos (GDPR, LGPD, CCPA: bases legales, transferencias, edad mínima, retención, derechos y cómo pedirlos), proceso por derechos de autor, lista de proveedores, en los 12 idiomas con el español como versión de referencia | — | **Revisión de un abogado** antes de publicar |
| **L5** | **Confianza y operación**: aviso de errores, captcha invisible en el registro, más usernames reservados de marcas conocidas (suplantación), medición del recorrido sin cookies, ayuda y contacto | Sí (si los errores se guardan en una tabla propia) | Elegir entre Sentry y la tabla propia; crear la clave del captcha (Cloudflare Turnstile, gratis) |
| **L6** | **Life OS al máximo**: E2E de Life OS; recordatorios push con la app cerrada; tareas recurrentes; movimientos recurrentes y presupuesto | Sí | Generar las claves de notificaciones (te paso los pasos) |
| **L7** | **Identity al máximo**: entrar con Google; username propio para Spaces de marca; plantillas de arranque | Sí | Crear el acceso de Google (OAuth) en Google Cloud |
| **L8** | **Salida**: axe en todas las pantallas; pruebas en iPhone/Safari y Android de gama media; árabe (derecha a izquierda) revisado; revisión de seguridad de las RLS y RPC; prueba de carga de la página pública; beta cerrada y después apertura | — | Revisión nativa de las traducciones; elegir países de la beta |

Orden pensado: L1 y L2 no dependen de nada tuyo y son lo que más se nota; L3 y L4 abren el mundo; L5 deja todo
observable antes de recibir tráfico; L6 y L7 suman lo que la gente espera; L8 es la verificación final.

## 4. Decisiones que necesito (fase L0)

1. **Idiomas de salida**: ¿los 12 desde el día uno, o empezar con español, inglés y portugués y sumar el resto en la beta?
2. **Errores**: Sentry (más completo, cuenta gratis) o tabla propia en Supabase (sin terceros).
3. **Entrar con Google**: ¿sí para el lanzamiento? (Apple pide cuenta de desarrollador paga).
4. **Mails**: ¿qué remitente? (ej. `hola@mycen.id`) y qué proveedor de SMTP.
5. **Legales**: ¿hay un abogado que los revise? ¿Qué razón social y país figuran como responsables?
6. **Beta**: ¿países o comunidades para la beta cerrada?

## 5. Fuera de este plan

Traductor automático e Intelligence de Life OS (decidido no hacerlos), Plan Pro y cobros, dominio propio, documentos
descargables pesados, apps nativas en las tiendas (la PWA se instala desde el navegador).
