# Mycen V1 — Paquete de implementación

Este paquete contiene todo lo necesario para que Claude Code construya la V1 de Mycen
(Identity + Life OS) con el nuevo diseño "Universo / Amanecer" y la huella Mycen.

## Qué hay adentro

| Archivo | Para qué sirve |
|---|---|
| `docs/design/DESIGN_SYSTEM.md` | Las reglas visuales de Mycen. Claude Code lo lee antes de cada tarea. |
| `docs/design/huella.ts` | El generador de la huella, listo para copiar al código. |
| `docs/v1/ROADMAP.md` | Qué entra en la V1, qué queda afuera, el orden y los tiempos. |
| `docs/v1/prompts/00…17` | Un prompt por etapa, en orden. |

## Modo piloto automático (recomendado)

Claude Code ejecuta todas las etapas solo y te pide únicamente que pegues SQL en Supabase.
Ver `docs/v1/prompts/PILOTO-AUTOMATICO.md`.

## Cómo usarlo etapa por etapa

1. Descomprimí este paquete en la raíz del repo `menulife` (la carpeta `docs/` se suma a la existente; no reemplaza nada).
2. Abrí Claude Code en el repo y pegale el contenido de `docs/v1/prompts/00-reglas-y-flujo.md`.
   Ese prompt sube estos documentos al repo y deja configuradas las reglas de trabajo.
3. Después, para cada etapa, pegale a Claude Code:

   > Leé y ejecutá docs/v1/prompts/NN-nombre.md

4. Cada etapa termina en una rama y un pull request. Antes de mergear:
   - el CI tiene que estar en verde,
   - probás el preview de Vercel en el celular,
   - mergeás con "Create a merge commit".
5. Si una etapa trae una migración de base de datos, aplicala en Supabase **antes** de mergear.

## Orden y paralelismo

Las etapas 00 a 02 van primero y en orden: son la base de todo lo demás.
Después hay dos caminos que pueden avanzar en paralelo en ramas distintas:

- **Identity:** 03 → 04 → 05 → 06 → 07 → 08
- **Life OS:** 09 → 10 → 11 → 12

Cuando los dos caminos terminan: 13 (marca), 14 (métricas), 15 (tests),
16 (pruebas manuales en dispositivos) y 17 (freeze).
