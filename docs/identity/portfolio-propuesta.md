# Mycen como portfolio profesional: influencers, modelos y cantantes

Análisis de solo lectura del repo (`/home/user/menulife`), al 20/11/2026. No se tocó ningún archivo.

## Resumen en 5 líneas

- **Para cantantes, Mycen ya está cerca de un EPK** (kit de prensa digital): música, videos, fechas, descargables y contacto ya existen. Faltan cuatro cosas: citas de prensa, fotos de prensa en alta para bajar, contactos por rol (booking, management, sello) y un PDF "one-sheet".
- **Para influencers falta lo central: el media kit.** Es la audiencia por plataforma, la demografía, las tarifas y las marcas con las que trabajó. Hoy no hay dónde cargar esos números.
- **Para modelos falta casi todo lo específico:** medidas (comp card), *digitals*/polaroids, agencia madre y agencias por ciudad, y el PDF de la comp card. Además, **la galería actual recorta las fotos en cuadrado**, y eso no sirve para un book.
- **Hay un atajo de lanzamiento casi gratis.** La base ya acepta Spaces "no listados" (se ven sólo con el link, sin buscadores), pero **Studio no tiene ningún botón para elegirlo**. Con ese botón sale el "link privado para casting".
- **Las agencias no entran bien en "5 Spaces por cuenta"**, porque cada talento es otra persona, con su username y su verificación. Hace falta un "roster" (página de la agencia con sus talentos) y un vínculo "Representado por" que confirmen las dos partes. Después, acceso delegado.

---

## 1. Inventario: qué sirve hoy y qué le falta

Los tipos de módulo están en `src/modules/profile/lib/profileTypes.ts` (`MODULE_TYPES`, 29 tipos). Cómo se dibujan está en `src/modules/profile/components/moduleRegistry.ts` y cómo se editan en `src/modules/studio/lib/moduleCatalog.ts`. Los bloques de proyecto (`heading, paragraph, image, gallery, video, quote, divider, credits`) están en `src/modules/profile/lib/projectTypes.ts`, `src/modules/profile/components/ProjectBlocks.tsx` y `src/modules/studio/lib/blockCatalog.ts`.

### Piezas que sirven a los tres perfiles
- **Encabezado** (nombre, descriptor, bio, foto, `status_text` y "Disponible"). "Disponible" sirve como "disponible para bookings".
- **Tilde de verificado** (`identities.verified_at`, Studio → Ajustes → Verificación). Es clave para gente famosa.
- **Compartir**: QR con `?src=qr`, vCard con foto y links, tarjeta PNG (`studio/lib/identityCard.ts`), imagen al compartir (`api/og/[slug].tsx`) y analítica por botón ("Lo que más tocan").
- **Proyectos** (`/{username}/projects/{slug}`) con bloque **`credits`** (rol + nombre). Es exactamente lo que piden un editorial de moda o una campaña: fotógrafo, estilista, maquillaje, cliente. Un proyecto se publica solo y aparece en el `portfolio`.
- **Descargables** (`downloads`): PDF de hasta 10 MB (`FILE_MAX_BYTES` en `studio/lib/studioApi.ts`). Hoy alcanza para subir a mano una comp card, un media kit o un rider técnico ya armados.
- **Formulario de contacto** y **Colaboraciones** (`collab`: empresa, web, formato, presupuesto y fecha, y llega a Studio → Mensajes). El `collab` es el mejor punto de partida para el "pedido de booking".

### Influencer / creador
- Sirve: `social` (23 redes en `SOCIAL_NETWORKS`, con "@usuario"), `latest_video`, `video_gallery`, `link_group`, `collab` (con "Tarifas desde…"), `coupon` (código de marca), `support`, `subscribe`, `poll`, `testimonials`.
- Le falta:
  - **audiencia por plataforma**: seguidores, vistas promedio, engagement, países, edad y género, con la fecha del dato;
  - **marcas/clientes** ("Trabajé con");
  - **casos con resultados**: se puede armar con un proyecto, pero no hay un bloque de "métricas de la campaña";
  - **paquetes y tarifas** más detallados que la línea "desde…";
  - **contacto por rol**: el `contact` actual (`moduleCatalog.ts`, campos `whatsapp/phone/email`) no dice "Management" o "Prensa".

### Modelo
- Sirve: `gallery` (book), `image`, `portfolio` + proyectos con créditos, `downloads` (comp card en PDF), `text` (hoy las medidas entrarían como texto libre), `video_gallery` (pasarela, *showreel*) y `social`.
- Le falta:
  - **Comp card / medidas**: altura, busto o pecho, cintura, cadera, talle, calzado, pelo y ojos, en cm/pulgadas y con talles EU/US/UK.
  - **Book sin recortes**: `GalleryModule` (`profile/components/ProfileModules.tsx`, línea ~397) arma una grilla de 3 columnas con `aspect-ratio: 1` y `object-fit: cover` (`src/modules/profile/profile.css:187-189`). Corta las fotos verticales 2:3, y eso es lo primero que un booker mira. Además, `ImageModule` recorta las fotos muy altas a 4:5.
  - **Digitals/polaroids** como sección propia. Hoy sería una segunda galería con otro título, con el mismo recorte.
  - **Agencia madre y agencias por mercado** (París, Milán, NY…) con su contacto de booking.
  - **PDF de comp card generado** a partir de los datos y de 4 o 5 fotos elegidas.
  - **Privacidad de las medidas**: que no salgan en la página pública y sí en el link para casting.

### Cantante / músico
- Sirve: `listen_on` (8 plataformas), `media` (reproductor con fachada, sin terceros hasta tocar), `latest_video`, `video_gallery`, **`events`** (fechas de gira con link de entradas y ficha compartible `?evento=`), `podcast`, `downloads` (rider técnico, *stage plot*), `subscribe` y `support`. La plantilla `musician` ya existe (`studio/lib/templates.ts`).
- Le falta:
  - **Citas de prensa**: `testimonials` siempre dibuja 5 estrellas (CLAUDE.md, "Pulido de módulos"), y eso no sirve para "Rolling Stone: …".
  - **Fotos de prensa en alta para descargar**: `uploadMedia` achica todo a 1920 px WebP (`src/lib/imageOptimize.ts`, `studio/lib/studioApi.ts`). La prensa pide JPG de 3000 px o más, con crédito del fotógrafo.
  - **Contactos por territorio y rol**: booking LATAM/EU/US, management, sello, prensa.
  - **Logros** (premios, *charts*, *sold-outs*) y **one-sheet en PDF**.
  - **Fechas pasadas destacadas**: `events` oculta lo que ya pasó (`upcomingEvents` en `profile/lib/events.ts`).

### Hallazgos transversales importantes
1. **No se puede elegir la visibilidad de un Space desde Studio.** La columna `profiles.visibility` (`public|unlisted|private`) existe. La página pública pone `noindex` (`profile/pages/ProfilePublicPage.tsx:87`, `api/og.ts:288`) y el sitemap sólo lista los `public`. Pero el único selector de visibilidad en Studio es el de proyectos (`studio/pages/ProjectEditorPage.tsx:299`).
2. **El onboarding sólo ofrece 4 propósitos** (`personal/creator/professional/business` en `studio/components/OnboardingWizard.tsx`). No pregunta "modelo / cantante / influencer", así que la plantilla que se aplica no es la del portfolio.
3. **Las plantillas por rubro son fáciles de extender**: `TEMPLATES` es puro y crea los módulos vacíos, ocultos y con "Completá esto" (`applyTemplate.ts`). Una plantilla de portfolio nueva no necesita migración.

---

## 2. Qué espera la industria (y cuánto lo cubre Mycen)

| Pieza que pide la industria | Modelo | Influencer | Cantante | Hoy en Mycen |
|---|---|---|---|---|
| Medidas: altura, busto/pecho, cintura, cadera, calzado, pelo, ojos; hombre: traje, cuello, entrepierna | ✔ | – | – | Sólo texto libre |
| Book editorial + *digitals*/polaroids (sin maquillaje, frente/perfil/cuerpo entero) | ✔ | – | – | Galería que recorta |
| Agencia madre + agencias por mercado + booker | ✔ | (management) | (booking por territorio) | No |
| Comp card PDF (frente: foto + nombre; dorso: 4 fotos + medidas + agencia) | ✔ | – | – | Sólo PDF subido a mano |
| Media kit: seguidores, alcance/vistas promedio, engagement, demografía (edad, género, países), fecha del dato | – | ✔ | (oyentes) | No |
| Marcas/clientes, casos con resultados, paquetes y tarifas | (clientes) | ✔ | – | Parcial (`collab` "desde…", proyectos) |
| Bio corta y larga | ✔ | ✔ | ✔ | Sí (bio + `text`) |
| Fotos de prensa en alta con crédito | ✔ | ✔ | ✔ | No (máx. 1920 px) |
| Música, videos, en vivo | – | – | ✔ | Sí |
| Fechas de gira | – | – | ✔ | Sí (`events`) |
| Citas de prensa, logros | – | (prensa) | ✔ | No |
| Rider técnico / *stage plot* / hospitality | – | – | ✔ | Sí (PDF en `downloads`) |
| Contactos por rol (booking, management, prensa, sello) | ✔ | ✔ | ✔ | No (un solo contacto) |

### Regla de oro: los números de audiencia
CLAUDE.md dice: "No simular funcionalidades sin datos reales; no inventar métricas". Propuesta en tres niveles, siempre visibles en la página:
- **Informado por la persona** (nivel por defecto). Etiqueta discreta: "Datos informados por Ana · actualizados el 3/11/2026". Pasados 90 días, la página dice "dato de hace más de 3 meses", y a los 12 meses el número se oculta.
- **Revisado por Mycen**. La persona sube capturas de sus estadísticas en un pedido privado, como el de verificación. El equipo las revisa en el panel y la página muestra "Revisado por Mycen el …". Nunca dice "verificado en vivo", porque el número cambia todos los días.
- **Conectado** (P2). El dato sale del proveedor desde el servidor: YouTube y Spotify tienen API pública de seguidores; Instagram y TikTok piden OAuth de cuenta de creador. Es un tercero nuevo, así que va a la política de privacidad en los 12 idiomas.
- Mycen **nunca calcula ni completa** demografía. El engagement sólo se muestra si la persona lo carga, o calculado con sus propios números y aclarado ("calculado con tus datos").

---

## 3. Propuesta de producto: "Modo Portfolio" bien fácil

### 3.1 Tres plantillas de portfolio (sin migración)
Se suman a `TEMPLATE_IDS` en `studio/lib/templates.ts`, en un grupo nuevo `group: 'portfolio'`. Crean los módulos vacíos, ocultos y con "Completá esto", como ya hacen las plantillas actuales:
- **Modelo** (`editorial`, acento `mono`): `comp_card` → `gallery` (estilo book) → `gallery` (Digitals) → `portfolio` (editoriales con créditos) → `video_gallery` → `representation` → `downloads` (comp card PDF) → `social`.
- **Influencer** (`portada`, acento `plasma`): `audience` → `latest_video` → `brands` → `portfolio` (casos) → `collab` → `representation` → `downloads` (media kit) → `social`.
- **Cantante** (`portada`, acento `nebulosa`): `listen_on` → `media` → `events` → `press` → `gallery` (fotos de prensa) → `downloads` (rider, one-sheet) → `representation` → `subscribe`.
- En el **onboarding**, el paso "¿Para qué es tu perfil?" suma "Soy modelo / creador de contenido / músico". `PURPOSE_TEMPLATE` aplica la plantilla de portfolio que corresponda. `purpose` puede seguir siendo `creator` en la base y la plantilla se guarda aparte.

Mientras no existan los módulos nuevos, las plantillas P0 usan sólo piezas actuales: `text` en lugar de `comp_card`, `testimonials` en lugar de `press`, `contact` en lugar de `representation`.

### 3.2 Módulos nuevos (cada uno en los dos registros + 12 idiomas + migración del tipo)
1. **`comp_card` (Medidas)**: altura, busto/pecho, cintura, cadera, talle, calzado (EU/US/UK), pelo, ojos, más los campos de hombre (traje, cuello, entrepierna). Se guarda en cm y se muestra en cm y pulgadas según el idioma (`profile/lib/measurements.ts`, puro y con tests). Sin peso ni fecha de nacimiento: son datos sensibles y la industria ya no los pide. Cada campo se puede ocultar.
2. **`audience` (Media kit)**: hasta 8 plataformas, cada una con seguidores, vistas o alcance promedio, engagement opcional, top 3 países, franjas de edad y género opcionales, y `as_of` (fecha obligatoria). La etiqueta de origen (informado / revisado) sale de la base, no del dueño.
3. **`brands` (Trabajé con)**: nombres, con logo opcional subido por el dueño (bajo su responsabilidad por derechos), año y link al caso. Sin buscar logos automáticamente en terceros.
4. **`press` (Prensa y logros)**: cita + medio + link + fecha, y logros (premio, chart, sold-out). Una alternativa más barata: una variante `style: 'press'` de `testimonials` sin estrellas.
5. **`representation` (Representación)**: filas con agencia o persona, rol (agencia madre, agencia, booking, management, prensa, sello), mercado o territorio, email, teléfono y web. Usa los `onAction` con clave por fila (`clickKeys.ts`) y los mismos validadores (`safeUrl.ts`, `badPhone`). Lo usan los tres perfiles.
6. **Galería "book"** (sin tipo nuevo): `content.layout = 'book'` en `gallery`. Respeta la proporción de cada foto (2 columnas tipo *masonry*, sin `cover`) y deja marcar una foto como "digital/polaroid". Va en `GalleryModule`, en la CSS con tokens y en el editor.

### 3.3 Descargas y PDF
- **Comp card PDF generado en el celular**, sin dependencias nuevas. Sigue el patrón de `studio/lib/identityCard.ts`: canvas → JPEG, envuelto en un PDF mínimo escrito a mano (embeber un JPEG en un PDF son pocas líneas). Frente con la foto y el nombre; dorso con 4 fotos, las medidas y la agencia. La versión clara/oscura sale del tema. Se sube con `uploadPdf` y queda en `downloads`. El mismo motor arma el **media kit PDF** y el **one-sheet** del cantante.
- **Fotos de prensa en alta**: un descargable de imagen (JPG de hasta 4000 px y 15 MB, en el bucket `profile-files`), siempre redibujado con `optimizeImage({ strict: true })`, así salen sin EXIF ni GPS. Lleva crédito del fotógrafo obligatorio. Pide migración (tipo de archivo y límites del bucket) y actualizar el SGSI.

### 3.4 Privacidad y casting
- **P0**: selector "Quién puede ver este Space: Público / Sólo con el link / Sólo yo" en Studio → Ajustes y en Mis Spaces. La base y la página ya lo soportan. Receta para modelos: el Space principal es público (book + redes) y `/ana/casting` queda "sólo con el link", con medidas, *digitals* y comp card.
- **Aviso honesto**: "sólo con el link" no es secreto, porque `/ana/casting` se puede adivinar. Para lo sensible: **links privados con token y vencimiento** por casting o marca (`/ana/casting?k=…`, revocables, con "lo abrieron 3 veces"). Es P2 y lleva migración.

### 3.5 Agencias
- **5 Spaces por cuenta no alcanzan y además no corresponde usarlos**: los Spaces son caras de una misma persona y comparten verificación y username. Mezclar talentos rompería la verificación y la propiedad del nombre.
- **P1, Roster**: módulo `roster` en el Mycen de la agencia. Muestra tarjetas (foto, nombre, categoría, link) de perfiles publicados de otras cuentas. La RPC agrega las tarjetas, como ya pasa con `projects`.
- **P1, "Representado por" confirmado por las dos partes**: el talento pone la agencia en `representation` y la agencia lo tiene en `roster`. Recién con las dos cosas aparece la insignia "Representado por Elite Model · París" con link. Si sólo uno lo declara, se ve como texto común. Así nadie inventa un vínculo.
- **P2, Acceso delegado**: la cuenta de la agencia edita los Spaces de sus talentos con permiso del talento (roles editor / publicador, con todo en `admin_audit_log`). El talento conserva la propiedad y puede revocar. Es grande: RLS, Studio con selector de cuentas y legales.
- Mientras tanto, la agencia crea la cuenta con el email del talento (o con el suyo y autorización escrita) y le pasa la propiedad después.

---

## 4. Hoja de ruta en PRs chicos

### P0: semana de lanzamiento (piezas existentes)
| PR | Qué hace | Archivos | Migración | Esfuerzo |
|---|---|---|---|---|
| P0-1 Visibilidad del Space | Selector Público / Sólo con el link / Sólo yo en Ajustes y Mis Spaces | `studio/pages/SettingsPage.tsx`, `SpacesPage.tsx`, `studio/lib/studioApi.ts`, `src/i18n/app/studio/*.ts` (12), E2E nuevo | No (revisar que RLS deje cambiar `visibility`) | S |
| P0-2 Plantillas Modelo / Influencer / Cantante con piezas actuales | 3 entradas en `TEMPLATES` (text, gallery, portfolio, downloads, collab, events, contact…) y grupo "Portfolio" en `TemplatePicker` | `studio/lib/templates.ts`, `TemplatePicker`, diccionarios `templates` (12), `templates.test.ts` | No | S |
| P0-3 Galería "book" | `layout: 'book'`: respeta la proporción, 2 columnas y Lightbox igual | `ProfileModules.tsx` (GalleryModule), `profile.css`/`layouts.css` (tokens), editor en `moduleCatalog.ts`, `modules.spec.ts` (snapshots) | No | S–M |
| P0-4 Onboarding con "modelo / creador / músico" | Más opciones de propósito que aplican la plantilla de portfolio | `OnboardingWizard.tsx`, `PURPOSE_TEMPLATE`, diccionarios (12), `onboarding.spec.ts` | No (guardar `purpose='creator'` + plantilla) | S |
| P0-5 Guías "Armá tu book / media kit / EPK" | Texto de ayuda en Studio con los pasos ("subí tu comp card en PDF…") | `src/i18n/app/studio/*.ts`, `ModulesPage` | No | S |

### P1: el primer mes
| PR | Qué hace | Archivos | Migración | Esfuerzo |
|---|---|---|---|---|
| P1-1 `representation` | Contactos por rol y mercado | `profileTypes.ts`, `moduleRegistry.ts`, componente propio, `moduleCatalog.ts`, editor, `clickKeys.ts`/`clickStats.ts`, i18n (12), `mockSupabase.ts` | Sí (tipo en el check) | M |
| P1-2 `comp_card` | Medidas, unidades y talles, campos ocultables | `profile/lib/measurements.ts` + tests, módulo, editor, i18n (12) | Sí (tipo + validación del contenido) | M |
| P1-3 `audience` "informado por" | Media kit con fecha y etiqueta de antigüedad | módulo, editor, `profile/lib/audience.ts`, i18n (12) | Sí | M |
| P1-4 `press` y `brands` | Citas, logros y marcas | dos módulos, o variante de `testimonials` | Sí (si son tipos nuevos) | M |
| P1-5 Comp card / media kit PDF | Generado en el dispositivo y guardado como descargable | `studio/lib/compCardPdf.ts` (patrón de `identityCard.ts`), `uploadPdf`, test de PDF válido | No | M |
| P1-6 Roster + "Representado por" mutuo | Tarjetas de talentos e insignia confirmada | RPC en `get_public_profile`, módulo `roster`, `representation`, i18n (12), tests DB/E2E | Sí | L |
| P1-7 Plantillas pasan a usar los módulos nuevos | Reemplazar `text`/`contact` por `comp_card`/`representation` | `templates.ts` | No | S |

### P2: después
| PR | Qué hace | Migración | Esfuerzo |
|---|---|---|---|
| P2-1 "Revisado por Mycen" para audiencias | Pedido con capturas (bucket privado), panel super-admin, fecha de revisión | Sí | M |
| P2-2 Fotos de prensa en alta | Descargable JPG ≤ 4000 px sin EXIF, con crédito obligatorio | Sí (bucket) | M |
| P2-3 Links privados con token y vencimiento | Por casting o marca, revocables, con aperturas | Sí | L |
| P2-4 Acceso delegado para agencias | Roles, auditoría y revocación | Sí | L |
| P2-5 Datos conectados (YouTube, Spotify; después Instagram y TikTok) | Seguidores desde el servidor, privacidad en 12 idiomas, detrás de `FEATURES` | Sí | L |
| P2-6 Más de 5 Spaces para cuentas verificadas o Pro | Subir el tope en `mycen_space_rules` / `MAX_SPACES` | Sí | S |

Lo nuevo fuera de la V1 va detrás de `src/lib/features.ts`, por ejemplo con `FEATURES.portfolioModules`. Cada tipo de módulo nuevo se agrega en los dos registros (`moduleRegistry.ts` y `moduleCatalog.ts`), con textos en los 12 idiomas y colores, radios y tipografías sólo de `src/design`. Si se toca el perfil público, hay que actualizar `tests/e2e/support/mockSupabase.ts`, `modules.spec.ts`, `layout-audit.spec.ts` y el presupuesto de peso (chunk propio por módulo).

---

## 5. Riesgos y cómo manejarlos

- **Menores de edad.** Los términos permiten cuentas desde los 13 años (`src/i18n/app/legal/es.ts`, sección "edad"), y la moda trabaja con menores. Propuesta:
  - `comp_card` y fotos de cuerpo entero sólo con la casilla "Soy mayor de edad o esta cuenta la gestiona mi madre, padre, tutor o agencia";
  - nunca edad ni fecha de nacimiento;
  - formulario de contacto y colaboraciones apagados por defecto para cuentas de menores;
  - casting de menores sólo con Spaces "sólo con el link";
  - revisión legal antes de abrir.
- **Datos personales sensibles.** Las medidas hablan del cuerpo. Que cada campo sea opcional, que se pueda ocultar y que haya receta de Space privado. Sin peso. Actualizar privacidad (12 idiomas) y `docs/seguridad/sgsi/` (tratamiento nuevo).
- **Métricas infladas.** Nada inventado: etiqueta de origen y fecha siempre visibles, antigüedad que oculta números viejos, "Revisado por Mycen" sólo con evidencia, y el dueño no puede escribir la etiqueta. Denuncia nueva "datos falsos" en `REPORT_REASONS` (requiere migración del check).
- **Derechos de imagen.** Las fotos editoriales y los logos de marcas tienen dueño: fotógrafo, revista, marca. Propuesta:
  - crédito obligatorio en fotos de prensa;
  - logos subidos sólo por el dueño;
  - cláusula en los términos;
  - el canal de denuncias existente para retiros (sumar "derechos de autor" con un procedimiento tipo DMCA).
- **Suplantación de famosos.** Ya existen la verificación (`request_verification` y tilde `.mp-verified`), la denuncia "impersonation" y los usernames con marcas o bancos reservados (`IMPERSONATION_FRAGMENTS`). Falta:
  - **reclamo de username** para personas conocidas, con evidencia y entregado por el equipo, con registro en `admin_audit_log`;
  - **verificación prioritaria vía agencia** verificada;
  - la insignia "Representado por" sólo cuando las dos partes lo confirman.
- **Fotos con GPS.** Hoy todo se redibuja sin EXIF (`optimizeImage strict`). Cualquier descarga "en alta" tiene que mantener esa regla.
- **Terceros.** "Datos conectados" o logos automáticos agregan proveedores: privacidad en los 12 idiomas, `connect-src` en la CSP (`vercel.json`) y la fachada antes de cargar nada.
