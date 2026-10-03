# 04 — Plan de implementación (Fase 0)

Orden ajustado a las 13 decisiones de `00-decisiones.md`. Cada fase termina con: `tsc -b`, `npm run build`,
lint sin errores nuevos, los tests de la fase en verde, PR y merge. Cada fase que toca la base entrega SQL
para revisar y correr a mano, con verificación y rollback. **No se empieza una fase sin aprobar la anterior.**

## Alcance v1 de Mycen Identity (decisión 3)

v1 está completo cuando una persona puede:

1. Crear y publicar su identidad desde el celular sin ayuda.
2. Compartir una URL y un QR que no cambian.
3. Permitir que un visitante sin cuenta guarde su contacto.
4. Reunir redes, links y acciones (links agrupados, destacados y programados).
5. Crear **proyectos** con portada, texto, imágenes, galería, video embebido y créditos, cada uno con su URL.
6. Armar un **portfolio** con sus proyectos.
7. Reordenar, ocultar, duplicar y personalizar su página.
8. Editar sin cambiar lo público hasta publicar, y restaurar una versión anterior.
9. Ver métricas útiles (incluida la fuente de las visitas).
10. Que Google indexe el contenido de su página y de sus proyectos.
11. Exportar sus datos y borrar su cuenta.
12. Denunciar un perfil que infringe las reglas.

Fuera de v1: formularios y reservas (4), agenda de conexiones (1), cobros y storefront (2), editor de
escritorio de 3 paneles (7), pantalla "Mis Spaces" (5, salvo demanda) y documentos descargables pesados.

## Fases

| Fase | Entregable | Condición para avanzar |
|---|---|---|
| **0** ✅ | Esta auditoría (`docs/identity/00–04`) | Decisiones y preguntas abiertas aprobadas |
| **0.5** ✅ | **Base de pruebas**: Vitest (unidades) + Playwright en el repo con base simulada; script `npm test`; tests de los flujos actuales (URL pública, redirección de username, QR, vCard, autosave) | Los flujos actuales cubiertos y en verde |
| **1** ✅ | **Modelo** (ver `05-modelo-objetivo.md`): tabla `identities` (1 por usuario); `profiles` = Space (`identity_id`, `space_type` con `artist/brand/project/custom`, `visibility` público/no listado/privado, estado `archived`); tablas de versiones y de contenido (`content_objects` + `content_blocks`, empezando por proyectos). Sólo diseño + SQL para revisar | Diseño aprobado |
| **2** ✅ | **Migración** Expand → Migrate → Verify → Switch con bandera; trigger de negocios actualizado; exportar/borrar incluyen lo nuevo | Consultas de verificación OK, respuesta de `get_public_profile` idéntica para todos los publicados |
| **3** ✅ | **Publicación con versiones**: Studio edita la versión de trabajo; "Publicar" crea una versión inmutable; la página pública lee la versión publicada; "cambios sin publicar"; restaurar = nueva versión; deshacer/rehacer local en la sesión; bloqueo optimista; **HTML para buscadores desde la versión publicada** | Flujo C (publicación segura) en verde |
| **4** ✅ | **Registro de módulos**: un solo catálogo para editor, render público y vista previa (reemplaza el `switch` de `ProfileModules` y los `if` de `ModuleEditor`). Mantiene los 13 tipos | Todos los módulos actuales se ven igual (`tests/e2e/modules.spec.ts`) |
| **5** ✅ | **Proyectos y Portfolio**: proyecto con bloques básicos (título, párrafo, imagen, galería, video embebido, cita, separador, créditos), URL `/{username}/projects/{slug}`, portfolio en grilla, se crean desde el editor (6) y quedan en la biblioteca "Mi contenido" | Flujo B (portfolio) en verde |
| **6** ✅ | **Editor móvil por capas** (7): arrastrar para reordenar (`@dnd-kit` ya está instalado) con alternativa de flechas y teclado; duplicar módulo; vista previa a pantalla completa | Todas las acciones posibles sin mouse |
| **7** ✅ | **Links avanzados y Connect** (1): grupos de links, link destacado, programación de visibilidad; tarjeta de identidad descargable (clara/oscura) y "presentación corta" para copiar; mostrar fuentes de tráfico en Analítica | Flujo A completo |
| **8** | **Moderación** (12): botón "Denunciar" en la página pública, tabla de denuncias, revisión en super-admin, suspensión que oculta la página, reglas en `/terminos` | Una denuncia llega y se puede resolver |
| **9** | **Apariencia**: modo automático, radios, fondos, estilo de tarjetas (siempre dentro del sistema de diseño) | Contraste y accesibilidad verificados |
| **10** | **Mis Spaces** (5), cuando haya demanda: crear, duplicar, archivar, Space de marca con username propio | Flujo D (privacidad) en verde |
| **11** | **Editor de escritorio de 3 paneles** (7) | — |
| — | **Plan Pro** (11): definir alcance y precio después de la Fase 3 | Decisión de negocio |

## Trabajo transversal

- **Interfaz en español primero** (9): todo texto nuevo entra a los diccionarios tipados, en los 12 idiomas.
- **Identidad visual Mycen** (10): tokens actuales; blur sólo en navegación flotante, con alternativa sin blur.
- **Comercio** (2): el módulo de producto/servicio termina siempre en WhatsApp o un link externo.
- **Posicionamiento** (13): al terminar la Fase 5, revisar landing y onboarding para que Identity sea la entrada.
- **Nombre** (P4): renombrar "Mycen Profile" → "Mycen Identity" en `CLAUDE.md` y en la interfaz al cerrar la Fase 1.

## Lo que se necesita de vos antes de la Fase 1

1. ~~Aprobar las preguntas P1–P10~~ (aprobadas el 3/10/2026).
2. Correr las consultas de solo lectura de `02-data-model-current.md` y pegar los resultados.
3. Confirmar que hay respaldo de la base (Supabase → Database → Backups) antes de cualquier migración.
