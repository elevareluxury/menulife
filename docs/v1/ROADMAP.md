# Mycen V1 — Hoja de ruta

**MYCEN V1 = IDENTITY + LIFE OS**, con el diseño Universo / Amanecer y la huella Mycen.
Esta versión es la base estable que se congela y se lleva a iOS y Android con Capacitor.

## Regla de alcance

Si algo no está en este documento, **no es V1**: se anota en la sección V1.1 y no se
desarrolla ahora. Durante el freeze solo entran arreglos de errores críticos.

## Qué entra en la V1

### Identity

| # | Funcionalidad | Prompt |
|---|---|---|
| 1 | Sistema de diseño Universo / Amanecer en todo el producto | 01, 07, 12, 13 |
| 2 | Huella Mycen única por perfil (4 estilos, "Generar otra") | 02 |
| 3 | Cinco estructuras de perfil: Credencial, Portada, Editorial, Bento, Clásica | 03 |
| 4 | Tema por perfil (Universo / Amanecer) y acento personal | 03, 06 |
| 5 | Perfil vivo: estado actual y "Disponible" | 03, 06 |
| 6 | Módulo de video y música integrados (YouTube, Vimeo, Spotify, SoundCloud, TikTok) | 04 |
| 7 | Módulo de formulario de contacto con bandeja de mensajes en Studio (sin email) | 05 |
| 8 | Apariencia en Studio con vista previa en vivo | 06 |
| 9 | Onboarding: perfil publicado en menos de 3 minutos, plantillas y momento de la huella | 07 |
| 10 | Spaces visibles y explicados | 07 |
| 11 | "Poné tu Mycen en todos lados", QR con huella y vista previa al compartir | 08 |
| 12 | "Creá tu identidad" en cada perfil, con atribución de registros | 08 |
| 13 | Analítica como logros en el Inicio de Studio | 08 |

### Life OS

| # | Funcionalidad | Prompt |
|---|---|---|
| 14 | Tareas que se repiten y subtareas | 09 |
| 15 | Hábitos con cantidad, "X veces por semana", ancla "después de…", rachas que perdonan y recordatorio por hábito | 10 |
| 16 | "Mi día": mañana con máximo 3 prioridades y cierre nocturno que empieza por lo logrado | 11 |
| 17 | Tono sin culpa: regreso amable, nuevos comienzos, logros como información | 12 |
| 18 | Life OS con el nuevo sistema de diseño, anillos de progreso y celebraciones breves | 12 |

### Transversal

| # | Funcionalidad | Prompt |
|---|---|---|
| 19 | Landing, emails e íconos con la nueva marca | 13 |
| 20 | Métricas de producto propias (activación, retención, regreso) | 14 |
| 21 | Tests automáticos de V1, incluidas capturas visuales y accesibilidad | 15 |

## Qué queda afuera (oculto o para después)

| Funcionalidad | Estado en V1 | Cuándo |
|---|---|---|
| Business (restaurante, servicios, retail) | Oculto con flag; los 2 clientes `os_full` actuales siguen funcionando en la web | V1.1 |
| Insights y Replay | Ocultos con flag | V1.1 |
| Check-ins semanales de objetivos (Fase 2B) | Sin conectar | V1.1 (revisión semanal guiada) |
| Verificación de identidad (tilde) | No se muestra | V1.1 |
| Personas (red de contactos) | — | V1.1 |
| Planes de vida compartibles | — | V1.1 |
| Diario y estado de ánimo | — | V1.1 |
| Ajuste inteligente de hábitos, compañero de metas | — | V1.1 / V1.2 |
| Prioridades y listas de tareas | — | V1.1 |
| Reservas, preguntas frecuentes, cuenta regresiva | — | V1.1 |
| Tarjeta en Apple Wallet / Google Wallet | — | V1.1 |
| Portada con video | Solo huella o imagen en V1 | V1.1 |
| Captura con IA, sincronización de calendario, Apple Salud / Google Fit | — | V1.2 (Salud requiere la app nativa) |
| Traducción automática del perfil, dominio propio, tarjeta NFC | — | V1.2 |
| "Huella viva" que evoluciona con Life OS | — | V1.2 |

## Orden y tiempos estimados

| Etapa | Prompts | Estimado |
|---|---|---|
| Base | 00 Reglas · 01 Sistema de diseño · 02 Huella | 1 semana |
| Identity | 03 · 04 · 05 · 06 · 07 · 08 | 4–5 semanas |
| Life OS (en paralelo con Identity) | 09 · 10 · 11 · 12 | 4 semanas |
| Cierre | 13 Marca · 14 Métricas · 15 Tests | 1,5 semanas |
| Pruebas en dispositivos | 16 | 1 semana |
| Freeze | 17 | 1 día |

Total aproximado: **8 a 10 semanas** si Identity y Life OS avanzan en paralelo.

## Definición de terminado (para cada prompt)

1. Cumple todos los criterios de aceptación del prompt.
2. CI en verde: lint, tests unitarios, build (incluye `tsc -b`), presupuesto de peso y E2E.
3. Textos nuevos en los 12 idiomas.
4. Migraciones idempotentes, con RLS y tests en `tests/db/`.
5. Probado en el preview de Vercel en un celular real.
6. Sin romper nada de lo anterior (los E2E existentes siguen pasando).

## Métricas de éxito de la V1

| Métrica | Objetivo inicial |
|---|---|
| Tiempo desde el registro hasta el perfil publicado (mediana) | < 3 minutos |
| Cuentas con perfil publicado | > 70 % |
| Visitas a perfiles que llegan desde Instagram, WhatsApp y otras redes | creciente semana a semana |
| Retención de Life OS a 7 días | > 30 % |
| Usuarios que cumplen un hábito 4+ días por semana | > 25 % de los activos |
| Tasa de regreso después de 3+ días sin entrar | medirla y mejorarla |
| Registros que llegan desde "Creá tu identidad" | medirla desde el día 1 |

Se mide con el sistema propio del prompt 14, sin herramientas de terceros.

## Después del freeze

1. Capacitor: iOS y Android desde `release/v1`, con notificaciones nativas para los
   recordatorios de hábitos y tareas. Ocultar en la app todo lo relacionado con precios.
2. V1.1: Business + la profundidad de Life OS + verificación, en `main`.
