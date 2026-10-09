# Prompt 06 — Apariencia en Studio con vista previa en vivo

**Rama:** `feat/v1-06-apariencia`

## Objetivo

Que el usuario elija la estructura, el tema, el acento, la huella y la portada de su
perfil viendo el resultado en vivo.

## Contexto del código

- `src/modules/studio/pages/AppearancePage.tsx` (opciones actuales: esquinas, fondo,
  tarjetas, fuente, acento, claro/oscuro).

## Tareas

1. Reemplazar las opciones viejas por las nuevas, en este orden:
   1. **Estructura:** cinco tarjetas con miniatura real de cada una y para quién es
      ("Para personas", "Para artistas y creadores", etc.).
   2. **Tema:** Universo o Amanecer.
   3. **Acento:** los cuatro de la paleta.
   4. **Huella:** los cuatro estilos con la huella real del usuario, y un botón
      "Generar otra" que cambia `huella_salt`. Advertir que la anterior no se puede recuperar
      y permitir deshacer mientras no se guarde.
   5. **Portada** (solo si la estructura es Portada): huella o imagen propia
      (usar la subida de imágenes existente, con su compresión a WebP).
   6. **Estado actual** (texto de hasta 60 caracteres) y el interruptor "Disponible".
2. **Vista previa en vivo** del perfil completo en un marco de celular, que se actualiza
   al instante con cada cambio, antes de guardar.
3. Las opciones viejas (esquinas, fondo, tarjetas, fuente) se quitan de la interfaz;
   los datos viejos quedan sin uso. No borrar columnas.
4. Studio se ve en el tema del sistema del celular (ver sistema de diseño, sección 3).
5. Textos en los 12 idiomas.

## Criterios de aceptación

- Cada cambio se ve en la vista previa en menos de 100 ms y se guarda bien.
- "Generar otra" cambia la huella en el editor, la vista previa y el perfil publicado.
- E2E: cambiar estructura, tema y acento, guardar, y verificarlo en el perfil público.

## Entrega

Seguí el flujo de `CLAUDE.md`. Commit: `feat(studio): appearance with live preview`.
