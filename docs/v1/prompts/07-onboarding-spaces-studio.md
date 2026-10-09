# Prompt 07 — Onboarding en 3 minutos, Spaces visibles y Studio rediseñado

**Rama:** `feat/v1-07-onboarding`

## Objetivo

Que un usuario nuevo publique su perfil en menos de 3 minutos, viva el momento de su
huella, entienda los Spaces, y que Studio entero use el nuevo sistema de diseño.

## Contexto del código

- Onboarding: `src/modules/onboarding/` (hay plantillas en `src/modules/hub/lib/hubTemplates.ts`).
- Spaces: `src/modules/studio/pages/SpacesPage.tsx`; en celular hoy están escondidos en "Más".

## Tareas

1. **Onboarding nuevo**, un paso por pantalla, con progreso visible:
   1. Nombre visible.
   2. Nombre de usuario (con la verificación de disponibilidad y reservados existente).
   3. ¿Para qué es tu perfil? Persona, Artista o creador, Profesional, Negocio o
      emprendimiento. Define la estructura por defecto (Credencial, Portada, Editorial,
      Bento) y los módulos iniciales.
   4. Foto (opcional, se puede saltear).
   5. WhatsApp e Instagram (opcionales): crean la acción principal y el módulo de redes.
   6. **El momento de la huella:** pantalla a oscuras, la huella se dibuja
      (`<Huella draw />`) y aparece "Esta es tu huella Mycen. Nadie más tiene una igual."
   7. Vista previa del perfil y botón "Publicar perfil" → "Perfil publicado" con el link
      para copiar y compartir.
   Todo lo demás (módulos, apariencia) se completa después en Studio.

2. **Spaces visibles:**
   - En celular, "Mis Spaces" sale de "Más" y va a la navegación principal o a una
     tarjeta fija en el Inicio de Studio.
   - Explicación con ejemplos ("tu banda", "tu emprendimiento", "tu evento") y el link
     de ejemplo `mycen.id/tu-usuario/nombre`.
   - Crear un Space usa la misma Apariencia del prompt 06.

3. **Studio con el sistema de diseño:** navegación, Inicio, editor de módulos, proyectos,
   ajustes y bandeja de mensajes, con componentes de `src/design`, en los dos temas.
   No cambiar comportamiento, solo apariencia (salvo lo pedido arriba).

4. Textos en los 12 idiomas.

## Criterios de aceptación

- E2E: registro → onboarding completo → perfil publicado, cronometrado. El camino
  mínimo (saltando lo opcional) no tiene más de 7 pantallas.
- Un usuario nuevo nunca ve nada de Business.
- Spaces accesibles con un toque desde la navegación en celular.

## Entrega

Seguí el flujo de `CLAUDE.md`. Commit: `feat(onboarding): 3-minute publish, huella moment, visible Spaces, Studio redesign`.
