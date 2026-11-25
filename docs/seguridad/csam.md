# Abuso sexual infantil (CSAM): qué hacer

Procedimiento del equipo de Mycen ante material de abuso sexual infantil (CSAM: fotos, videos, textos o links con
contenido sexual que involucre a menores). Vale para cualquier parte de Mycen: perfiles, proyectos, fotos, PDF,
mensajes o links. Se revisa una vez por año junto con el SGSI (`sgsi/06-operacion.md`).

> Regla de oro: **no descargar, copiar, reenviar ni mostrar el material a nadie**, ni siquiera "para tener la prueba".
> Poseerlo o compartirlo es un delito en casi todos los países, también para quien modera. La evidencia la guarda
> Mycen en su lugar (retención legal) y la pide la autoridad.

## 1. Bloquear (en el momento)

1. Panel del equipo → **Denuncias** → en la denuncia, **"Abuso sexual infantil"** y confirmar.
   - Si no hay denuncia (lo vio alguien del equipo, llegó por mail o por una autoridad): **Personas** → buscar la cuenta
     → suspender el principal, y avisar al responsable técnico para hacer la retención desde el SQL Editor:
     `select admin_csam_action('<id del perfil>', null);` (con una sesión de super-admin) o, desde el SQL Editor,
     insertar la fila en `mycen_legal_holds` (`reason = 'csam'`).
2. Eso, en un solo paso (`admin_csam_action`):
   - suspende el principal (deja de verse toda la identidad, sus Spaces, proyectos y vCard) y el Space denunciado;
   - cierra las denuncias abiertas de la cuenta;
   - pone la cuenta en **retención legal** (`mycen_legal_holds`): nadie puede borrar la cuenta ni sus fotos y PDF
     (tampoco el equipo ni la persona), y queda en la bitácora (`csam_hold`). La cuenta tampoco puede subir ni cambiar
     archivos (igual que cualquier cuenta suspendida).
   - **El mismo día:** Personas → la cuenta → **"Pasar archivos a evidencia privada"**. Las fotos y los PDF salen de
     sus links públicos y quedan en el bucket privado `mycen-evidence` (Edge Function `quarantine-held-files`; sólo
     super-admins con verificación en dos pasos los ven; nadie los borra desde la app). Si dice "Seguir pasando
     archivos", tocarlo hasta que desaparezca. Queda en la bitácora (`evidence_quarantined`).
3. El motivo que ve la persona en Studio es genérico ("Incumplimiento grave de las reglas de contenido"). **No le
   avisamos** de la denuncia a la autoridad.
4. Si el material está en un link externo (no en Mycen), igual se suspende el perfil y se informa el link en la denuncia.

## 2. Denunciar a la autoridad (el mismo día)

- **NCMEC CyberTipline** (Estados Unidos, recibe denuncias de todo el mundo y las deriva al país que corresponde):
  https://report.cybertip.org — o la línea nacional de la red **INHOPE** del país de la persona (https://www.inhope.org).
- **Argentina:** la **UFECI** (Unidad Fiscal Especializada en Ciberdelincuencia) del Ministerio Público Fiscal
  (https://www.mpf.gob.ar). Confirmar el canal vigente en su sitio antes de mandar la denuncia.
- Qué poner: el link del perfil o del proyecto (`mycen.id/...`), la fecha y la hora en que se vio, el id de la cuenta
  (lo da Personas) y qué se hizo (suspensión y retención). **No adjuntar el material**: la autoridad lo pide con una
  orden y Mycen lo entrega desde la retención.
- Anotar en un registro interno (fuera del repo, con acceso restringido) el número de denuncia que da cada organismo,
  la fecha y quién la hizo.

## 3. Conservar la evidencia

- La retención dura hasta que la autoridad diga que ya no hace falta (en EE. UU. se pide al menos 1 año).
- Mientras dure no se usa "Borrar sus fotos y PDF" (el panel no lo muestra) y la cuenta no se puede eliminar.
- La evidencia vive en `mycen-evidence/<bucket>/<id de la cuenta>/…`. Para entregarla a una autoridad: descargarla
  desde Supabase → Storage con la cuenta del equipo, sólo lo que pide la orden, y anotarlo.
- La copia diaria de archivos en Cloudflare R2 (`docs/lanzamiento/copia-archivos.md`) también guarda esos archivos:
  no tocarla.
- Si una autoridad pide los datos: entregar sólo lo que pide la orden, por el canal que indique, y anotarlo.

## 4. Cerrar

- Cuando la autoridad lo confirme: Personas → la cuenta → **"Levantar la retención"** (queda en la bitácora,
  `legal_hold_released`). Recién ahí se pueden borrar los archivos y la cuenta (la evidencia de `mycen-evidence` se
  borra a mano desde Supabase → Storage, cuando la autoridad lo confirme, y se anota).
- La cuenta queda suspendida: no se levanta la suspensión.

## 5. Cuidar al equipo

Ver este material afecta. Quien lo revisó puede dejar la tarea en cualquier momento y pedir que otra persona siga.
No hace falta mirar el material más de lo necesario para decidir que es CSAM.
