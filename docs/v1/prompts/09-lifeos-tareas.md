# Prompt 09 — Life OS: tareas que se repiten y subtareas

**Rama:** `feat/v1-09-tareas`

## Objetivo

Cubrir lo básico que hace que alguien abandone una app de tareas en la primera semana.

## Contexto del código

- Las tareas viven en `life_brain_items` con `type = 'task'` (hook `useTasks.ts`).
  Hay una tabla `life_tasks` que parece sin uso: confirmalo y no la uses.
- UI: `TaskSheet.tsx`, `TasksView.tsx` (lista y calendario), recordatorios en `useTaskReminders.ts`.

## Tareas

1. **Datos** (migración sobre `life_brain_items`):
   - `recurrence jsonb` con forma
     `{ freq: 'daily' | 'weekly' | 'monthly' | 'interval', interval?: number, weekdays?: number[], monthday?: number }`.
   - `subtasks jsonb` con forma `[{ id, text, done }]`, máximo 20 elementos y 200
     caracteres por texto (validado en la base).
   - Tests en `tests/db/`.

2. **Repetición:**
   - Al completar una tarea que se repite, se crea la siguiente ocurrencia con la próxima
     fecha (la completada queda como historial). Las subtareas de la nueva vuelven a "sin hacer".
   - Función pura `nextOccurrence(dueDate, recurrence)` en `src/modules/life/lib/`, con
     fechas **locales** del usuario (no UTC). Casos: diario, ciertos días de la semana,
     mensual (si el día no existe en el mes, el último día: 31 de enero → 28 o 29 de febrero),
     cada N días.
   - Sin fecha de vencimiento no se puede repetir (el selector lo explica).
   - Recordatorios: la nueva ocurrencia hereda la hora y el aviso previo.

3. **Subtareas:** checklist dentro de `TaskSheet`, agregar, tildar, reordenar y borrar;
   en la lista se ve el progreso ("3 de 5").

4. **UI:** selector de repetición simple ("No se repite", "Todos los días",
   "Días de semana", "Cada semana el…", "Cada mes el día…", "Personalizado"), ícono de
   repetición en la lista y en el calendario, y las próximas ocurrencias en el calendario.

5. Textos en los 12 idiomas.

## Criterios de aceptación

- Tests unitarios de `nextOccurrence` con todos los casos, incluidos fin de mes y año bisiesto.
- E2E: crear una tarea semanal con subtareas, completarla, y ver la siguiente con
  subtareas reiniciadas.

## Entrega

Seguí el flujo de `CLAUDE.md`. Avisá la migración. Commit: `feat(life): recurring tasks and subtasks`.
