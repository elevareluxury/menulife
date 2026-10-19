# Capturas de las tiendas

Genera las capturas de las fichas de App Store y Google Play: un título corto arriba y la pantalla real de la app abajo.
La app corre con Vite y el Supabase simulado de los E2E (`tests/e2e/support/mockSupabase.ts`), con los datos de una
persona inventada (Lucía Ferrer, `data.ts`). No hay datos reales.

## Qué genera

`design/store-shots/{tamaño}/{idioma}/{n}-{pantalla}-{tema}.png`: 60 PNG sin transparencia.

| | |
|---|---|
| Pantallas | 1 identidad (perfil público) · 2 día (Mi día) · 3 hábitos · 4 metas (una meta con pasos, tareas y hábitos) · 5 idiomas (Ajustes) |
| Temas | `universo` (oscuro) y `amanecer` (claro) |
| Idiomas | `es` y `en` |
| Tamaños | `ios-6.9` 1320×2868 · `ios-6.5` 1284×2778 · `android` 1080×1920 (9:16, teléfono de Google Play) |

## Cómo volver a generarlas

```bash
npx playwright test --config scripts/store-shots/playwright.config.ts
```

Tarda unos 2 minutos. Levanta su propio Vite en el puerto 5182 y sirve la app como `mycen.id`, así el perfil muestra la
dirección real. Para generar sólo una parte, `STORE_SHOTS` filtra por idioma, tema o tamaño (todas las partes tienen que
coincidir; separadas por coma):

```bash
STORE_SHOTS=es,android npx playwright test --config scripts/store-shots/playwright.config.ts
```

## Dónde cambiar cada cosa

- Títulos y bajadas: `COPY` en `shots.spec.ts`.
- Datos de ejemplo (perfil, tareas, hábitos, metas): `data.ts`.
- Tamaños, márgenes y tipografía del marco: `SIZES` y `compose()` en `shots.spec.ts`.
- Para sumar un idioma: agregarlo a `LANGS` y completar `COPY` y los textos de `data.ts`.

Las fechas salen del día en que se corre (la fecha de "Mi día", los vencimientos). No corre en CI.
