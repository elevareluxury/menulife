# Prompt 12 — Life OS: tono sin culpa y nuevo diseño

**Rama:** `feat/v1-12-life-diseno`

## Objetivo

Que Life OS se sienta como el resto de Mycen y que trate al usuario como una persona
real que a veces falla y vuelve.

## Tareas

1. **Regreso sin culpa:** si el usuario vuelve después de 3 días o más sin entrar,
   en "Mi día" aparece "Bienvenido de vuelta" con una sugerencia chica (un solo hábito
   para hoy). Nunca mostrar rachas perdidas en ese momento.

2. **Nuevos comienzos:** los lunes y el día 1 de cada mes, una tarjeta breve y
   descartable para revisar objetivos. Una vez por fecha.

3. **Logros como información:** revisar los logros existentes (`life_achievements`,
   `useLifeEngagement`) para que comuniquen progreso real ("Este mes cumpliste tus
   hábitos 18 días, 6 más que el mes pasado") en lugar de premios vacíos.

4. **Revisión de textos de Life OS** en los 12 idiomas: ningún texto culpa, regaña ni
   compara con otras personas. Cada error y estado vacío dice qué hacer.

5. **Diseño:** todas las pantallas de Life OS (Mi día, Objetivos, Hábitos, Finanzas,
   Ideas y tareas, Ajustes, hojas y diálogos) con los componentes y variables de
   `src/design`, en los dos temas siguiendo el sistema.
   - Anillos de progreso en hábitos con cantidad y en la semana.
   - Celebración breve al completar (animación corta, apagada con "reducir movimiento")
     y `navigator.vibrate(15)` donde exista.

6. Revisar los flags: Insights, Replay y Business siguen ocultos.

## Criterios de aceptación

- Ninguna pantalla de Life OS queda con el estilo viejo.
- Contraste AA en los dos temas.
- E2E existentes de Life OS siguen pasando.

## Entrega

Seguí el flujo de `CLAUDE.md`. Commit: `feat(life): kind tone and Mycen design system`.
