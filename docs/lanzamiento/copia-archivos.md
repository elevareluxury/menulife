# Copia diaria de archivos (fotos y PDF)

Las copias de la base de Supabase (incluido PITR) **no incluyen el almacenamiento**: las fotos de los perfiles
(`profile-media`) y los PDF de Descargables (`profile-files`). Si se borran por error, no vuelven. Por eso hay una copia
diaria a Cloudflare R2 (`.github/workflows/storage-backup.yml`, todos los días a las 05:41 UTC).

## Cómo funciona
- `current/<carpeta>`: espejo de lo que hay hoy en Mycen.
- `old/<fecha>/<carpeta>`: lo que se borró o cambió ese día. Se borra solo a los **30 días** (así un archivo que alguien
  borró, o el de una cuenta borrada, no queda guardado para siempre; está en la política de retención).
- Si faltan los secretos, el proceso no falla: avisa y termina.

## Lo que hace el dueño (una sola vez)
Las claves se pegan **directo en cada panel**: nunca por chat ni en el repo.

1. **Cloudflare → R2 → Create bucket**: nombre `mycen-backup` (ubicación automática). Sin acceso público.
2. **R2 → Manage R2 API tokens → Create API token**: permiso *Object Read & Write*, sólo para `mycen-backup`. Anotar el
   *Access Key ID*, el *Secret Access Key* y el endpoint (`https://<cuenta>.r2.cloudflarestorage.com`).
3. **Supabase → Storage → Settings → S3 Connection**: copiar el *Endpoint* y la *Region*; en *Access keys* → *New
   access key*, anotar el *Access key ID* y el *Secret access key*.
4. **GitHub → el repo → Settings → Secrets and variables → Actions → New repository secret**, uno por uno:

| Nombre | Valor |
|---|---|
| `SUPABASE_S3_ENDPOINT` | Endpoint de Supabase (paso 3) |
| `SUPABASE_S3_REGION` | Region de Supabase (paso 3) |
| `SUPABASE_S3_ACCESS_KEY_ID` | Access key ID de Supabase |
| `SUPABASE_S3_SECRET_ACCESS_KEY` | Secret access key de Supabase |
| `R2_ENDPOINT` | Endpoint de R2 (paso 2) |
| `R2_ACCESS_KEY_ID` | Access Key ID de R2 |
| `R2_SECRET_ACCESS_KEY` | Secret Access Key de R2 |
| `R2_BUCKET` | `mycen-backup` |

5. **GitHub → Actions → "Copia diaria de archivos" → Run workflow**: la primera copia. Tiene que terminar en verde y en
   R2 tienen que aparecer `current/profile-media` y `current/profile-files`.

## Restaurar
Con rclone y las mismas claves: `rclone copy r2:mycen-backup/current/profile-media supa:profile-media` (todo) o la
carpeta de una cuenta (`…/profile-media/<id de la cuenta>`). Un archivo borrado hace menos de 30 días está en
`old/<fecha>/…`. Probar una restauración al menos una vez y anotarla en `docs/seguridad/sgsi/06-operacion.md`.
