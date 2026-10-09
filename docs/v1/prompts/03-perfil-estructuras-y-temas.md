# Prompt 03 — Perfil público: cinco estructuras, temas y perfil vivo

**Rama:** `feat/v1-03-perfil`

## Objetivo

Rediseñar el perfil público (y los Spaces, que usan el mismo renderizado) con las cinco
estructuras del sistema de diseño (sección 9), los temas Universo / Amanecer, el acento
personal, la huella y el estado actual.

## Contexto del código

- Página: `src/modules/profile/pages/ProfilePublicPage.tsx`, estilos en `profile.css`.
- Tipos: `src/modules/profile/lib/profileTypes.ts` (`PublicProfile`, `theme: ProfileTheme`).
- Tema actual: `src/modules/profile/lib/profileTheme.ts` (esquinas, fondo, tarjetas,
  fuente, acento, claro/oscuro).
- Averiguá cómo se obtiene el perfil público (RPC o vista en Supabase) antes de cambiar datos.

## Tareas

1. **Datos** (migración + tipos):
   - Extender `ProfileTheme` con: `layout` (`credencial | portada | editorial | bento | clasica`),
     `mode` (`universo | amanecer`), `accent` (`plasma | ion | nebulosa | aurora`),
     `huella_variant` (`orbitas | hilos | constelacion | pulso`) y
     `cover` (`{ type: 'huella' | 'imagen', url?: string }`, solo para Portada).
   - Nuevas columnas del perfil: `huella_salt text`, `status_text text` (máx. 60 caracteres),
     `available boolean default false`.
   - Exponerlas en la consulta pública y validarlas (enums y largos) del lado de la base.
   - **Migración de perfiles existentes:** `layout = clasica`, `mode = universo`, y el acento
     de la paleta más cercano al color que tenían. Nadie debe ver su perfil roto.
   - Tests en `tests/db/` para las validaciones y los permisos.

2. **Renderizado:**
   - Un componente por estructura en `src/modules/profile/layouts/`, cargado de forma
     diferida según `layout` (cada estructura en su propio chunk).
   - Los módulos existentes se reutilizan; cada estructura decide la composición.
     En Bento, cada tipo de módulo tiene un tamaño (`S`, `M` o `L`) definido en un solo lugar.
   - `data-mycen-theme` y `data-mycen-accent` en la raíz del perfil.
   - Huella: semilla `huellaSeed(profile)`, estilo `huella_variant`, colores del tema.
   - Portada: primera pantalla de `100svh` con huella o imagen; nombre, acción principal,
     "Guardar contacto" y la señal "Más sobre mí" visibles dentro de la tapa.
   - Estado actual (`StatusChip`) si hay `status_text`; "Disponible" si `available`.
   - Entrada orquestada única (sección 7 del sistema de diseño).
   - **No** mostrar ningún tilde de verificación en la V1.
   - Pie "mycen · Creá tu identidad" en todos los perfiles (el link con atribución llega
     en el prompt 08; por ahora a `/registro`).

3. **Rendimiento y seguridad del gesto:**
   - Sin contenedores con scroll interno ni `touch-action: none`.
   - Las páginas de perfil y proyecto siguen bajo 240 KB gzip.

## Criterios de aceptación

- Las cinco estructuras se ven como los mockups, en los dos temas y los cuatro acentos,
  en 360, 390 y 430 px de ancho y en computadora.
- Los perfiles existentes se ven bien después de la migración.
- Scroll fluido en iOS (probalo en el preview con un iPhone).
- E2E: un test por estructura que verifique que el perfil carga, la acción principal es
  visible sin scroll y el pie aparece.

## Entrega

Seguí el flujo de `CLAUDE.md`. Avisá la migración. Commit: `feat(profile): five layouts, themes, huella and live status`.
