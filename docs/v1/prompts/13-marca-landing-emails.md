# Prompt 13 — Marca completa: landing, emails e íconos

**Rama:** `feat/v1-13-marca`

## Objetivo

Que todo lo que una persona ve de Mycen, antes y fuera de la app, cuente la misma historia.

## Tareas

1. **Landing** (`src/components/landing/`):
   - El hero muestra la propuesta de Mycen con el universo y una huella grande.
   - Una sección que muestre las cinco estructuras de perfil (imágenes estáticas
     generadas desde perfiles de ejemplo, no componentes en vivo) y los dos temas.
   - Una sección breve de Life OS con "Mi día".
   - **Prohibido** cualquier contenedor con scroll interno o captura de gestos (fue el bug
     del scroll en iOS). Probar el scroll en un iPhone real.
   - Presupuesto de la landing ≤ 310 KB gzip.
2. **Emails** (bienvenida, confirmación de cuenta, recuperar contraseña): HTML compatible con clientes de correo (tablas y estilos en línea),
   con la paleta **Amanecer** (los fondos oscuros fallan en muchos clientes de correo),
   la huella como imagen y el texto en el idioma del usuario.
3. **Íconos y metadatos:** favicon nuevo, `theme-color` según el tema, ícono para
   "Agregar a pantalla de inicio", y un SVG maestro del ícono de app en
   `design/app-icon/` listo para generar los tamaños de iOS y Android en la fase de Capacitor.
4. Textos en los 12 idiomas.

## Criterios de aceptación

- Lighthouse en celular: rendimiento ≥ 85 y accesibilidad ≥ 95 en la landing.
- Los emails se ven bien en Gmail (web y app) y en Apple Mail (probalo enviando uno de prueba).

## Entrega

Seguí el flujo de `CLAUDE.md`. Commit: `feat(brand): landing, emails and icons with the new identity`.
