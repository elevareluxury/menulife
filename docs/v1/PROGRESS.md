# Mycen V1 — Avance del piloto automático

Estados: Pendiente · En curso · PR abierto · Mergeada. Una etapa por PR.
En Claude Code en la web todas las etapas usan la rama asignada a la sesión (un PR distinto por etapa).

| Etapa | Nombre | Estado | PR | Migraciones | Notas |
|---|---|---|---|---|---|
| 00 | Reglas y documentos | Mergeada | [#38](https://github.com/elevareluxury/menulife/pull/38) | — | Contradicción corregida en 16: el formulario no manda email. |
| 01 | Sistema de diseño base | Mergeada | [#39](https://github.com/elevareluxury/menulife/pull/39) | — | Tokens globales: +1 KB gzip por página (perfil 223, proyecto 214, landing 292). |
| 02 | Huella | Mergeada | [#40](https://github.com/elevareluxury/menulife/pull/40) | — | Sin cambios de peso (todavía no se usa en páginas públicas). |
| 03 | Perfil: estructuras, temas y perfil vivo | Mergeada | [#41](https://github.com/elevareluxury/menulife/pull/41) | `20261015000001_v1_profile_look.sql` (aplicada) | Perfiles claros → Amanecer (el prompt decía todo Universo). Studio → Apariencia vieja sigue hasta la 06. |
| 04 | Video y música | Mergeada | [#42](https://github.com/elevareluxury/menulife/pull/42) | `20261016000001_v1_media_module.sql` (aplicada) | Proveedores sumados a privacidad (12 idiomas). |
| 05 | Formulario y bandeja | Mergeada | [#43](https://github.com/elevareluxury/menulife/pull/43) | `20261017000001_v1_profile_messages.sql` (aplicada) | Sin email (ver 16). Privacidad actualizada (12 idiomas). |
| 06 | Apariencia con vista previa | Mergeada | [#44](https://github.com/elevareluxury/menulife/pull/44) | — | Studio en el tema del celular (punto 4) va con el rediseño de Studio en la 07. |
| 07 | Onboarding, Spaces y Studio | Mergeada | 07a [#45](https://github.com/elevareluxury/menulife/pull/45), 07b [#46](https://github.com/elevareluxury/menulife/pull/46) | — | Studio sigue el tema del celular (incluye el punto 4 de la 06). |
| 08 | Compartir y crecimiento | Mergeada | [#47](https://github.com/elevareluxury/menulife/pull/47) | `20261018000001_v1_referrals.sql` (aplicada) | Registro en `/register` (la app no tiene `/registro`). Probar QR y vista previa en WhatsApp con un perfil real. |
| 09 | Life OS: tareas que se repiten y subtareas | Mergeada | [#48](https://github.com/elevareluxury/menulife/pull/48) | `20261019000001_v1_task_recurrence.sql` (aplicada) | `life_tasks` confirmada sin uso (sólo export/borrado de datos). |
| 10 | Life OS: hábitos | Mergeada | [#49](https://github.com/elevareluxury/menulife/pull/49) | `20261020000001_v1_habits.sql` (aplicada; crea las tablas de hábitos que faltaban en producción) | Arreglado después de la etapa 15: Metas, Insights y Replay miden "X veces por semana" por semana y la cantidad contra la meta (`habitConsistency`). |
| 11 | Life OS: Mi día | Mergeada | [#50](https://github.com/elevareluxury/menulife/pull/50) | `20261021000001_v1_daily_review.sql` (aplicada) | "Mi día" reemplaza a "Tu día" en `/life` (mismas tarjetas debajo; la de metas muestra la meta en foco). |
| 12 | Life OS: tono y diseño | Mergeada | [#51](https://github.com/elevareluxury/menulife/pull/51) | — | Sin SQL: la bienvenida y "nuevos comienzos" se recuerdan en el dispositivo. "Bienvenido de vuelta" quedó "Qué bueno verte de vuelta" (sin género). |
| 13 | Marca: landing, emails, íconos | Mergeada | [#52](https://github.com/elevareluxury/menulife/pull/52) | — | Lighthouse celular: accesibilidad 100, rendimiento 74 (main daba 42; llegar a 85 pide pre-render → V1.1). Mails: falta probar un envío real en Gmail y Apple Mail. La bienvenida es el mail de confirmar cuenta. |
| 14 | Métricas propias | Mergeada | [#53](https://github.com/elevareluxury/menulife/pull/53) | `20261022000001_v1_product_events.sql` (aplicada) | Panel en `/super-admin/producto` (el de `/super-admin/metricas` es de Business). 100.000 eventos: el panel responde en ~0,2 s. |
| 15 | Tests de la V1 | Mergeada | [#54](https://github.com/elevareluxury/menulife/pull/54) | — | 185 E2E (login por tipo de cuenta, axe del onboarding, 26 capturas de referencia). 3 corridas seguidas sin tests inestables. |
| — | Después de la 15: mails, landing, constancia de hábitos y "Agregar a inicio" | Mergeada / PR abierto | [#55](https://github.com/elevareluxury/menulife/pull/55), [#56](https://github.com/elevareluxury/menulife/pull/56) | — | Asuntos de mail ≤ 255 caracteres; sin la tarjeta del hero; selector de idioma legible; botón "Agregar a inicio" en Mi día y Studio (pedido del usuario, fuera del ROADMAP original). |
| 16 | Pruebas manuales (usuario) | — | — | — | No la ejecuta Claude. |
| 17 | Freeze | — | — | — | Pide confirmación antes de crear `release/v1`. |
