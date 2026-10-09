# Prompt 02 — La huella Mycen

**Rama:** `feat/v1-02-huella`

## Objetivo

Llevar el generador de `docs/design/huella.ts` al código, con su componente y sus tests.

## Tareas

1. Copiá `docs/design/huella.ts` a `src/lib/huella/huella.ts` sin cambiar el algoritmo
   (las huellas tienen que ser idénticas a las del diseño). Exportá desde
   `src/lib/huella/index.ts`. No debe importar nada del DOM ni de React.

2. Componente `src/design/components/Huella.tsx`:
   - Props: `seed`, `variant`, `size`, `colorA`, `colorB`, `spin` (boolean),
     `draw` (boolean: animación de dibujo para la entrada y el onboarding).
   - Renderiza un `<svg>` con `aria-hidden="true"`, memorizado por `seed + variant`.
   - `spin` usa la clase `.my-spin`. `draw` anima `stroke-dashoffset` en 600 ms.
     Las dos se apagan con "reducir movimiento".
   - Ids de gradiente únicos por instancia (puede haber varias en la misma página).

3. Semilla: helper `huellaSeed(profile)` que devuelve `` `${profile.id}:${profile.huella_salt ?? ''}` ``.
   La columna `huella_salt` llega en el prompt 03; mientras tanto el helper acepta que no exista.

4. Tests unitarios (`tests/unit/huella.test.ts`):
   - Determinismo: misma semilla y estilo → resultado idéntico.
   - Semillas distintas → trazos distintos, en los cuatro estilos.
   - Cada estilo devuelve entre 1 y 16 trazos.
   - `huellaToSvg` produce SVG válido y no deja pasar caracteres peligrosos en los colores.
   - Rendimiento: 200 huellas en menos de 1 segundo.

5. Sumá la huella a la página `/dev/design`, con los cuatro estilos en los dos temas.

## Criterios de aceptación

- Tests en verde y presupuesto de peso sin cambios (todavía no se usa en páginas públicas).

## Entrega

Seguí el flujo de `CLAUDE.md`. Commit: `feat(huella): deterministic Mycen huella generator and component`.
