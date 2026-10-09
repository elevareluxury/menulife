# Mycen V1 — Avance del piloto automático

Estados: Pendiente · En curso · PR abierto · Mergeada. Una etapa por PR.
En Claude Code en la web todas las etapas usan la rama asignada a la sesión (un PR distinto por etapa).

| Etapa | Nombre | Estado | PR | Migraciones | Notas |
|---|---|---|---|---|---|
| 00 | Reglas y documentos | Mergeada | [#38](https://github.com/elevareluxury/menulife/pull/38) | — | Contradicción corregida en 16: el formulario no manda email. |
| 01 | Sistema de diseño base | Mergeada | [#39](https://github.com/elevareluxury/menulife/pull/39) | — | Tokens globales: +1 KB gzip por página (perfil 223, proyecto 214, landing 292). |
| 02 | Huella | Mergeada | [#40](https://github.com/elevareluxury/menulife/pull/40) | — | Sin cambios de peso (todavía no se usa en páginas públicas). |
| 03 | Perfil: estructuras, temas y perfil vivo | Mergeada | [#41](https://github.com/elevareluxury/menulife/pull/41) | `20261015000001_v1_profile_look.sql` (aplicada) | Perfiles claros → Amanecer (el prompt decía todo Universo). Studio → Apariencia vieja sigue hasta la 06. |
| 04 | Video y música | PR abierto | — | `20261016000001_v1_media_module.sql` (pendiente de aplicar) | Proveedores sumados a privacidad (12 idiomas). |
| 05 | Formulario y bandeja | Pendiente | — | — | |
| 06 | Apariencia con vista previa | Pendiente | — | — | |
| 07 | Onboarding, Spaces y Studio | Pendiente | — | — | |
| 08 | Compartir y crecimiento | Pendiente | — | — | El registro está en `/register` (no `/registro`). |
| 09 | Life OS: tareas | Pendiente | — | — | |
| 10 | Life OS: hábitos | Pendiente | — | — | |
| 11 | Life OS: Mi día | Pendiente | — | — | |
| 12 | Life OS: tono y diseño | Pendiente | — | — | |
| 13 | Marca: landing, emails, íconos | Pendiente | — | — | |
| 14 | Métricas propias | Pendiente | — | — | |
| 15 | Tests de la V1 | Pendiente | — | — | |
| 16 | Pruebas manuales (usuario) | — | — | — | No la ejecuta Claude. |
| 17 | Freeze | — | — | — | Pide confirmación antes de crear `release/v1`. |
