# Prompt 01 — Sistema de diseño base

**Rama:** `feat/v1-01-design-base`

## Objetivo

Crear la base visual de Mycen (variables, tipografías, fondos, movimiento y componentes)
**sin rediseñar todavía ninguna pantalla**. Las etapas siguientes la usan.

## Tareas

1. **Tipografía:** sumá `@fontsource/unbounded` (pesos 500 y 700, subsets `latin` y
   `latin-ext`). Definí las pilas de fuentes de la sección 4 del sistema de diseño, con
   caída a la fuente del sistema para ar, hi, ja, ko, ru y zh.

2. **Variables:** creá `src/design/tokens.css` con todas las variables de la sección 3
   para `[data-mycen-theme="universo"]` y `[data-mycen-theme="amanecer"]`, más
   `[data-mycen-accent="plasma|ion|nebulosa|aurora"]` que define `--my-accent`,
   `--my-on-accent` y `--my-glow` para cada tema. Importalo una sola vez de forma global.

3. **Fondos:**
   - Generá con un script (`scripts/generate-starfield.mjs`) un campo de estrellas como
     SVG liviano y repetible (menos de 8 KB), con una versión para universo y otra para
     amanecer (pocas estrellas, solo en la parte superior). Guardalos en `public/design/`.
   - Creá las clases `.my-sky` (nebulosas o cielo + estrellas según el tema).

4. **Movimiento:** `src/design/motion.css` con `.my-float` (y retrasos `.my-float-1…6`),
   `.my-spin`, `.my-pulse`, y la secuencia de entrada del perfil. Todo apagado con
   `prefers-reduced-motion: reduce`.

5. **Vidrio con caída:** con `prefers-reduced-transparency: reduce` o
   `navigator.hardwareConcurrency <= 4`, agregá `data-mycen-lowfx` al `html` y hacé
   que el vidrio pase a un color sólido equivalente sin `backdrop-filter`.

6. **Componentes** en `src/design/components/`, tipados, accesibles y solo con variables:
   `GlassPanel` (variantes `default` y `hero`), `PrimaryAction` (como `<a>` o `<button>`),
   `IconButton` (exige `aria-label`), `Chip`, `StatusChip` (con punto que late),
   `Field` (label + input/textarea), `Sheet` (hoja inferior en celular, diálogo en
   computadora, con foco atrapado y cierre con Escape).
   Exportalos desde `src/design/index.ts`.

7. **Página de muestra solo para desarrollo:** `/dev/design`, cargada solo si
   `import.meta.env.DEV`, que muestre todos los componentes en los dos temas y los
   cuatro acentos. No debe entrar en el build de producción.

## Criterios de aceptación

- Ninguna pantalla existente cambia de aspecto.
- El presupuesto de peso no sube (verificalo con el script y reportá los números).
- Contraste verificado: texto principal y secundario sobre vidrio, en los dos temas,
  ≥ 4.5:1. Agregá un test unitario que calcule los contrastes de las variables.
- `/dev/design` funciona en desarrollo y no existe en producción.

## Entrega

Seguí el flujo de `CLAUDE.md`. Commit: `feat(design): Mycen design system base`.
