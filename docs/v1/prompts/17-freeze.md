# Prompt 17 — Freeze de la V1

**Rama:** `release/v1` (se crea en este prompt)

## Objetivo

Congelar oficialmente la V1 como la base estable para la app de iOS y Android.

## Tareas

1. Desde `main` actualizada, verificá:
   - CI en verde en el último commit.
   - `src/lib/features.ts`: `lifeInsights`, `lifeReplay` y `businessInLife` en `false`.
   - Todas las migraciones del repo aplicadas en Supabase (listá cuáles y pedime confirmación).
2. Versión `1.0.0` en `package.json` y `CHANGELOG.md` con todo lo que trae la V1
   (en lenguaje de usuario, en español).
3. Creá la rama `release/v1` y la etiqueta `v1.0.0` sobre ese commit. Pusheá las dos.
4. Documentá en `docs/v1/RELEASE.md` el proceso de arreglos durante el freeze:
   - Solo errores críticos.
   - El arreglo se hace en una rama desde `release/v1`, con PR hacia `release/v1`.
   - Después se lleva el mismo arreglo a `main` (cherry-pick).
   - Cada arreglo sube la versión de parche (`1.0.1`, `1.0.2`…).
   - La app de Capacitor se construye siempre desde `release/v1`.
5. Resumí qué quedó afuera y va a la V1.1 (desde el ROADMAP).

## Entrega

Seguí el flujo de `CLAUDE.md`, salvo que acá sí se pushea la rama `release/v1` y la
etiqueta. Pedime confirmación antes de crearlas.
