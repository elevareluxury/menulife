# Prompt 11 — Life OS: "Mi día"

**Rama:** `feat/v1-11-mi-dia`

## Objetivo

Crear el ritual diario de Life OS: una mañana con foco y un cierre que deja buen sabor.
Pasa a ser la pantalla de inicio de Life OS.

## Tareas

1. **Datos** (migración): tabla `life_daily_reviews` con `user_id`, `date` (fecha local),
   `priorities jsonb` (hasta 3 referencias a tareas o textos libres), `reflection text`
   (≤ 280), `closed_at`. Única por `(user_id, date)`. RLS solo del dueño. Tests en `tests/db/`.

2. **Mañana** (antes del cierre):
   - Saludo según la hora del día.
   - **Máximo 3 prioridades** para hoy, elegidas de las tareas o escritas al vuelo.
     Si el usuario intenta una cuarta, se explica por qué son 3.
   - Hábitos de hoy con marcado rápido (incluye cantidad y "X por semana").
   - Tareas que vencen hoy y las que tienen hora.
   - El objetivo en foco.
   - Todo conectado: tocar algo lo abre en su módulo.

3. **Cierre** (disponible desde las 18 h, o tocando "Cerrar el día"):
   - **Primero lo logrado:** hábitos cumplidos, tareas completadas y prioridades hechas,
     con una celebración breve.
   - Después, lo pendiente: pasar a mañana, cambiar la fecha o soltarlo.
   - Una línea opcional: "¿Cómo te fue hoy?".
   - Se guarda en `life_daily_reviews`.

4. **Inicio:** "Mi día" es la ruta por defecto de Life OS. El Inicio actual se integra
   o se mueve a otra ruta (contalo en el resumen).

5. Estados vacíos: el primer día sin datos invita a crear el primer hábito o la primera
   tarea, con un ejemplo.

6. Textos en los 12 idiomas, sin culpa (sección 12 del sistema de diseño).

## Criterios de aceptación

- Funciona con datos vacíos, normales y muchos (50 tareas, 15 hábitos) sin trabarse.
- Las fechas son locales (probar cerca de la medianoche).
- E2E: elegir 3 prioridades, completar una, cerrar el día y ver lo logrado primero.

## Entrega

Seguí el flujo de `CLAUDE.md`. Avisá la migración. Commit: `feat(life): Mi día — morning focus and evening review`.
