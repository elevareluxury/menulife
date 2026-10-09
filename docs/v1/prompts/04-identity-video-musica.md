# Prompt 04 — Módulo de video y música integrados

**Rama:** `feat/v1-04-media`

## Objetivo

Que los videos y la música se reproduzcan dentro del perfil, sin salir de Mycen.

## Contexto del código

- Catálogo de módulos: `src/modules/studio/lib/moduleCatalog.ts`.
- Ya existe soporte de YouTube y Vimeo para proyectos en `src/modules/profile/lib/video.ts`:
  reutilizalo y extendelo.

## Tareas

1. Nuevo tipo de módulo `media` (addable), con proveedores:
   YouTube (usar `youtube-nocookie.com`), Vimeo, Spotify (track, álbum, playlist, podcast),
   SoundCloud y TikTok.
2. Parser de URLs con lista cerrada de dominios permitidos. Cualquier otra URL se rechaza
   con un mensaje claro en el editor.
3. **Patrón de fachada (obligatorio):** el perfil muestra una tarjeta liviana
   (`MediaCard`) con la huella del perfil de fondo, el título y un botón de reproducir.
   El `iframe` del proveedor **solo se carga cuando el visitante toca reproducir**.
   Así no hay pedidos a terceros al abrir el perfil y no se rompe el presupuesto de peso.
4. `iframe` con `title` descriptivo, `allow` mínimo por proveedor, `loading="lazy"` y
   `referrerpolicy="strict-origin-when-cross-origin"`.
5. Editor en Studio: pegar el link → se detecta el proveedor → vista previa de la fachada
   → título opcional.
6. Tamaño en Bento: video `L`, música `M`.
7. Textos en los 12 idiomas.

## Criterios de aceptación

- Al abrir un perfil con 3 módulos de media no hay ningún pedido de red a YouTube,
  Spotify, etc. (verificarlo en un E2E interceptando la red).
- Al tocar reproducir, se carga el reproductor del proveedor.
- Tests unitarios del parser con URLs válidas e inválidas de cada proveedor.

## Entrega

Seguí el flujo de `CLAUDE.md`. Commit: `feat(profile): embedded video and music module`.
