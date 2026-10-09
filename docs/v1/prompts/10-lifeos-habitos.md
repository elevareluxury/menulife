# Prompt 10 — Life OS: hábitos que se adaptan a la vida real

**Rama:** `feat/v1-10-habitos`

## Objetivo

Hábitos diseñados según la evidencia sobre formación de hábitos: con señal concreta,
con cantidad, flexibles, que perdonan un día perdido y que recuerdan a tiempo.

## Contexto del código

- `useHabits.ts` (`HabitFrequency = { type: 'daily' | 'weekly', days }`, `calculateStreak`),
  `LifeHabitsPage.tsx`, `HabitSheet.tsx`.
- `life_habit_logs` tiene `UNIQUE (habit_id, completed_date)` y no guarda cantidad.

## Tareas

1. **Datos** (migración):
   - `life_habits`: `target_value numeric` (null = hábito de sí/no), `unit text`
     (≤ 20 caracteres), `anchor text` (≤ 60, el "después de…"), `reminder_time time`,
     `reminder_enabled boolean default false`.
   - `frequency` admite además `{ type: 'times_per_week', times: 1..7 }`.
   - `life_habit_logs`: `value numeric default 1`. Un hábito con cantidad se considera
     cumplido el día que `value >= target_value`.
   - Tests en `tests/db/`.

2. **Hábitos con cantidad:** botón "+1" (y edición del valor), anillo de progreso
   ("5 de 8 vasos").

3. **"X veces por semana":** cualquier día cuenta; la semana se cumple al llegar a X.
   La vista semanal muestra "2 de 3 esta semana".

4. **Ancla:** campo opcional en `HabitSheet` ("Después de…", con ejemplos: "el café",
   "lavarme los dientes"). Se muestra debajo del nombre del hábito y es el texto del recordatorio.

5. **Rachas que perdonan** (nueva `calculateStreak`, función pura):
   - Hábitos con días programados: un día programado perdido **no** rompe la racha;
     la rompen **dos días programados seguidos** sin cumplir. El día perdido no suma.
   - "X veces por semana": la racha cuenta semanas cumplidas; una semana sin cumplir
     no la rompe, dos seguidas sí.
   - El día de hoy sin cumplir nunca cuenta como perdido.
   - Tests unitarios exhaustivos de todos los casos.

6. **Recordatorio por hábito** a la hora elegida, reutilizando el mecanismo de
   `useTaskReminders` (en la web solo avisa con Life OS abierto; las notificaciones
   nativas llegan con Capacitor). El texto: "Después de {ancla}: {hábito}" o solo el hábito.

7. Textos en los 12 idiomas.

## Criterios de aceptación

- Los hábitos existentes siguen funcionando igual (sí/no, diarios o por días).
- E2E: hábito de cantidad, hábito "3 veces por semana" y racha que sobrevive a un día perdido.

## Entrega

Seguí el flujo de `CLAUDE.md`. Avisá la migración. Commit: `feat(life): quantity habits, weekly targets, anchors, forgiving streaks and reminders`.
