# Límite de pedidos en `/api` (Vercel Firewall)

Auditoría de seguridad del 18/10/2026. Las funciones de `api/` son públicas y sin sesión; varias salen a internet
(`media-cover`, `youtube-latest`), arman imágenes (`og/[slug]`) o consultan la base (`og`, `sitemap`, `calendar`). La CDN
cachea las respuestas, pero cambiando la consulta (`?url=…`, `?handle=…`) cada pedido llega a la función.

**Por qué en el Firewall y no en el código:** la regla corre antes de la función (lo bloqueado no se cobra ni gasta CPU),
cuenta igual para la CDN y para la función, y el contador es del Firewall, no de cada instancia (un límite en memoria
dentro de la función se reparte entre instancias y regiones y casi no frena nada). No hace falta otra base (Redis).

## Las reglas

Por IP, ventana fija de 60 s. Los números son 5–10× lo que usa una persona y tienen margen para redes móviles que
comparten una IP entre muchas personas (CGNAT) y para los bots de WhatsApp/Facebook, que piden desde pocas IPs y en
ráfagas cuando un link se comparte en grupos.

| # | Nombre | Condición | Límite | Al pasarse |
|---|--------|-----------|--------|------------|
| 1 | `API portadas` | Target path empieza con `/api/media-cover` | 30 / 60 s | 429 |
| 2 | `API vista previa` | Target path empieza con `/api/og` | 600 / 60 s | 429 |
| 3 | `API general` | Target path empieza con `/api/` **y** no empieza con `/api/og` **y** no empieza con `/api/media-cover` | 300 / 60 s | 429 |

- **Target path** (la ruta después de las reescrituras de `vercel.json`): así entran `/cal/<token>.ics` (→ `/api/calendar`),
  `/sitemap.xml` (→ `/api/sitemap`) y la vista previa que piden los bots en `/{username}` (→ `/api/og`). Las personas
  que abren `/{username}` van a `index.html` y no cuentan.
- `media-cover` sólo la usa Studio al pegar un video o una canción: 30 por minuto es mucho para una persona.
- La app de iOS/Android (`capacitor://localhost`) pide `/api/youtube-latest` y `/api/media-cover` desde la IP del
  celular, igual que la web: entra en los mismos límites. Con un 429, el módulo "Último video" no se muestra (igual que
  cuando YouTube no responde) y Studio no pone la portada sola (se puede subir a mano).
- Los contadores son **por región**: con tráfico repartido en varias regiones, el total puede pasar el límite.

## Pasos (panel)

1. Vercel → proyecto → **Firewall** → **Configure** → **New Rule**.
2. Regla 1: nombre `API portadas`; *If* `Target Path` · `Starts with` · `/api/media-cover`; *Then* **Rate Limit**:
   *Fixed Window*, `60` segundos, `30` pedidos, clave `IP`; al pasarse **Log** (primero sólo registrar). Guardar.
3. Regla 2: igual, nombre `API vista previa`, `Target Path` · `Starts with` · `/api/og`, `600` pedidos, **Log**.
4. Regla 3: nombre `API general`, condiciones (todas con *AND*): `Target Path` · `Starts with` · `/api/`;
   `Target Path` · `Does not start with` · `/api/og`; `Target Path` · `Does not start with` · `/api/media-cover`;
   `300` pedidos, **Log**.
5. **Review Changes** → **Publish**.
6. Dejarlas 2–3 días en Log y mirar **Firewall → Traffic** filtrando por cada regla: no tiene que aparecer tráfico normal
   (los bots de WhatsApp/Facebook — `facebookexternalhit`, `WhatsApp` — en `API vista previa` no deberían acercarse a 600).
7. Si está bien, editar cada regla: al pasarse → **Too Many Requests (429)** → Publish. Las primeras 24 h mirar
   Traffic; para volver atrás, la regla vuelve a **Log** o se desactiva.

Si el plan no deja tres reglas de límite, usar sólo la 3 sin las dos exclusiones (todo `/api/` a 300/60 s).

## Pasos (CLI, con el proyecto vinculado: `vercel link`)

```bash
vercel firewall rules add "API portadas" \
  --condition '{"type":"target_path","op":"pre","value":"/api/media-cover"}' \
  --action rate_limit --rate-limit-window 60 --rate-limit-requests 30 --rate-limit-keys ip \
  --rate-limit-action log --yes

vercel firewall rules add "API vista previa" \
  --condition '{"type":"target_path","op":"pre","value":"/api/og"}' \
  --action rate_limit --rate-limit-window 60 --rate-limit-requests 600 --rate-limit-keys ip \
  --rate-limit-action log --yes

vercel firewall rules add "API general" \
  --condition '{"type":"target_path","op":"pre","value":"/api/"}' \
  --condition '{"type":"target_path","op":"pre","value":"/api/og","neg":true}' \
  --condition '{"type":"target_path","op":"pre","value":"/api/media-cover","neg":true}' \
  --action rate_limit --rate-limit-window 60 --rate-limit-requests 300 --rate-limit-keys ip \
  --rate-limit-action log --yes

vercel firewall diff          # revisar
vercel firewall publish --yes # publicar
```

Después de revisar el tráfico, pasar cada una a 429 desde el panel (paso 7) y publicar.
