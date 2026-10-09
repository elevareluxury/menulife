# Prompt 15 — Tests de la V1

**Rama:** `test/v1-15-tests`

## Objetivo

Dejar una red de seguridad que proteja la V1 congelada mientras `main` sigue avanzando.

## Tareas

1. **E2E faltantes** (sumar solo los que no se hayan creado en prompts anteriores):
   - Life OS: tareas repetidas y subtareas, hábitos con cantidad y "X por semana",
     racha que perdona, "Mi día" completo (mañana y cierre), regreso después de días.
   - Identity: onboarding completo en celular, apariencia, módulo de media (fachada),
     formulario y bandeja, compartir y QR.
   - Login → destino correcto para cada tipo de usuario (sin pasar por Business).
2. **Capturas visuales** con `toHaveScreenshot` de Playwright: las cinco estructuras
   × dos temas, en 390 px y en 1280 px, con animaciones desactivadas y fechas fijas.
   Más "Mi día", Hábitos y el Inicio de Studio en los dos temas.
3. **Accesibilidad automática** con `@axe-core/playwright` (dependencia de desarrollo)
   sobre el perfil público (cinco estructuras), el onboarding, Studio y "Mi día":
   cero violaciones serias o críticas.
4. Correr toda la suite tres veces seguidas: cero tests inestables. Si alguno falla de
   forma intermitente, hacerlo determinista.
5. Sumar al CI las capturas y la accesibilidad.

## Criterios de aceptación

- CI en verde con todo lo nuevo.
- Duración total del CI reportada (si supera 15 minutos, proponer cómo dividirlo).

## Entrega

Seguí el flujo de `CLAUDE.md`. Commit: `test: V1 e2e, visual regression and accessibility suites`.
