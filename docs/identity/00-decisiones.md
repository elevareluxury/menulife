# Mycen Identity — Decisiones de producto (Fase 0)

Base: documento maestro "MYCEN IDENTITY" (3/10/2026: definición, PRD + UI/UX y blueprint técnico)
ajustado con 13 decisiones aprobadas el 3/10/2026. Donde este archivo y el documento maestro difieren,
**manda este archivo**.

## Lo que se adopta del documento maestro

- Separar **Identity** (raíz, privada) de sus **presentaciones** (Spaces) en el modelo de datos.
- **Guardar ≠ publicar**: versión de trabajo + versiones publicadas inmutables y restaurables.
- **Contenido reutilizable** (un proyecto se crea una vez y aparece en varios lugares).
- Migración **Expand → Migrate → Verify → Switch → Contract**, preservando usernames, URLs, QR, módulos, imágenes y estados.
- Personalización con sistema de diseño (sin CSS libre).
- Fuera de alcance: feed, mensajería, seguidores, marketplace, algoritmos, IA que publique sola, Business avanzado.

## Las 13 decisiones

| # | Decisión | Efecto en el plan |
|---|---|---|
| 1 | **Connect no es un CRM.** Connect = compartir y guardar contacto (URL, QR, vCard, tarjeta descargable, presentación corta). Sin agenda de conexiones, notas sobre personas ni solicitudes de conexión. Si algún día existen notas sobre personas, van en Life OS. | Se elimina "Fase 6 — Mycen Connect (conexiones, agenda, notas)". |
| 2 | **Comercio = mostrar, no vender.** Identity muestra productos y servicios con botón a WhatsApp o link externo. Cobros, stock, pedidos, links de pago y storefront quedan en Mycen Business. | Sin módulos Payment Links, Storefront, Pricing, Offers en Identity. |
| 3 | **No competir función por función con Linktree y Behance.** El diferencial: una identidad que une contacto, trabajo y negocio; QR + vCard + WhatsApp nativos; 12 idiomas; vínculo con Business. | La "definición de terminado" se mide con el alcance v1 de `04-implementation-plan.md`, no con "cobertura Behance completa". |
| 4 | **Sin formulario de contacto ni Booking en v1.** Se resuelve con WhatsApp, email y teléfono. Se reevalúa cuando haya proveedor de email, antispam y bandeja en Studio. | Fuera de v1. |
| 5 | **Portfolio antes que My Spaces.** El modelo soporta varios Spaces desde el inicio, pero la pantalla para crearlos se construye después de Projects/Portfolio, o cuando haya demanda. | Orden de fases cambiado. |
| 6 | **El contenido se crea desde el editor.** "Mi contenido" existe como vista de biblioteca para reutilizar, no como paso obligatorio. | Studio no obliga a pasar por la biblioteca. |
| 7 | **Editor móvil primero.** Editor por capas para el teléfono antes que el editor de escritorio de 3 paneles con selección directa. | El editor de 3 paneles va al final. |
| 8 | **Deshacer/Rehacer local y control de concurrencia simple.** Historial en la sesión (navegador); las versiones publicadas cubren la restauración larga. Concurrencia: "esta versión cambió, recargá" (bloqueo optimista por `updated_at`/número de versión). | Sin reconciliación de cambios entre sesiones. |
| 9 | **Interfaz en español primero** (y los 12 idiomas). Los nombres en inglés del documento (Overview, Design Studio…) son internos. | Todos los textos van a los diccionarios de `src/i18n/app/`. |
| 10 | **Apple como guía de comportamiento, no de estética.** Se mantiene la identidad visual Mycen (Obsidian, Graphite, Slate, Mist, Ivory; "quiet"). Vidrio/blur sólo en navegación flotante y con alternativa sin blur (Android gama media). | No se reemplaza el sistema visual actual. |
| 11 | **Plan Pro opcional, sin bloquear lo esencial.** Candidatos: dominio propio, más almacenamiento, analíticas avanzadas, quitar marca Mycen. Lo esencial (identidad, Studio, publicar, QR, links, contacto, portfolio, insights básicos, exportar) sigue gratis. | Se define el alcance; la implementación de cobro va después del núcleo. |
| 12 | **Moderación desde el inicio.** "Denunciar perfil" público, tabla de denuncias, revisión en super-admin, baja/suspensión y reglas de contenido en los términos. | Se agrega como trabajo transversal antes de crecer. |
| 13 | **Identity es la puerta de entrada; Life OS se descubre después.** La landing y el onboarding hablan de Identity; Life OS aparece como espacio personal dentro de la cuenta. | Afecta landing, onboarding y textos. |

## Preguntas P1–P10 — aprobadas (3/10/2026)

Se aprobaron todas con la recomendación de la tabla.

| # | Pregunta | Decisión |
|---|---|---|
| P1 | ¿Dónde vive el username? | En el **Space**. El Space principal conserva el username actual. Un Space de tipo marca/proyecto/evento puede reservar su **propio username raíz** (mismo espacio de nombres); los demás usan `/username/slug`. |
| P2 | Proyecto compartido entre Spaces: ¿cuándo se actualiza? | Los proyectos tienen **su propio borrador/publicado**. La versión publicada de un Space guarda la composición y referencia la versión publicada de cada proyecto: publicar el proyecto lo actualiza en todos los Spaces. |
| P3 | ¿Renombrar la tabla `profiles`? | **No.** `profiles` pasa a ser la tabla de Spaces (se le agregan columnas) y se crea `identities`. Así no se tocan las FK de módulos, eventos, historial de usernames ni el vínculo con Business, y la analítica sigue continua. |
| P4 | Nombre del producto | **Mycen Identity** reemplaza a "Mycen Profile" en `CLAUDE.md` y en la interfaz. La página pública es "tu Mycen" / "tu identidad". |
| P5 | Negocios de Mycen Business | Cada negocio es un **Space de tipo `brand`** con su username (el slug histórico), vinculado por `restaurant_id` como hoy. |
| P6 | Video y documentos en v1 | Video **sólo embebido** (YouTube, Vimeo, etc.). Documentos (CV, media kit) en un bucket propio con límite de tamaño transparente. |
| P7 | Paleta clara | Mantener **Ivory `#F1F0E9`** como fondo claro (el documento propone `#F7F7F4`). |
| P8 | Plan Pro | Definir alcance y precio después de la Fase 3; no implementar cobro antes. |
| P9 | SEO | Generar el HTML público **al publicar**, desde la versión publicada, como parte de la fase de versiones (no al final). |
| P10 | Datos de producción | Correr las consultas de solo lectura de `02-data-model-current.md` y pegar los resultados para dimensionar la migración. |
