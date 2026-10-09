# Prompt 14 — Métricas de producto propias

**Rama:** `feat/v1-14-metricas`

## Objetivo

Medir si la V1 cumple su propósito (ver "Métricas de éxito" en el ROADMAP), sin
herramientas de terceros ni datos personales de más.

## Tareas

1. **Datos** (migración): tabla `product_events` (`id`, `user_id` nullable, `event`,
   `props jsonb` ≤ 2 KB, `created_at`). Insert solo mediante RPC con lista cerrada de
   eventos y límite de frecuencia. Lectura solo para super-admin. Tests en `tests/db/`.

2. **Eventos:**
   - Identity: `signup_started`, `signup_completed` (con `ref` si vino de un perfil),
     `onboarding_step` (paso), `profile_published` (segundos desde el registro),
     `share_tool_used` (plataforma), `qr_downloaded`, `appearance_changed` (estructura y tema).
   - Life OS: `life_my_day_opened`, `life_priorities_set`, `life_day_closed`,
     `habit_logged`, `task_completed`, `life_returned` (días de ausencia).

3. **Panel en `/super-admin`:** mediana de tiempo hasta publicar, porcentaje de cuentas
   publicadas, retención de Life OS a 1, 7 y 30 días por cohorte semanal, porcentaje de
   usuarios con un hábito cumplido 4+ días por semana, tasa de regreso, y registros por
   referido.

4. **Privacidad:** documentar los eventos en la política de privacidad (12 idiomas).
   No guardar contenido de tareas, hábitos ni mensajes en los eventos.

## Criterios de aceptación

- Los eventos se registran sin bloquear la interfaz (si falla, se ignora).
- El panel carga en menos de 2 segundos con 100.000 eventos (agregar índices).

## Entrega

Seguí el flujo de `CLAUDE.md`. Avisá la migración. Commit: `feat(metrics): first-party product metrics and admin dashboard`.
