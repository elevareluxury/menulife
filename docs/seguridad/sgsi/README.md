# Sistema de gestión de seguridad y privacidad de Mycen (SGSI + PIMS)

Base para trabajar con **ISO/IEC 27001:2022** (seguridad de la información), **ISO/IEC 27701:2019** (privacidad, extensión
de la 27001) y **SOC 2** (Trust Services Criteria 2017, revisión 2022: seguridad, disponibilidad, confidencialidad,
privacidad). No es una certificación: es lo que un auditor pide ver primero (alcance, política, riesgos, controles con
evidencia, inventario, retención y operación) armado con lo que Mycen tiene de verdad hoy.

| Documento | Para qué | Norma |
|---|---|---|
| [01 · Alcance y política](01-alcance-politica.md) | Qué cubre, quién decide, reglas generales | 27001 cl. 4–5 · SOC 2 CC1, CC2 |
| [02 · Riesgos](02-riesgos.md) | Registro de riesgos, tratamiento y riesgos aceptados | 27001 cl. 6, 8 · SOC 2 CC3 |
| [03 · Controles](03-controles.md) | Anexo A, criterios SOC 2 y 27701: estado y evidencia | 27001 Declaración de Aplicabilidad · SOC 2 CC4–CC9 |
| [04 · Activos, proveedores y tratamientos](04-activos-proveedores.md) | Inventario, subencargados y registro de tratamientos | 27001 A.5.9, A.5.19–23 · 27701 7.2.8, 7.5 |
| [05 · Retención](05-retencion.md) | Cuánto se guarda cada dato y cómo se borra | 27701 7.4.7 · 27001 A.8.10 · SOC 2 P4.2 |
| [06 · Operación](06-operacion.md) | Accesos, cambios, vulnerabilidades, copias, monitoreo y calendario | 27001 A.5.15–18, A.8.8–16, A.8.32 · SOC 2 CC6–CC8, A1 |

Relacionados: [Plan ante incidentes](../../lanzamiento/incidentes.md) · [Auditorías anteriores](../) ·
[Política de privacidad](../../../src/i18n/app/legal/es.ts) (12 idiomas) · [security.txt](../../../public/.well-known/security.txt) ·
[SECURITY.md](../../../SECURITY.md).

**Cómo se mantiene:** cada cambio que toca datos personales, permisos, proveedores o retención actualiza el documento
que corresponde en el mismo PR. El calendario de [06 · Operación](06-operacion.md#calendario-de-controles) dice qué se
revisa cada mes, trimestre y año, y dónde queda la evidencia.
