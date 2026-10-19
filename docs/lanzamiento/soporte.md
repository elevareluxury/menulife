# Soporte — respuestas preparadas

Para quien atiende **team@mycen.id** durante el lanzamiento. Cada caso tiene: qué revisar antes de contestar, la
respuesta en español y en inglés (lista para copiar), y cuándo escalar.

Los nombres de pantallas y botones son los de la app (`src/i18n/app/*/es.ts` y `en.ts`, `profileI18n.ts`). Si cambian
en el código, actualizar acá. La ayuda pública (`/soporte`) y la página de baja (`/eliminar-cuenta`) dicen lo mismo:
se puede mandar el link en vez de repetir los pasos.

## Reglas generales

- **Identidad antes que nada.** Nunca cambiar, borrar ni mandar datos de una cuenta si el pedido no llega desde el
  email de esa cuenta. Si llega de otro mail: pedir que escriban desde el de la cuenta. No confirmar si un email tiene
  cuenta o no ("si existe una cuenta con ese email…").
- **No pedir contraseñas** ni códigos. Nunca.
- Siempre pedir: usuario de Mycen (mycen.id/usuario) o email de la cuenta, celular o computadora, app o web, y una
  captura si se puede.
- Tono: cercano, corto, de "vos" en español; en inglés, simple y amable. Firmar "El equipo de Mycen" / "The Mycen team".
- Herramientas del equipo: panel `/super-admin` (Personas, Denuncias, Verificaciones, Errores), Supabase
  (Authentication → Users, Logs) y Resend (Emails / Logs).
- **Plazos**: contestar en menos de 24 h hábiles; denuncias de riesgo para alguien ("Urgente"), en el día.

## Cuándo escalar (resumen)

| Situación | A quién | Plazo |
|---|---|---|
| Varias personas con el mismo problema en poco tiempo (mails que no llegan, no pueden entrar, avisos caídos) | Responsable técnico → abrir `incidentes.md` | Inmediato |
| Riesgo para una persona (amenazas, acoso, datos personales expuestos, menores) | Responsable de moderación | En el día, aunque sea fin de semana |
| Pedido legal (abogado, policía, juzgado, autoridad de datos) | Dueño de Mycen. No contestar el fondo sin revisarlo | Acuse en 24 h |
| Baja de una cuenta con negocio en Business | Dueño de Mycen | 5 días hábiles |
| Sospecha de que alguien entró a una cuenta ajena o de fuga de datos | Responsable técnico → `incidentes.md` | Inmediato |

---

## 1. No me llegó el mail de confirmación

**Antes de contestar**
1. Supabase → Authentication → Users → buscar el email. Si no aparece, la cuenta no se creó (pedir que se registre de
   nuevo). Si aparece sin confirmar, seguir.
2. Resend → Emails: buscar el destinatario. Ver si figura *Delivered*, *Bounced* o *Complained*. Si rebotó, el email
   está mal escrito o la casilla no existe.
3. Si hay muchos casos a la vez: Resend caído, dominio con problemas o límite de envío de Supabase
   (Authentication → Rate Limits). Escalar.

**Español**
> ¡Hola! Gracias por escribirnos. El mail de confirmación sale desde team@mycen.id y a veces cae en Spam o en
> Promociones: buscalo con la palabra "Mycen". Si no está, volvé a registrarte en mycen.id/register con el **mismo
> email** (tocá "Crear mi cuenta gratis") y te lo mandamos de nuevo. El link vence, así que usá siempre el último que te
> llegue.
>
> Si querés, también podés entrar con "Continuar con Google" usando ese mismo email: así no hace falta confirmar.
>
> Si en un rato sigue sin llegar, contestanos este mail y lo revisamos.
>
> El equipo de Mycen

**English**
> Hi! Thanks for reaching out. The confirmation email comes from team@mycen.id and sometimes lands in Spam or
> Promotions — try searching for "Mycen". If it isn't there, sign up again at mycen.id/register with the **same email**
> (tap "Create my free account") and we'll send it again. Links expire, so always use the most recent one.
>
> You can also use "Continue with Google" with that same email address — no confirmation needed.
>
> If it still hasn't arrived in a little while, just reply to this email and we'll look into it.
>
> The Mycen team

**Escalar si**: Resend muestra rebotes para dominios grandes (gmail, outlook) o hay más de 3 casos en una hora.

## 2. Olvidé la contraseña

**Antes de contestar**: si dice que el mail de recuperación tampoco llega, revisar Resend como en el caso 1. Si entró
siempre con Google, no tiene contraseña: tiene que usar "Continuar con Google".

**Español**
> ¡Hola! Para crear una contraseña nueva:
> 1. Entrá a mycen.id/login (o abrí la app).
> 2. Tocá "¿Olvidaste tu contraseña?".
> 3. Escribí tu email y tocá "Enviar link".
> 4. Abrí el mail que te llega, elegí la contraseña nueva (mínimo 8 caracteres) y tocá "Guardar contraseña nueva".
>
> El link vence en 1 hora. Si no llega, revisá Spam o tocá "Reenviar email". Si siempre entraste con Google, no tenés
> contraseña: usá "Continuar con Google".
>
> El equipo de Mycen

**English**
> Hi! To set a new password:
> 1. Go to mycen.id/login (or open the app).
> 2. Tap "Forgot your password?".
> 3. Enter your email and tap "Send link".
> 4. Open the email, choose your new password (at least 8 characters) and tap "Save new password".
>
> The link expires in 1 hour. If it doesn't arrive, check Spam or tap "Resend email". If you always signed in with
> Google, you don't have a password — just use "Continue with Google".
>
> The Mycen team

**Escalar si**: dice que alguien le cambió la contraseña o el email sin que lo pidiera (posible cuenta tomada →
`incidentes.md`).

## 3. Quiero borrar mi cuenta

**Antes de contestar**: en `/super-admin/personas` buscar el email. Si la cuenta tiene un negocio en Business, la app no
la deja borrar ("Tu cuenta tiene un negocio en Mycen Business…") y la baja se hace a mano (escalar).

**Español**
> ¡Hola! Lamentamos que te vayas. Podés borrar tu cuenta vos mismo, en el momento:
> - En **Studio → Ajustes → "Eliminar mi cuenta"**, o
> - En **Life OS → Ajustes → Cuenta → "Eliminar mi cuenta"**.
>
> Para confirmar te pedimos que escribas **ELIMINAR**. Se borran tu cuenta, tu perfil, tus Spaces, módulos, proyectos,
> imágenes, mensajes, suscriptores y todo Life OS, y no se puede deshacer. Si querés quedarte con una copia, antes
> tocá "Descargar mis datos" en Studio → Ajustes.
>
> Si no podés entrar, contestanos **desde el email de la cuenta** con el asunto "Eliminar mi cuenta" y la borramos
> nosotros dentro de los 5 días hábiles. Más detalle en mycen.id/eliminar-cuenta.
>
> El equipo de Mycen

**English**
> Hi! We're sorry to see you go. You can delete your account yourself, right away:
> - In **Studio → Settings → "Delete my account"**, or
> - In **Life OS → Settings → Account → "Delete my account"**.
>
> To confirm, you'll be asked to type **DELETE**. Your account, profile, Spaces, modules, projects, images, messages,
> subscribers and all of Life OS are deleted, and this can't be undone. If you want a copy, tap "Download my data" in
> Studio → Settings first.
>
> If you can't log in, reply **from your account email** with the subject "Delete my account" and we'll delete it for
> you within 5 business days. More details at mycen.id/eliminar-cuenta.
>
> The Mycen team

**Si la borramos nosotros** (no puede entrar, pedido desde el email de la cuenta, sin negocio en Business):
1. Storage → bucket `profile-media` → borrar la carpeta con el id de la cuenta (las imágenes no caen en cascada).
2. Authentication → Users → la cuenta → *Delete user* (perfiles, módulos y Life OS caen en cascada, igual que
   `delete_my_account`).
3. Contestar confirmando que se borró. Anotar fecha y pedido en el registro del equipo.

**Escalar si**: tiene negocio en Business, o el pedido no viene del email de la cuenta y no hay forma de verificarlo.

## 4. Alguien usa mi nombre o se hace pasar por mí

**Antes de contestar**
1. Abrir el perfil denunciado. Ver si es una suplantación real (usa nombre, fotos o marca de la persona para engañar)
   o sólo alguien con el mismo nombre (eso no es suplantación).
2. Pedir algo que muestre que es la persona o marca: un link a su red social con su nombre, o escribir desde un mail
   de su dominio.
3. Si corresponde: `/super-admin/personas` → la cuenta → suspender con motivo "Se hace pasar por otra persona o marca".
   La página, los proyectos y la tarjeta de contacto dejan de verse y el dueño ve el motivo en Studio.

**Español**
> ¡Hola! Gracias por avisarnos, lo tomamos en serio. Para revisarlo necesitamos:
> 1. El link del perfil (mycen.id/…).
> 2. Algo que muestre que sos vos o que la marca es tuya: por ejemplo, el link a tu Instagram o LinkedIn con tu
>    nombre, o escribirnos desde el mail de tu empresa.
>
> También podés denunciarlo directo: en el perfil tocá **"Denunciar"** (abajo de todo) y elegí "Se hace pasar por
> otra persona o marca". Es anónimo: el dueño no sabe quién denunció.
>
> Si el perfil no cumple nuestras reglas, lo suspendemos. Y si querés que la gente sepa cuál es el tuyo, podés pedir
> el tilde de verificación en **Studio → Ajustes → "Verificación" → "Pedir verificación"**.
>
> El equipo de Mycen

**English**
> Hi! Thanks for letting us know — we take this seriously. To review it we need:
> 1. The profile link (mycen.id/…).
> 2. Something that shows it's you or that the brand is yours: for example, a link to your Instagram or LinkedIn with
>    your name, or an email from your company's domain.
>
> You can also report it directly: on the profile, tap **"Report"** (at the bottom) and choose "Impersonates someone
> else or a brand". It's anonymous — the owner won't know who reported.
>
> If the profile breaks our rules, we'll suspend it. And if you want people to know which profile is really yours,
> you can request the verified badge in **Studio → Settings → "Verification" → "Request verification"**.
>
> The Mycen team

**Si es una marca conocida** que quiere su username: sumarlo a `reserved_usernames` y a `src/lib/reservedUsernames.ts`
(mantener sincronizados) para que nadie más lo tome. Si ya lo tiene otra cuenta de buena fe, escalar.

**Escalar si**: hay estafa en curso (pide plata o datos en nombre de otro), hay menores, o lo pide un abogado.

## 5. Quiero denunciar un perfil o un mensaje

**Dónde llega**: `/super-admin/denuncias` (perfiles y proyectos denunciados con "Denunciar"; mensajes reportados desde
Studio → Mensajes). Cada acción queda en Actividad del equipo.

**Español**
> ¡Hola! Gracias por avisarnos.
>
> **Un perfil o un proyecto:** abrilo, tocá **"Denunciar"** (al pie de la página), elegí el motivo, sumá detalles si
> querés y tocá **"Enviar denuncia"**. No hace falta tener cuenta y es anónimo.
>
> **Un mensaje que te llegó:** en **Studio → Mensajes**, abrí el mensaje y tocá **"Reportar"** → elegí el motivo →
> **"Reportar y bloquear"**. Nos llega una copia y la persona queda bloqueada: no te va a poder escribir más. Si sólo
> querés dejar de recibir sus mensajes, tocá **"Bloquear"** (no le avisamos).
>
> Si es urgente o alguien está en riesgo, contestá este mail con el asunto "Urgente" y el link, y lo vemos en el día.
>
> El equipo de Mycen

**English**
> Hi! Thanks for letting us know.
>
> **A profile or project:** open it, tap **"Report"** (at the bottom of the page), choose a reason, add details if you
> like and tap **"Send report"**. You don't need an account and it's anonymous.
>
> **A message you received:** in **Studio → Messages**, open the message and tap **"Report"** → choose a reason →
> **"Report and block"**. We get a copy and the sender is blocked — they can't write to you again. If you just want to
> stop their messages, tap **"Block"** (we don't tell them).
>
> If it's urgent or someone is at risk, reply with the subject "Urgent" and the link, and we'll look at it the same day.
>
> The Mycen team

**Escalar si**: amenazas, contenido sexual con menores (no descargar ni reenviar: anotar el link y escalar ya),
violencia o datos personales de terceros publicados.

## 6. No me llegan los recordatorios

**Cómo funciona hoy** (para diagnosticar):
- **App de las tiendas (iPhone/Android)**: los avisos se programan en el teléfono. Necesitan el permiso de
  notificaciones de Mycen en los ajustes del teléfono.
- **Web instalada en el inicio** (Android, computadora, iPhone desde iOS 16.4 con "Agregar a inicio"): con Web Push
  configurado (`docs/lanzamiento/web-push.md`) llegan con la app cerrada; si no, sólo con Life OS abierto.
- **Navegador común**: sólo con Life OS abierto.
- Una tarea **sin hora** avisa sobre las 09:00 de ese día. La hora se calcula con la zona horaria de Life OS → Ajustes.

**Antes de contestar**: si hay varios casos con la web instalada, revisar Supabase → Edge Functions → `life-reminders`
→ Logs (cada minuto: `reminders`, `sent`, `removed`, `failed`) y que el cron siga programado
(`select * from cron.job where jobname = 'life-reminders';`).

**Español**
> ¡Hola! Revisemos estas cosas:
> 1. **La tarea o el hábito tiene recordatorio.** Al editar la tarea, en "Recordatorio" elegí algo distinto de "Sin
>    recordatorio" (en el momento, 10 o 30 minutos antes…). Sin hora, avisa a las 09:00 de ese día.
> 2. **Permitiste los avisos.** En Brain → Tareas, si aparece "Activá los avisos…", tocá **"Activar"** y aceptá. Si
>    alguna vez dijiste que no, habilitalos para Mycen en los ajustes del teléfono o del navegador.
> 3. **Zona horaria.** En Life OS → Ajustes → "Zona horaria", fijate que sea la tuya (o tocá "Usar la del celular").
> 4. **Dónde usás Mycen.** En la app de iPhone o Android avisan siempre. En la web, para que avisen con la app
>    cerrada, instalala en el inicio (en iPhone: Compartir → "Agregar a inicio") y abrila desde ese ícono. En una
>    pestaña común del navegador sólo avisan con Life OS abierto.
> 5. **No molestar o ahorro de batería** del teléfono pueden frenarlos.
>
> También podés ver tus tareas en el calendario del celular: Life OS → Ajustes → **"Tus tareas en tu calendario"**.
>
> Si nada de esto lo arregla, contanos qué teléfono usás, si es la app o la web y la hora de una tarea que no avisó.
>
> El equipo de Mycen

**English**
> Hi! Let's check a few things:
> 1. **The task or habit has a reminder.** When editing the task, set "Reminder" to anything other than "No reminder"
>    (at the time, 10 or 30 minutes before…). Tasks without a time remind you at 09:00 that day.
> 2. **Notifications are allowed.** In Brain → Tasks, if you see "Turn on notifications…", tap **"Turn on"** and
>    accept. If you said no before, allow them for Mycen in your phone or browser settings.
> 3. **Time zone.** In Life OS → Settings → "Time zone", make sure it's yours (or use your phone's).
> 4. **Where you use Mycen.** The iPhone and Android apps always remind you. On the web, to get reminders with the app
>    closed, add it to your home screen (on iPhone: Share → "Add to Home Screen") and open it from that icon. In a
>    regular browser tab, reminders only work while Life OS is open.
> 5. **Do Not Disturb or battery saver** on your phone can block them.
>
> You can also see your tasks in your phone's calendar: Life OS → Settings → **"Your tasks in your calendar"**.
>
> If none of this helps, tell us which phone you use, whether it's the app or the web, and the time of a task that
> didn't remind you.
>
> The Mycen team

**Escalar si**: los logs de `life-reminders` muestran muchos `failed`, 401 (secreto del cron mal) o no hay llamadas
(cron parado) → `incidentes.md`.

## 7. Quiero exportar mis datos

**Español**
> ¡Hola! Tus datos son tuyos y los podés bajar cuando quieras:
> - **Todo junto:** Studio → Ajustes → Privacidad → **"Descargar mis datos"** → "Descargar". Es un archivo JSON con tu
>   perfil, tus Spaces, módulos, proyectos y Life OS.
> - **Sólo Life OS:** Life OS → Ajustes → **"Tus datos"** → "Descargar todo (JSON)", o "Movimientos de dinero (CSV)"
>   para abrir Dinero en Excel.
> - **Tus suscriptores:** Studio → Suscriptores → **"Exportar CSV"**.
>
> Si algo no se descarga, probá desde una computadora y contanos qué pasó.
>
> El equipo de Mycen

**English**
> Hi! Your data is yours and you can download it any time:
> - **Everything:** Studio → Settings → Privacy → **"Download my data"** → "Download". It's a JSON file with your
>   profile, Spaces, modules, projects and Life OS.
> - **Life OS only:** Life OS → Settings → **"Your data"** → "Download everything (JSON)", or "Money transactions
>   (CSV)" to open Money in Excel.
> - **Your subscribers:** Studio → Subscribers → **"Export CSV"**.
>
> If something doesn't download, try from a computer and let us know what happened.
>
> The Mycen team

**Escalar si**: lo pide como derecho de acceso formal (Ley 25.326 / GDPR) y quiere algo que no está en el archivo
(por ejemplo, registros internos). Plazo legal: 10 días corridos en Argentina y 1 mes en la UE.

## 8. Pregunta por Business

Mycen Business (menú digital, pedidos, turnos, POS) está **oculto** hasta nuevo aviso (`get_site_flags().business =
false`). No prometer fechas.

**Español**
> ¡Hola! Gracias por el interés. Las herramientas de gestión para negocios (menú digital, pedidos, turnos) todavía
> no están disponibles: llegan más adelante con Mycen Business.
>
> Mientras tanto, tu negocio ya puede tener su Mycen gratis: al crear tu perfil elegí la estructura para negocios y
> sumá WhatsApp, ubicación, horarios, productos y formulario de contacto. Si querés, te avisamos cuando abra Business:
> contestá este mail con "Avisame".
>
> El equipo de Mycen

**English**
> Hi! Thanks for your interest. Management tools for businesses (digital menu, orders, bookings) aren't available yet —
> they're coming later with Mycen Business.
>
> In the meantime, your business can already have its own Mycen for free: when you create your profile, choose the
> business layout and add WhatsApp, location, opening hours, products and a contact form. If you'd like, we'll let you
> know when Business opens — just reply "Notify me".
>
> The Mycen team

**Escalar si**: es un cliente que ya usaba Business (tiene un restaurante vinculado) y algo dejó de funcionarle.
Anotar los "Avisame" en una lista para el lanzamiento de Business.
