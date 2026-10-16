# Auditoría v2 — recorrido de todas las pantallas

Fecha: 16/10/2026 · Base: `main` en `6fe23b2`.

## Cómo se hizo

Se recorrió la app con Playwright contra Supabase simulado (`tests/e2e/support/mockSupabase.ts`), con datos variados
(`tests/e2e/support/richState.ts`, el mismo set de `smoke-routes.spec.ts` + todos los módulos de bio):

- **Pantallas:** Studio (Inicio, identidad, módulos, proyectos y editor de proyecto, apariencia, compartir, "en todos
  lados", analítica con "Lo que más tocan", mensajes, suscriptores, ajustes, vista previa, editor de escritorio, Mis
  Spaces, Más), Life OS (Mi día, dinero, metas, hábitos, Brain y tareas, diario, insights, "Tu mes", ajustes), perfil
  público en las 5 estructuras × 2 temas con **todos** los tipos de módulo (también support, subscribe, latest_video,
  listen_on, collab y contact_form), página de proyecto, landing, login, registro, recuperar contraseña, `/auth/terms`,
  legales y el panel de super-admin. Hojas: plantillas, biblioteca de módulos, nuevo presupuesto, el + de Life OS.
- **Combinaciones:** 390 px (oscuro) y 1280 px (claro), en español, inglés, japonés, árabe (RTL) y alemán (palabras largas).
- **Qué se midió en cada pantalla:** errores y avisos de la consola (también los de React), pedidos que fallan, pantalla
  de error, scroll de costado y elementos que se salen, textos cortados con "…", botones de menos de 44 px en el
  celular, cosas tapadas por la barra de abajo o por el botón +, texto en español con la app en otro idioma (y latín
  suelto en ja/ar), axe (wcag2a/aa con `settledAxe`), dirección de flechas en árabe y colores hex fuera del sistema.
- Además: búsqueda en el código de textos fijos en JSX y de `aria-label`/`placeholder`/`title` sin i18n.

Resultado general: **no hay scroll de costado en ninguna pantalla ni combinación**, no hay pantallas de error (salvo la
de super-admin de abajo, arreglada) y no hay textos fijos en español en Studio, Life OS ni el perfil (todo pasa por los
diccionarios). Lo que sigue es lo que sí apareció.

## Hallazgos

| # | Pantalla | Qué pasa | Severidad | Estado |
|---|----------|----------|-----------|--------|
| 1 | Toda la app (Studio, Life OS, perfil, acceso) | `<html lang>` quedaba en `es` | media | arreglado |
| 2 | Toda la app en otro idioma | Si falla la descarga del diccionario, la sesión queda en español | media | arreglado |
| 3 | Toda la app en otro idioma | Se ve español un instante mientras baja el diccionario | baja | a decidir |
| 4 | Dinero y Diario en árabe | Las flechas ‹ › del mes apuntaban al revés | media | arreglado |
| 5 | Studio → Módulos | El aviso "Completá tus módulos" no tenía relleno | media | arreglado |
| 6 | Hábitos y Mi día (celular) | El progreso ("5 de 8 vasos") se cortaba con "…" | media | arreglado |
| 7 | Life OS (celular) | Lo último de la pantalla quedaba debajo del botón + | media | arreglado |
| 8 | Studio → Módulos | "1 tarjetas", "1 reseñas", "1 fotos" | baja | arreglado |
| 9 | Super-admin → Verificaciones | Se caía ("Algo salió mal") si la respuesta venía vacía | media | arreglado |
| 10 | Brain, Dinero, Studio | `aria-label` en `<span>` sin rol (axe: aria-prohibited-attr) | media | arreglado |
| 11 | Studio → Compartir | El QR de adentro de la imagen con huella no tenía nombre (axe: svg-img-alt) | media | arreglado |
| 12 | Editor de escritorio (claro) | Las capas ocultas no llegaban a 4,5:1 de contraste | media | arreglado |
| 13 | Registro | Los links a términos y privacidad se distinguían sólo por el color | media | arreglado |
| 14 | Super-admin (celular) | Botones de abrir/cerrar menú sin nombre (axe crítico) | baja | arreglado |
| 15 | Studio → Analítica | Aviso de recharts "width(-1)" en la consola | baja | arreglado |
| 16 | Perfil en árabe | El punto final de la bio (en español) saltaba al principio | baja | arreglado |
| 17 | Perfil en árabe | "Denunciar" (`إبلاغ`) medía 30 px de ancho | baja | arreglado |
| 18 | Life OS → Ajustes | La × de las monedas extra medía 28 px | baja | arreglado |
| 19 | Dinero → Otras monedas | "-US$ 0" con gasto en cero | baja | arreglado |
| 20 | Perfil | El color de error de "Denunciar" estaba fijo en hex | baja | arreglado |
| 21 | Perfil en otro idioma | El contenido del dueño queda marcado con el idioma del visitante | media | a decidir |
| 22 | Varias | Botones de 40 px y chips de 32–36 px en el celular | baja | a decidir |
| 23 | Studio (celular) | La barra de abajo es sólo íconos | baja | a decidir |
| 24 | Super-admin | Sólo en español, "MenuLife Admin", contraste y `<pre>` sin foco | baja | a decidir |
| 25 | Diario | El campo de fecha usa el formato del navegador | baja | a decidir |

### 1. `<html lang>` quedaba en español — media, arreglado
`index.html` arranca con `lang="es"` y `useAppLang` sólo lo cambiaba al llamar a `setLang` (cuando cargan las
preferencias). Con la app en inglés, al abrir Studio el documento decía `es` (y en las pantallas de acceso de una visita,
que no tiene preferencias, quedaba así siempre). Un lector de pantalla lee el inglés con voz en español y el navegador
ofrece "traducir del español".
**Arreglo:** `src/i18n/app/store.ts` pone `document.documentElement.lang` con el idioma detectado al crear el store.
`i18n-coverage.spec.ts` lo verifica en cada pantalla.

### 2. Diccionario que no baja = español toda la sesión — media, arreglado
En `createNamespace` (`src/i18n/app/namespace.ts`) la promesa fallida (`.catch(() => es)`) quedaba guardada en
`pending`: con una caída de red o un deploy nuevo justo al cambiar de idioma, nunca se volvía a intentar.
**Arreglo:** si falla, se borra de `pending` y la próxima pantalla que lo use lo vuelve a pedir.

### 3. Destello de español al abrir en otro idioma — baja, a decidir
El español viaja con la app y los otros idiomas se bajan aparte; en el recorrido (servidor de desarrollo, más lento que
producción) se vio Mi día entero en español durante ~1 s antes de pasar al inglés, y lo mismo en Brain, Insights y la
barra de Life OS. En producción con caché es mucho menos, pero en la primera visita con red lenta se nota.
**Opciones:** precargar el diccionario del idioma guardado (`mycen_lang`) en paralelo al arranque, o mostrar el
esqueleto hasta tenerlo. Es una decisión de producto/rendimiento (suma una descarga al arranque).

### 4. Flechas del mes al revés en árabe — media, arreglado
`MonthSwitcher` (Dinero) y el Diario elegían la flecha mirando `document.documentElement.dir`, pero Life OS pone `dir`
en el contenedor de `LifeShell`, no en `<html>`: en árabe la fila se invierte (bien) pero las flechas no, y "mes anterior"
quedaba a la derecha apuntando hacia adentro.
**Arreglo:** las dos usan la clase `flip-rtl` como "Tu mes" y Tareas. También se sumó `flip-rtl` a la flecha de
`LifeSectionHeader` y a "Volver" de recuperar contraseña.

### 5. "Completá tus módulos" sin relleno — media, arreglado
La clase `.st-checklist` estaba definida dos veces en `studio.css` (aviso de plantillas y lista de pendientes del Inicio)
y la segunda le ponía `padding: 0` a la tarjeta: el título y el texto tocaban el borde (en todos los idiomas; en árabe se
salía del borde redondeado). **Arreglo:** el aviso pasa a `.st-pending-note`.

### 6. Progreso del hábito cortado — media, arreglado
`HabitMeta` iba en una sola línea con "…": con un "Después de…" largo o en alemán/inglés, "5 de 8 vasos" o "2 de 3 esta
semana" (lo importante) quedaba cortado en 390 px. **Arreglo:** hasta 2 líneas (`-webkit-line-clamp: 2`).

### 7. Debajo del botón + en Life OS — media, arreglado
El contenedor de Life OS dejaba 88 px abajo (lo justo para el menú), pero el + flota a 84 px y mide 56: al llegar al
final, el "⋯" del último movimiento en Dinero, "Cerrar sesión" en Ajustes, "Ver completadas" en Tareas y la última línea
del Diario quedaban debajo del +. **Arreglo:** `paddingBottom` de `LifeShell` a 156 px (+ zona segura).

### 8. Plurales con 1 — baja, arreglado
El resumen de los módulos decía "1 tarjetas", "1 reseñas", "1 fotos", "1 links" ("1 Karten", "1 Bewertungen"…).
**Arreglo:** singular en es, en, pt, fr, de, it y hi; en árabe pasa a la forma "البطاقات: 1" (evita el plural dual);
ru, zh, ja y ko ya estaban bien.

### 9. Super-admin → Verificaciones se caía — media, arreglado
`VerificationsTab` hacía `r.data.length` sin mirar si venía `null` (la RPC real siempre devuelve una lista, pero una
respuesta vacía tiraba toda la pantalla). **Arreglo:** `?? []`. `smoke-routes.spec.ts` ahora abre también el panel.

### 10–14. axe — arreglados
- `<span aria-label>` sin rol (no se anuncia): tipo de captura en Brain, "programado" y "3 de 12" en Dinero, saldo de
  cuentas compartidas, contador de no leídos de Studio → `role="img"`; spinner de carga de Studio → `role="status"`.
- QR dentro del SVG con huella (`HuellaQr`): el `<svg>` de adentro de `qrcode.react` tiene `role="img"` sin nombre; el de
  afuera ya tiene el nombre → `aria-hidden` en el de adentro.
- Editor de escritorio, tema claro: `.st-layer-row.is-hidden .st-layer-title` con `opacity: .55` → color `--st-muted`.
- Registro: links de términos y privacidad con subrayado (como en `/auth/terms`).
- Super-admin: `aria-label` en los botones de menú.

### 15. Aviso de recharts — baja, arreglado
`ResponsiveContainer` sin medida inicial avisaba `width(-1) and height(-1)` en cada visita a Analítica →
`initialDimension`.

### 16–20. Detalles — arreglados
- Perfil con la página en árabe y contenido en español: la bio y el texto de los módulos de texto usan
  `unicode-bidi: plaintext` (sólo en RTL; en LTR no cambia nada y las capturas siguen iguales).
- "Denunciar" del pie: `min-width: 44px`.
- Ajustes de Life OS: la × de cada moneda extra pasa a 40 px (como el resto de Life OS) y el relleno usa
  `paddingInlineStart` (bien en RTL).
- "Otras monedas este mes": sin signo cuando el monto es 0 ("US$ 0" en vez de "-US$ 0").
- `profile.css`: `.mp-report-error` usa `var(--my-danger)`.

### 21. Idioma del contenido del perfil — media, a decidir
La página pública marca todo con el idioma del visitante (`<main lang="en">`), pero el nombre, la bio y los módulos se
muestran en el idioma original del dueño (`default_locale`) cuando no hay traducción. Un lector de pantalla lee la bio
en español con voz inglesa. Propuesta: envolver los textos del dueño con `lang={default_locale}` (o el de la traducción
usada) y `dir="auto"`. Toca las 5 estructuras y los módulos, por eso no se hizo en esta pasada.

### 22. Botones chicos en el celular — baja, a decidir
Pasan WCAG 2.2 AA (24 px) pero no la guía de 44 px del proyecto: botones redondos de Life OS de 40 px (‹ › del mes,
buscar, volver, cerrar), chips de Brain (Idea/Nota/Tarea 32 px; Todo/Ideas/Notas 36 px), "mycen" del encabezado del
perfil (22 px de alto), "Volver a Mycen" de los legales (30 px), logo del login (32 px) y "¿Olvidaste tu contraseña?"
(19 px). Agrandarlos cambia las capturas de referencia; conviene decidirlo con diseño.

### 23. Barra de Studio sólo con íconos — baja, a decidir
En el celular las etiquetas de la barra de abajo de Studio son sólo para lectores de pantalla (`.st-nav-label`); a la
vista quedan cinco íconos. Es una decisión de diseño; se menciona porque "Mis Spaces" y "Más" no se adivinan por el ícono.

### 24. Super-admin — baja, a decidir
Es interno: está sólo en español, el encabezado del celular dice "MenuLife Admin" (marca vieja), axe marca contraste
bajo en las etiquetas de 11 px del resumen y un `<pre>` con scroll que no recibe foco en Verificaciones.

### 25. Fecha del Diario — baja, a decidir
`<input type="date">` muestra el formato del navegador (en Chromium de prueba, "10/16/2026" aunque la app esté en
español). Es del navegador; si molesta, habría que usar un selector propio.

## Colores fijos

En Life OS y Studio no hay hex sueltos fuera de `lifePalette.ts` (colores que elige la persona), `life.css` (tokens de
área) e `identityCard.ts` (imagen PNG exportada). En el perfil quedan `#22C55E`/`#9CA3AF` del punto de estado, `#F5B83D`
de las estrellas, el fondo negro del video y los colores de selección del editor: cambiarlos por tokens cambia las
capturas de referencia (se dejó como está; el de error de "Denunciar" sí pasó a token).

## Pruebas nuevas o ampliadas

- `tests/e2e/i18n-coverage.spec.ts` (nuevo): con la app en inglés, Studio (13 pantallas + plantillas + biblioteca de
  módulos), Life OS (10 pantallas + nuevo presupuesto + el +), el perfil con todos los módulos (también los de bio), la
  página de proyecto, login, registro y recuperar contraseña no muestran español (texto visible, `aria-label`,
  `placeholder`, `title`, `alt`) y `<html lang>` es `en`. Lo que cargó la persona no cuenta. Espera hasta 10 s a que baje
  el diccionario.
- `tests/e2e/smoke-routes.spec.ts`: suma `/forgot-password`, `/auth/terms` y las 5 pantallas de super-admin; los datos
  pasaron a `tests/e2e/support/richState.ts` para compartirlos.
- No cambió ninguna captura de `visual.spec.ts` ni de `modules.spec.ts`.
