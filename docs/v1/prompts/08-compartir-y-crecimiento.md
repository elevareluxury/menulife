# Prompt 08 — Compartir en todos lados, QR, vista previa y crecimiento

**Rama:** `feat/v1-08-compartir`

## Objetivo

Que poner Mycen en Instagram, WhatsApp y todos lados lleve segundos, que cada link
compartido se vea con la marca, que cada perfil traiga usuarios nuevos y que el
usuario vea los resultados.

## Tareas

1. **"Poné tu Mycen en todos lados"** (página en Studio, accesible desde el Inicio y desde
   "Perfil publicado"): botón "Copiar link" y pasos breves para Instagram, TikTok,
   LinkedIn, WhatsApp Business, WhatsApp personal y la firma de email. Los pasos de cada
   plataforma cambian seguido: escribilos de forma general, en un solo archivo de textos
   fácil de actualizar.

2. **QR con huella:** descargable en PNG y SVG, con la huella alrededor, el nombre de
   usuario debajo y corrección de errores alta. Si no hay librería de QR en el proyecto,
   elegí una liviana y justificála; cargala solo en Studio, nunca en el perfil público.

3. **Vista previa al compartir:** rediseñar la imagen de `api/og/[slug].tsx` con el
   fondo del tema del perfil, la huella (con `huellaToSvg`, funciona en Edge) y el nombre.
   Revisar el título y la descripción para WhatsApp, Instagram, LinkedIn y X.

4. **"Creá tu identidad":** el pie de cada perfil lleva a
   `/registro?ref=<usuario>&tipo=<propósito>`. Guardar `referred_by` en el registro
   (migración) y preseleccionar el tipo en el onboarding.

5. **Analítica como logros** en el Inicio de Studio: una tarjeta semanal con visitas,
   toques en la acción principal, contactos guardados y mensajes, y de dónde llegaron
   (Instagram, WhatsApp, TikTok, búsqueda, directo). Reutilizar la analítica existente;
   si no se registra el origen, sumarlo (referrer y `utm_source`) sin guardar datos
   personales. Mensajes en positivo ("Tu link de Instagram trajo 23 visitas esta semana").

6. Textos en los 12 idiomas.

## Criterios de aceptación

- El QR se escanea bien en iPhone y Android (probalo).
- La vista previa se ve bien al pegar el link en WhatsApp (probalo con un perfil real).
- Un registro desde el pie de un perfil queda atribuido.
- El perfil público sigue bajo el presupuesto de peso.

## Entrega

Seguí el flujo de `CLAUDE.md`. Avisá la migración. Commit: `feat(identity): share everywhere, QR, OG image, referrals and weekly results`.
