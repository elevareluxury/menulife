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
| 08 | Compartir y crecimiento | En curso | — | `20261018000001_v1_referrals.sql` (pendiente) | Registro en `/register` (la app no tiene `/registro`). Probar QR y vista previa en WhatsApp con un perfil real. |
| 09 | Life OS: tareas | Pendiente | — | — | |
| 10 | Life OS: hábitos | Pendiente | — | — | |
| 11 | Life OS: Mi día | Pendiente | — | — | |
| 12 | Life OS: tono y diseño | Pendiente | — | — | |
| 13 | Marca: landing, emails, íconos | Pendiente | — | — | |
| 14 | Métricas propias | Pendiente | — | — | |
| 15 | Tests de la V1 | Pendiente | — | — | |
| 16 | Pruebas manuales (usuario) | — | — | — | No la ejecuta Claude. |
| 17 | Freeze | — | — | — | Pide confirmación antes de crear `release/v1`. |
