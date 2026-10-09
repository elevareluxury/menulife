# Piloto automático — Mycen V1

Vas a construir la V1 completa de Mycen ejecutando las etapas de `docs/v1/prompts/`
en orden, de forma autónoma. El usuario no es técnico: solo te va a ayudar a aplicar SQL
en Supabase. Todo lo demás lo resolvés vos.

## Ahorro de contexto: una etapa por sesión

Cada sesión de Claude Code ejecuta **una sola etapa**. Al terminarla, frenás y le pedís
al usuario que limpie la conversación. Así cada etapa arranca con contexto limpio y se
gastan muchos menos tokens.

Al empezar cada sesión, leé solamente:
- `docs/v1/PROGRESS.md` (para saber en qué etapa estás),
- el archivo de esa etapa,
- `docs/design/DESIGN_SYSTEM.md` (si la etapa toca interfaz; si no, solo las secciones que necesites),
- `docs/v1/ROADMAP.md` solo si tenés una duda de alcance.
No releas documentos que ya leíste en la misma sesión.

## Antes de empezar (solo la primera vez)

1. Verificá que `gh` (GitHub CLI) esté instalado y autenticado con `gh auth status`.
   Si no lo está, frená y explicale al usuario, en pasos simples, cómo instalarlo
   (`winget install --id GitHub.cli` en PowerShell y después `gh auth login`,
   eligiendo GitHub.com, HTTPS y "Login with a web browser"). Esperá a que confirme.
2. Si no existe, creá `docs/v1/PROGRESS.md` con una tabla de las etapas 00 a 15 y su
   estado (Pendiente, En curso, PR abierto, Mergeada), el número de PR y notas.
3. Si ya existe, retomá desde la primera etapa que no esté "Mergeada". Si una figura
   como "PR abierto", revisá con `gh pr view` si ya se mergeó y actualizá el estado.

## Orden de ejecución

00 → 01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09 → 10 → 11 → 12 → 13 → 14 → 15.
(La 16 es la prueba manual del usuario y la 17 el freeze: no las ejecutes; avisá cuando llegues.)

## Ciclo de cada etapa

1. `git checkout main && git pull`, y creá la rama que indica la etapa.
2. Leé el archivo de la etapa completo y hacé todo lo que pide.
3. Corré todas las verificaciones del CI (las de `CLAUDE.md`). Si algo falla, arreglalo.
   No sigas con un fallo.
4. **Si la etapa trae migraciones de base de datos:**
   - Frená y mostrale al usuario el SQL completo de cada migración, en un solo bloque
     para copiar, con este mensaje: "Pegá esto en Supabase → SQL Editor → Run, y
     escribime 'listo' (o pegame el error si aparece uno)."
   - Si responde con un error, corregí la migración y volvé a mostrarla.
   - No mergees hasta que el usuario confirme que la aplicó.
5. Commit, push y `gh pr create` con título y descripción en español (qué cambia para el
   usuario, migraciones, qué probar).
6. Esperá el CI con `gh pr checks --watch`. Si falla, leé el log
   (`gh run view --log-failed`), corregí en la misma rama, pusheá y esperá de nuevo.
   Si un test falla de forma intermitente, hacelo determinista: no lo desactives.
   Si después de 3 intentos sigue fallando, frená y explicale al usuario qué pasa.
7. Con el CI en verde: `gh pr merge --merge --delete-branch`.
8. Esperá a que el deploy de producción en Vercel termine bien
   (`gh api` sobre los deployments o el estado del commit en `main`). Si falla, arreglalo
   antes de seguir.
9. La actualización de `docs/v1/PROGRESS.md` (etapa como "Mergeada", número de PR,
   migraciones, notas) va **dentro del mismo PR**, como último commit antes del merge
   (paso 5). Así `main` siempre refleja el avance real.
10. **Frená** y escribile al usuario exactamente esto (completando los datos):

    > Etapa NN lista y publicada en mycen.id. [Una línea con qué cambió.]
    > Para seguir, escribí `/clear` y después: seguí con el piloto automático

    No empieces la siguiente etapa en la misma sesión.

## Cuándo frenar y hablar con el usuario

Solo en estos casos:
- Hay SQL para aplicar en Supabase.
- `gh` no está instalado o autenticado.
- Un fallo que no pudiste resolver en 3 intentos.
- Una decisión de producto que no está resuelta en el ROADMAP ni en el sistema de diseño
  (proponé la opción que recomendás y preguntá por sí o no).
- Al terminar cada etapa (paso 10).
- Al terminar el bloque Identity (08), el bloque Life OS (12) y la 15: sumá al mensaje del
  paso 10 un resumen corto de qué mirar en mycen.id desde el celular.

Cuando hables con el usuario: en español, sin jerga técnica, mensajes cortos.

## Si la sesión se corta

Al retomar con "seguí con el piloto automático", leé `docs/v1/PROGRESS.md` y continuá
desde donde quedó. Si había una rama a medio hacer, revisá su estado antes de seguir.

## Reglas que no cambian

- Nunca pushear directo a `main`: siempre rama + PR + CI en verde + merge.
- Nunca desactivar tests, bajar el presupuesto de peso ni saltear verificaciones para avanzar.
- Nunca borrar datos de producción ni columnas existentes.
- No agregar funcionalidades fuera del ROADMAP.
