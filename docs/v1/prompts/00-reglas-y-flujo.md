# Prompt 00 — Reglas de trabajo y documentos de la V1

**Rama:** `chore/v1-00-reglas`

## Objetivo

Subir al repo los documentos de la V1 y dejar en `CLAUDE.md` las reglas que vas a
seguir en todas las etapas siguientes.

## Tareas

1. Verificá que existan en el repo (los acabo de copiar):
   - `docs/design/DESIGN_SYSTEM.md`
   - `docs/design/huella.ts`
   - `docs/v1/ROADMAP.md`
   - `docs/v1/prompts/00…17`
   Leé los tres primeros completos.

2. Agregá al final de `CLAUDE.md` una sección **"Mycen V1 — reglas de trabajo"** con esto:

   ### Antes de cada tarea
   - Leer `docs/design/DESIGN_SYSTEM.md` y `docs/v1/ROADMAP.md`.
   - Si la tarea pide algo fuera del alcance del ROADMAP, avisar antes de hacerlo.

   ### Flujo
   - Nunca pushear a `main`. Cada prompt va en su propia rama (la indica el prompt),
     partiendo de `main` actualizada.
   - No hay `gh`: al terminar, pushear la rama y dar el link
     `https://github.com/elevareluxury/menulife/pull/new/<rama>`.
   - No mergear: lo hace el usuario después de probar el preview.
     **Excepción:** en modo piloto automático (`docs/v1/prompts/PILOTO-AUTOMATICO.md`),
     con `gh` instalado, se crea el PR, se espera el CI y se mergea siguiendo ese archivo.

   ### Verificación obligatoria antes de pushear (los mismos pasos del CI)
   - `npx eslint` con la lista de carpetas de `.github/workflows/ci.yml`
   - `npm test`
   - `npm run build` (incluye `tsc -b`)
   - `node scripts/check-bundle-budget.mjs`
   - `npm run test:e2e`
   Reportar el resultado de cada uno. Si algo falla, arreglarlo antes de pushear.

   ### Código
   - Colores, radios, sombras y tipografías solo desde las variables del sistema de diseño.
   - Todo texto visible al usuario va por i18n, en los 12 idiomas (`es` es la fuente).
   - Migraciones: nombre `YYYYMMDDHHMMSS_descripcion.sql`, idempotentes, con RLS,
     y con tests en `tests/db/`. Avisar en el resumen que hay que aplicarlas en Supabase.
   - Funciones fuera de la V1 van detrás de `src/lib/features.ts`.
   - No sumar dependencias sin justificarlo en el resumen (peso, mantenimiento, alternativa).
   - Nada de contenedores con scroll interno ni `touch-action: none` en páginas públicas.

   ### Resumen al terminar
   Rama y link del PR, commits, migraciones a aplicar, resultado de cada verificación,
   y qué probar en el celular.

3. En `.github/workflows/ci.yml`, sumá al paso de lint las carpetas nuevas que se van a
   crear en la V1: `src/lib/huella` y `src/design`. Si todavía no existen, creá en cada una
   un `index.ts` vacío exportando nada (`export {}`) para que el lint no falle.

4. Commit: `docs: Mycen V1 design system, roadmap and prompts`. Push de la rama.
