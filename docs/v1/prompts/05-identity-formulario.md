# Prompt 05 — Formulario de contacto y bandeja de mensajes

**Rama:** `feat/v1-05-form`

## Objetivo

Que un visitante pueda dejar un mensaje sin salir del perfil, y que el dueño lo reciba
en Studio. **No hay aviso por email**: los mensajes viven solo en Studio.

## Tareas

1. **Datos** (migración):
   - Tabla `profile_messages`: `id`, `profile_id`, `name`, `contact`, `message`,
     `created_at`, `read_at`. **No guardar IP ni datos del navegador.**
   - RLS: el dueño del perfil lee, marca como leído y borra. Nadie inserta directo:
     solo mediante una función RPC `submit_profile_message` (security definer).
   - La RPC valida largos (nombre ≤ 80, contacto ≤ 120, mensaje ≤ 2000), rechaza mensajes
     con más de 3 links, y limita frecuencia: máximo 5 mensajes por visitante por perfil por
     día, usando un hash del visitante con la sal existente (`mycen_private.secrets`,
     clave `visitor_salt`, mismo patrón que la moderación) sin guardar el dato original.
   - Tests en `tests/db/`.

2. **Módulo `contact_form`** (addable): campos nombre, "Email o WhatsApp" y mensaje.
   Campo trampa oculto para bots y tiempo mínimo de llenado de 3 segundos.
   Estados: enviando, enviado ("Mensaje enviado. Te van a responder pronto."), error con
   salida clara, y límite alcanzado.

3. **Bandeja en Studio:** sección "Mensajes" con contador de no leídos, lista, detalle,
   marcar como leído, borrar, y botones para responder por email o WhatsApp según el
   contacto que dejó la persona.

4. **Aviso dentro de Studio:** contador de mensajes sin leer visible en la navegación
   de Studio (en celular y computadora) y en el Inicio, que se actualiza al entrar y al
   volver a la pestaña. Sin emails ni servicios externos. Dejá la lógica del contador en un
   hook reutilizable (`useUnreadMessages`), porque con la app nativa se va a usar para
   notificaciones push.

5. **Privacidad:** actualizá la política de privacidad (12 idiomas) para explicar qué
   datos guarda el formulario, quién los ve y cómo se borran.

6. Textos en los 12 idiomas.

## Criterios de aceptación

- Un visitante sin cuenta puede enviar; el dueño lo ve en Studio con el contador de no leídos; otro usuario no puede leerlo.
- No se envía ningún email.
- El límite de frecuencia y la trampa funcionan (tests).
- E2E: enviar un mensaje desde el perfil y verlo en la bandeja.

## Entrega

Seguí el flujo de `CLAUDE.md`. Avisá la migración. Commit: `feat(identity): contact form module and messages inbox`.
