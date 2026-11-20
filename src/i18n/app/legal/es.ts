// Términos y privacidad (Lanzamiento L4). El español es la versión de referencia; las traducciones tienen las mismas
// secciones (tsc lo exige). Texto preparado sin revisión de un abogado: revisarlo antes de abrir al público y cuando haya
// razón social inscripta (docs/lanzamiento/00-plan.md, sección 4).
// Formato de cada bloque: texto (admite **negrita**) o { list: [...] }.

export type LegalBlock = string | { list: string[] }
export interface LegalSection { id: string; title: string; body: LegalBlock[] }

const UPDATED = '2026-11-20'

const es = {
  ui: {
    termsTitle: 'Términos y condiciones',
    privacyTitle: 'Política de privacidad',
    termsIntro: 'Al crear una cuenta o usar Mycen aceptás estas condiciones. Están escritas para que se entiendan.',
    privacyIntro: 'Qué datos usamos, para qué, con quién los compartimos y qué control tenés.',
    updated: 'Última actualización',
    contents: 'Contenido',
    reference: 'La versión en español es la de referencia. Las traducciones son para tu comodidad; si hay diferencias, vale el texto en español.',
    seeOther: { terms: 'Política de privacidad', privacy: 'Términos y condiciones' },
    language: 'Idioma',
    back: 'Volver a Mycen',
    supportTitle: 'Ayuda y soporte',
    supportIntro: 'Cómo escribirnos y respuestas a lo que más se pregunta.',
    deletionTitle: 'Eliminar tu cuenta de Mycen',
    deletionIntro: 'Cómo eliminar tu cuenta y tus datos de Mycen (app y web), qué se borra y qué puede quedar.',
  },
  updated: UPDATED,
  // Ayuda (/soporte) y cómo eliminar la cuenta (/eliminar-cuenta, el link que piden Google Play y la App Store)
  support: [
    { id: 'contacto', title: 'Escribinos', body: [
      'Para cualquier consulta, problema o pedido escribinos a **team@mycen.id**. Contanos tu usuario de Mycen (o el email de tu cuenta) y, si podés, mandá una captura. Respondemos lo antes posible.',
    ] },
    { id: 'acceso', title: 'Entrar a tu cuenta', body: [
      { list: [
        '**Olvidé mi contraseña:** en la pantalla de acceso tocá “¿Olvidaste tu contraseña?” y seguí el link que te llega por email.',
        '**No me llegó el mail de confirmación:** revisá spam y promociones. Si no está, registrate de nuevo con el mismo email y te lo mandamos otra vez.',
        '**Entré con Google:** usá siempre el mismo botón; no hace falta contraseña.',
      ] },
    ] },
    { id: 'datos', title: 'Tus datos', body: [
      { list: [
        '**Descargarlos:** Studio → Ajustes → “Descargar mis datos” (tu perfil, módulos y Life OS en un archivo). En Life OS → Ajustes → “Tus datos” también podés bajar Dinero en CSV.',
        '**Eliminar tu cuenta:** desde Studio → Ajustes o Life OS → Ajustes → Cuenta. Todos los pasos, y qué se borra, en **mycen.id/eliminar-cuenta**.',
      ] },
    ] },
    { id: 'seguridad', title: 'Denunciar o bloquear', body: [
      { list: [
        '**Un perfil:** en cualquier perfil público tocá “Denunciar”. Lo revisa el equipo de Mycen y el dueño no sabe quién denunció.',
        '**Un mensaje:** en Studio → Mensajes, “Reportar” manda el mensaje al equipo y bloquea a quien lo escribió; “Bloquear” sólo deja de recibir sus mensajes.',
      ] },
      'Si algo es urgente o pone en riesgo a alguien, escribinos a **team@mycen.id** con el asunto “Urgente”.',
    ] },
  ] as LegalSection[],
  deletion: [
    { id: 'app', title: 'Desde la app o la web', body: [
      'Entrá a tu cuenta y elegí una de estas opciones:',
      { list: [
        '**Life OS → Ajustes → Cuenta → “Eliminar mi cuenta”**',
        '**Studio → Ajustes → “Eliminar mi cuenta”**',
      ] },
      'Para confirmar escribí la palabra que te pedimos. La cuenta se borra en el momento.',
    ] },
    { id: 'sin-acceso', title: 'Si no podés entrar', body: [
      'Escribinos a **team@mycen.id** desde el email de tu cuenta, con el asunto “Eliminar mi cuenta”. La borramos dentro de los plazos de la ley (en Argentina, 5 días hábiles) y te avisamos cuando esté hecho.',
    ] },
    { id: 'que-se-borra', title: 'Qué se borra', body: [
      { list: [
        'Tu cuenta y tu email de acceso.',
        'Tu identidad: perfiles, Spaces, módulos, proyectos, imágenes, versiones publicadas, estadísticas, mensajes y suscriptores.',
        'Todo Life OS: tareas, hábitos, metas, Mi día, revisiones, Dinero y diario.',
      ] },
    ] },
    { id: 'que-queda', title: 'Qué puede quedar', body: [
      { list: [
        'Las copias de seguridad de los proveedores, que se sobrescriben en sus ciclos habituales, y la copia diaria de fotos y PDF, que guarda lo borrado 30 días.',
        'Los registros de errores, que no están vinculados a tu cuenta.',
        'Lo que la ley obligue a conservar (por ejemplo, datos de facturación), por el plazo que fije.',
        'Si tu cuenta tenía un perfil suspendido, su nombre de usuario queda reservado para que nadie lo vuelva a usar, y el registro de esa suspensión se guarda 3 años.',
        'Si tu cuenta tiene un negocio en Mycen Business, escribinos: lo damos de baja con vos para cuidar los datos de tus clientes y ventas.',
      ] },
    ] },
  ] as LegalSection[],
  terms: [
    // RESPONSABLE: Luca Cazzoli (monotributo, CUIT 20-42325961-3), nombre de fantasía Resilio. Si se arma una sociedad, cambiar acá en los 12.
    { id: 'quien', title: 'Quién presta el servicio', body: [
      'Mycen es un servicio operado por **Luca Cazzoli** (CUIT 20-42325961-3), bajo el nombre de fantasía **Resilio**, con domicilio en la República Argentina. Podés escribirnos a **team@mycen.id**.',
      'Mycen te permite crear una identidad digital pública (Mycen Identity), administrarla desde Mycen Studio, organizar tu vida personal en Life OS y, si tenés un negocio, gestionarlo con Mycen Business.',
    ] },
    { id: 'edad', title: 'Quién puede usar Mycen', body: [
      'Para usar Mycen tenés que tener al menos **13 años**. Si vivís en un país de la Unión Europea o del Espacio Económico Europeo que exige **16 años** para usar un servicio como este sin el consentimiento de tu madre, padre o tutor, tenés que tener al menos 16. Y si la ley de tu país fija una edad mínima mayor, vale esa.',
      'Al crear una cuenta confirmás que tenés la edad necesaria. Si sabemos que una cuenta es de alguien que no la tiene, la eliminamos.',
      'Para usar Mycen Business en nombre de un negocio tenés que ser mayor de edad y tener autorización para representarlo.',
    ] },
    { id: 'cuenta', title: 'Tu cuenta', body: [
      'Sos responsable de mantener segura tu contraseña y de lo que pase en tu cuenta. Los datos que cargues tienen que ser verdaderos y tienen que ser tuyos, o tenés que tener permiso para usarlos.',
      'Si notás un uso que no autorizaste, cambiá tu contraseña y escribinos.',
    ] },
    { id: 'contenido', title: 'Tu contenido', body: [
      'Lo que publicás sigue siendo tuyo. Nos das un permiso gratuito y mundial para guardarlo, mostrarlo en tu dirección pública y adaptarlo técnicamente (por ejemplo, achicar imágenes) mientras lo tengas publicado. Podés editarlo, ocultarlo, despublicarlo o eliminarlo cuando quieras.',
      'Lo que publiques tiene que cumplir las reglas de contenido. Podemos ocultar o suspender lo que no las cumpla.',
    ] },
    { id: 'reglas', title: 'Reglas de contenido', body: [
      'En Mycen no se permite publicar:',
      { list: [
        '**Spam o publicidad engañosa:** promesas falsas, links que no llevan a donde dicen o reseñas inventadas.',
        '**Estafas o fraude:** pedir dinero o datos con engaños, vender lo que no existe.',
        '**Suplantación:** hacerse pasar por otra persona, empresa o marca.',
        '**Odio o acoso:** atacar a personas o grupos por lo que son, o acosar a alguien.',
        '**Violencia o amenazas:** amenazar, incitar a la violencia o mostrarla de forma gratuita.',
        '**Contenido sexual explícito**, y cualquier contenido sexual que involucre a menores (se denuncia a las autoridades).',
        '**Algo ilegal:** productos o servicios prohibidos, o contenido que infrinja derechos de otros (marcas, fotos, textos).',
        '**Links maliciosos:** virus, phishing o sitios que engañan.',
      ] },
      'Cualquier persona puede denunciar un perfil o un proyecto con el link "Denunciar" al pie de la página, sin cuenta y de forma anónima. Revisamos cada denuncia. Si un perfil no cumple las reglas, lo suspendemos: deja de verse (página, proyectos y tarjeta de contacto) y su dueño ve el motivo en Studio. Si creés que fue un error, escribinos desde la cuenta con la que lo creaste y lo revisamos de nuevo.',
      'Mientras un perfil está suspendido, su cuenta no puede crear perfiles nuevos ni borrarlo para empezar de cero. Si se elimina la cuenta, ese nombre de usuario queda reservado y no se puede volver a usar.',
    ] },
    { id: 'derechos-de-autor', title: 'Derechos de autor y otros derechos', body: [
      'Si creés que algo publicado en Mycen infringe tus derechos de autor u otros derechos (por ejemplo, tu marca o tu imagen), podés pedirnos que lo bajemos. Escribinos a **team@mycen.id** con:',
      { list: [
        '**El link al contenido:** la dirección exacta en Mycen del perfil, proyecto o imagen.',
        '**Quién es el titular** del derecho y cómo contactarlo. Si actuás en nombre de otra persona o empresa, decilo.',
        '**Por qué infringe:** qué obra, marca u otro derecho es y cómo se está usando sin permiso.',
        '**Una declaración de buena fe:** que creés de buena fe que ese uso no está autorizado y que la información que nos das es correcta.',
      ] },
      'Revisamos cada pedido. Si corresponde, bajamos o bloqueamos el contenido y le avisamos a quien lo publicó, con el motivo. Esa persona puede respondernos con su versión (por ejemplo, si tiene permiso para usarlo) y lo revisamos de nuevo.',
      'Las cuentas que publican una y otra vez contenido que infringe derechos de otros pueden ser suspendidas o cerradas.',
    ] },
    { id: 'usernames', title: 'Nombres de usuario', body: [
      'Algunos nombres están reservados. No se permite registrar nombres para hacerse pasar por otra persona o marca, ni para revenderlos; podemos recuperarlos en esos casos. Si cambiás tu username, la dirección anterior redirige a la nueva para que tus links y QR sigan funcionando.',
      'No se pueden elegir nombres que imiten bancos, billeteras, servicios o marcas conocidas (por ejemplo, con la palabra “banco” o el nombre de una marca): Mycen los rechaza al elegirlos. Si tu cuenta está verificada y cambiás tu nombre o tu nombre de usuario, el tilde de verificada vuelve a revisión.',
    ] },
    { id: 'pagos', title: 'Planes pagos de Mycen Business', body: [
      'Tu identidad, Studio y Life OS son gratis. Los planes de Mycen Business tienen el precio que se muestra al contratarlos, en dólares estadounidenses (US$), más los impuestos que correspondan en tu país.',
      'No hay permanencia mínima: podés cancelar cuando quieras y el plan sigue activo hasta el final del período pagado. Si cambiamos un precio, te avisamos antes y el cambio rige desde el período siguiente. Si sos consumidor, conservás los derechos que te da la ley de tu país, como el de arrepentirte de una compra a distancia.',
    ] },
    { id: 'servicio', title: 'El servicio', body: [
      'Trabajamos para que Mycen funcione siempre y bien, pero puede haber interrupciones, errores o cambios. Las funciones pueden cambiar, mejorar o dejar de estar disponibles; si algo importante cambia, te avisamos con anticipación cuando sea posible.',
      'En la medida que permita la ley, Mycen se ofrece "tal como está", y no respondemos por daños indirectos ni por la pérdida de ganancias que se deriven del uso del servicio. Nada de esto limita los derechos que la ley de tu país no permite limitar, como los derechos de quienes usan el servicio como consumidores.',
    ] },
    { id: 'baja', title: 'Baja y suspensión', body: [
      'Podés eliminar tu cuenta cuando quieras desde Studio → Ajustes, y descargar antes una copia de tus datos. Las cuentas con un negocio activo en Mycen Business se dan de baja por soporte, porque involucran datos de clientes y ventas.',
      'Podemos suspender o cerrar cuentas que incumplan estas condiciones o la ley, o que pongan en riesgo a otras personas o al servicio. Cuando sea posible, te avisamos y te explicamos el motivo.',
    ] },
    { id: 'cambios', title: 'Cambios en estas condiciones', body: [
      'Si cambiamos estas condiciones de forma importante, te avisamos por email o dentro de Mycen antes de que entren en vigencia. Si no estás de acuerdo, podés dejar de usar el servicio y eliminar tu cuenta.',
    ] },
    { id: 'ley', title: 'Ley aplicable', body: [
      'Estas condiciones se rigen por las leyes de la República Argentina. Si usás Mycen como consumidor desde otro país, también te protegen las normas de tu país que no se pueden dejar de lado por contrato, y podés reclamar ante los tribunales de tu domicilio.',
      'Antes de cualquier reclamo, escribinos a **team@mycen.id**: casi todo se resuelve hablando.',
    ] },
  ] as LegalSection[],
  privacy: [
    // RESPONSABLE: Luca Cazzoli (monotributo, CUIT 20-42325961-3), nombre de fantasía Resilio. Si se arma una sociedad, cambiar acá en los 12.
    { id: 'responsable', title: 'Quién es responsable de tus datos', body: [
      'El responsable del tratamiento es **Luca Cazzoli** (CUIT 20-42325961-3), que opera Mycen bajo el nombre de fantasía **Resilio**, con domicilio en la República Argentina. Para cualquier consulta sobre tus datos escribinos a **team@mycen.id**.',
      'Cuando un negocio usa Mycen Business para gestionar datos de sus propios clientes (pedidos, reservas, turnos), ese negocio es el responsable de esos datos y Mycen los trata por su cuenta y siguiendo sus instrucciones.',
    ] },
    { id: 'datos', title: 'Qué datos usamos', body: [
      { list: [
        '**Tu cuenta:** nombre, email, contraseña (guardada cifrada, nunca la vemos), idioma, moneda, zona horaria y la fecha en que aceptaste estas condiciones. Si activás la verificación en dos pasos, también la clave de tu app de autenticación (la guarda Supabase, cifrada).',
        '**Nombres reservados y huella o cara:** si el equipo de Mycen reservó tu nombre de usuario a pedido tuyo o de tu agencia, guardamos tu nombre, tu email y una nota mientras dure la reserva, sólo para que nadie más lo use. Si entrás con la huella o la cara, eso nunca sale de tu dispositivo: Mycen (con Supabase) guarda sólo una clave pública.',
        '**Tu perfil público:** lo que cargás en Studio (nombre, foto, textos, links, proyectos, tarjeta de contacto). Sólo se publica lo que decidís mostrar. Cada foto se vuelve a generar en tu dispositivo antes de subirla, así que se borran los datos ocultos que trae (como la ubicación GPS o el modelo de la cámara).',
        '**Life OS:** tus metas, hábitos, tareas, finanzas y notas, incluidos los nombres que escribas (por ejemplo, con quién compartiste un gasto). Son privados: sólo vos podés verlos. Tu diario también: el bloqueo con PIN, huella o cara funciona sólo en tu dispositivo (no viaja a Mycen) y las entradas no tienen cifrado de extremo a extremo.',
        '**Cómo te sentiste:** si al cerrar el día tocás una de las caritas, guardamos ese dato (del 1 al 5) y la fecha. Puede decir algo de tu salud: por eso es opcional, sólo lo ves vos y lo usamos sólo para mostrarte tus propios patrones (por ejemplo, en Insights y en “Tu mes”). Tocar la carita es tu consentimiento, y lo retirás tocándola de nuevo (se borra) o borrando Life OS.',
        '**Mycen Business:** los datos de tu negocio y los que cargues sobre tus clientes y ventas.',
        '**Estadísticas de visitas:** eventos seudonimizados (visitas y toques en tu perfil): en lugar de saber quién es cada visitante, usamos un identificador que cambia todos los días y no se puede revertir. No guardamos direcciones IP ni datos del dispositivo, y no contamos robots. También guardamos de qué sitio o link llegó la visita (por ejemplo, Instagram o el QR).',
        '**Denuncias:** el motivo y el detalle que escribe quien denuncia, con un identificador seudonimizado que cambia todos los días, para evitar abusos. Si quien denuncia tiene la sesión iniciada, guardamos también su cuenta: la ve sólo el equipo de Mycen, nunca la persona denunciada.',
        '**Mensajes del formulario de contacto:** el nombre, el contacto (email o WhatsApp) y el mensaje que deja un visitante. Si el perfil tiene el módulo Colaboraciones, una marca deja además su empresa y qué busca, y si quiere su sitio web, un presupuesto y una fecha límite. Los ve sólo la persona dueña del perfil, en Studio; no se publican ni se mandan por email. Para evitar abusos usamos un identificador seudonimizado que cambia todos los días, sin IP ni datos del dispositivo. Si la persona dueña reporta un mensaje, guardamos una copia para que la revise el equipo de Mycen. Si bloquea a un contacto (o lo reporta), guardamos ese email o teléfono en su perfil para descartar lo que vuelva a mandar.',
        '**Suscripciones:** si te suscribís desde el módulo “Suscribirse” de un perfil, guardamos tu email (y tu nombre, si el perfil lo pide), la fecha en que diste tu consentimiento y tu idioma, y se los damos a la persona dueña de ese perfil, que los ve en Studio y los puede exportar. Mycen no le manda nada a esa lista: la persona dueña del perfil decide cómo usarla y es responsable de hacerlo bien. Para salir, pedíselo a esa persona o escribinos a team@mycen.id y lo borramos. Para evitar abusos usamos un identificador seudonimizado que cambia todos los días, sin IP ni datos del dispositivo.',
        '**Encuestas:** si votás en la encuesta de un perfil, guardamos tu opción con un identificador seudonimizado que cambia todos los días (sin IP, sin cuenta y sin datos del dispositivo), para contar un voto por persona. La persona dueña ve sólo los totales. Tu navegador recuerda qué votaste, para mostrártelo.',
        '**Invitaciones:** si creás tu cuenta desde “Creá tu identidad” en el perfil de otra persona, guardamos qué perfil te trajo y su tipo, para saber cómo crece Mycen. Esa persona no ve tus datos.',
        '**Uso de la app:** para saber si Mycen funciona y cómo crece, guardamos eventos de uso (por ejemplo, que publicaste tu perfil, que abriste “Mi día” o que marcaste un hábito) con tu cuenta, la fecha y datos cortos como la estructura elegida o la cantidad de días. Además, una vez por día anotamos que usaste Mycen, desde qué tipo de dispositivo (navegador, app instalada, iPhone o Android), en qué idioma y la zona horaria del dispositivo (por ejemplo, “America/Argentina/Buenos_Aires”); nunca tu IP ni tu ubicación exacta. Nunca guardamos el contenido de tus tareas, hábitos, notas ni mensajes. No usamos servicios de analítica de terceros.',
        '**Verificación de cuenta:** si pedís el tilde de cuenta verificada, guardamos tu mensaje, el link que nos pases y la respuesta. Los ve sólo el equipo de Mycen para revisarlo; si se aprueba, tu perfil muestra el tilde.',
        '**Errores técnicos:** cuando algo falla, guardamos el mensaje de error, la pantalla, la versión de Mycen y el navegador (por ejemplo, "Chrome 128 · Android"), sin IP ni datos personales, para poder arreglarlo.',
        '**Avisos con la app cerrada (web):** si permitís los avisos de Life OS en el navegador, guardamos la dirección de envío que crea tu navegador, sus claves de cifrado, la zona horaria y el nombre del navegador (por ejemplo, “Chrome · Android”), para mandarte tus recordatorios. Se borra cuando desactivás los avisos, cuando el navegador da de baja la suscripción o al eliminar tu cuenta.',
        '**Protección contra abusos:** para frenar ataques, contamos cuántos pedidos llegan desde cada conexión a las funciones públicas (visitas, mensajes, votos, denuncias). No guardamos la dirección IP: la convertimos en un código que no se puede revertir (un hash con una clave secreta) y lo borramos a los 2 días.',
        '**Lo que hace el equipo de Mycen:** cuando el equipo suspende un perfil, resuelve una denuncia, verifica una cuenta o borra archivos, queda anotado quién lo hizo, cuándo y sobre qué cuenta, para poder rendir cuentas. Ese registro no se puede modificar y se guarda 3 años.',
      ] },
    ] },
    { id: 'para-que', title: 'Para qué los usamos y con qué base', body: [
      { list: [
        '**Prestarte el servicio** que pediste al crear tu cuenta: guardar, mostrar y sincronizar tu información (ejecución del contrato).',
        '**Guardar cómo te sentiste** (las caritas de Life OS), sólo si lo anotás: con tu consentimiento explícito, que retirás cuando quieras borrándolo.',
        '**Mandarte avisos con la app cerrada**, sólo si los permitís en tu navegador o en tu teléfono (consentimiento; lo retirás desactivándolos).',
        '**Mantener Mycen seguro y funcionando:** prevenir abusos, revisar denuncias y arreglar errores (interés legítimo).',
        '**Mostrarte estadísticas** de tu perfil, con datos seudonimizados (interés legítimo).',
        '**Mandarte mails necesarios** sobre tu cuenta: confirmación, recuperación de contraseña y cambios importantes.',
        '**Cumplir la ley** cuando una autoridad competente lo exija.',
      ] },
      'No vendemos tus datos, no los usamos para publicidad y no hay rastreadores de terceros en Mycen.',
    ] },
    { id: 'publico', title: 'Qué es público', body: [
      'Tu página pública muestra sólo lo que publicás. Los módulos ocultos, los borradores y los Spaces no publicados no se ven. Los perfiles públicos pueden aparecer en buscadores; si elegís la visibilidad "no listado" o "privado", no se incluyen en el mapa del sitio que leen los buscadores.',
    ] },
    { id: 'proveedores', title: 'Con quién los compartimos', body: [
      'Usamos proveedores que tratan datos sólo para prestar el servicio y bajo contrato:',
      { list: [
        '**Supabase:** base de datos, inicio de sesión y archivos.',
        '**Vercel:** alojamiento de la aplicación y entrega de las páginas.',
        '**Resend:** envío de los mails de tu cuenta.',
        '**Cloudflare (Turnstile):** la verificación anti-bots del registro, el inicio de sesión y la recuperación de contraseña. Al abrir esas pantallas, Cloudflare recibe datos técnicos de tu navegador (como la dirección IP) sólo para comprobar que no sos un bot.',
        '**Cloudflare R2:** guarda una copia de seguridad diaria de las fotos y los PDF que suben los perfiles, para poder recuperarlos si algo falla. Lo que se borra en Mycen queda en esa copia 30 días y después se elimina.',
        '**Google Web Risk:** revisamos con Google los links públicos de los perfiles y proyectos publicados, para encontrar estafas y virus. Se manda sólo el link; nada tuyo ni de quien visita. Si un link es peligroso, lo revisa el equipo de Mycen.',
        '**YouTube, Vimeo, TikTok, Spotify y SoundCloud:** sólo si un perfil integra un video o una canción y tocás "Reproducir". Antes de eso no nos conectamos con ellos; desde ese momento se aplican sus propias políticas. Si un perfil muestra su "Último video", el servidor de Mycen consulta el listado público de videos del canal de YouTube que eligió su dueño, sin enviar ningún dato tuyo. Cuando el dueño de un perfil pega uno de esos links en Studio, el servidor de Mycen trae la portada pública de ese video o esa canción y la guarda como una foto más de su perfil: así la página la muestra sin conectarte con el proveedor. Si un perfil muestra un podcast, el servidor de Mycen lee el feed RSS público que eligió su dueño, sin enviar ningún dato tuyo; al tocar "Escuchar", tu navegador se conecta con el servicio que aloja ese podcast y se aplican sus políticas. Si un perfil tiene varias sucursales y tocás "Ver la más cerca", tu navegador te pide permiso para usar tu ubicación: se usa sólo en tu dispositivo para ordenar la lista y no se manda a Mycen ni a nadie.',
        '**Anthropic:** sólo si un negocio usa la importación de su menú desde un PDF; se procesa ese archivo.',
        '**Mercado Pago:** sólo si un negocio lo configura para cobrar; el pago se hace en Mercado Pago.',
        '**Google (inicio de sesión):** sólo si elegís "Continuar con Google". Google nos confirma tu nombre, tu email y tu foto; no recibimos tu contraseña de Google ni accedemos a nada más de tu cuenta.',
        '**Apple (inicio de sesión):** sólo si elegís "Continuar con Apple". Apple nos confirma tu nombre y tu email (o un email de reenvío que Apple genera si preferís ocultar el tuyo); no recibimos tu contraseña ni accedemos a nada más de tu cuenta.',
        '**App de iOS y Android:** si la descargás, Apple (App Store) o Google (Google Play) registran la descarga según sus propias políticas. En la app, los recordatorios se programan en tu teléfono, sin un servicio de notificaciones de terceros.',
        '**Servicio de avisos de tu navegador:** sólo si permitís los avisos de Life OS en la web. El recordatorio (el nombre de la tarea o el hábito y su hora) viaja cifrado hasta tu dispositivo a través del servicio de avisos de tu navegador: Google (Firebase Cloud Messaging) en Chrome y Android, Microsoft en Edge, Apple en Safari y Mozilla en Firefox. Ese servicio ve la dirección de envío, pero no puede leer el contenido.',
        '**Google Calendar, Apple u otro calendario:** sólo si activás el link de calendario de Life OS; ese servicio descarga tus tareas pendientes con fecha (título, fecha, hora y aviso). Lo podés apagar o cambiar cuando quieras.',
        '**Reconocimiento de voz de tu navegador:** sólo si usás "Dictar" en Life OS. Tu navegador convierte la voz en texto (en Chrome lo hace el servicio de voz de Google; en Safari, Apple). Mycen recibe sólo el texto.',
      ] },
      'Fuera de eso, sólo compartimos datos si la ley nos obliga o para proteger los derechos y la seguridad de las personas.',
    ] },
    { id: 'transferencias', title: 'Datos fuera de tu país', body: [
      'Nuestros proveedores pueden guardar o procesar datos en servidores de otros países, como Estados Unidos o países de la Unión Europea. Cuando eso pasa, usamos las garantías que prevé la ley, como cláusulas contractuales aprobadas por las autoridades de protección de datos, para que tus datos tengan un nivel de protección adecuado.',
    ] },
    { id: 'plazos', title: 'Cuánto tiempo los guardamos', body: [
      { list: [
        'Los datos de tu cuenta, tu perfil y Life OS, mientras tengas la cuenta. Si la eliminás, los borramos, también tus fotos y PDF; las copias de seguridad de los proveedores se sobrescriben en sus ciclos habituales y la copia diaria de fotos y PDF guarda lo borrado 30 días.',
        'Las estadísticas de visitas se guardan seudonimizadas (con el identificador que cambia cada día) 13 meses —Studio muestra hasta 90 días— y los votos de las encuestas, mientras exista el perfil. Si se borra el perfil, se borran con él.',
        'Los mensajes del formulario de contacto, hasta que la persona dueña del perfil los borra o elimina su cuenta.',
        'Los emails de suscripción, hasta que la persona dueña del perfil los borra, elimina su cuenta o nos pedís que los borremos.',
        'Los registros de errores se guardan mientras sirvan para arreglarlos (uno resuelto queda guardado por si vuelve a pasar); el conteo de personas afectadas, 90 días.',
        'Los eventos de uso de la app y el registro de los días que usaste Mycen, 25 meses (después se borran solos); si antes eliminás tu cuenta, quedan sin ningún vínculo con vos.',
        'Los avisos del navegador, hasta que los desactives o elimines tu cuenta; el código de conexión para frenar abusos, 2 días; los contactos bloqueados, hasta que la persona dueña los desbloquee o elimine su perfil; y el registro de lo que hace el equipo de Mycen, 3 años.',
        'Lo que la ley obligue a conservar (por ejemplo, datos de facturación), por el plazo que fije.',
      ] },
    ] },
    { id: 'dispositivo', title: 'Lo que se guarda en tu dispositivo', body: [
      'Mycen no usa cookies de publicidad ni de seguimiento. En tu navegador guardamos sólo lo necesario para que funcione: tu sesión, tu idioma y algunos borradores y preferencias. Podés borrarlo desde la configuración del navegador (vas a tener que iniciar sesión de nuevo). Si cargás algo en Life OS sin conexión, queda en tu dispositivo hasta que se sube (sólo con tu sesión). Del PIN del diario guardamos sólo una huella cifrada (hash), nunca el PIN.',
    ] },
    { id: 'seguridad', title: 'Seguridad', body: [
      'Usamos conexiones cifradas, contraseñas guardadas con cifrado y permisos en la base de datos para que cada persona vea sólo lo suyo. Ningún sistema es perfecto: si pasara algo que afecte tus datos, te avisamos y actuamos según lo que indique la ley.',
    ] },
    { id: 'derechos', title: 'Tus derechos', body: [
      'Podés pedir acceder a tus datos, corregirlos, borrarlos, llevártelos (portabilidad), oponerte o limitar ciertos usos, y retirar un consentimiento que hayas dado. Muchas cosas las hacés directo desde Studio → Ajustes (descargar tus datos, eliminar tu cuenta) o desde Life OS → Ajustes → Tus datos. Para lo demás, escribinos a **team@mycen.id** desde el email de tu cuenta.',
      'Respondemos dentro de los plazos de la ley (en Argentina, 10 días corridos para el acceso y 5 días hábiles para corregir o borrar). También podés reclamar ante la autoridad de protección de datos: en Argentina, la **Agencia de Acceso a la Información Pública (AAIP)**; en la Unión Europea, la autoridad de tu país; en Brasil, la **ANPD**.',
      'Si vivís en California: no vendemos ni compartimos tus datos personales para publicidad, y no te vamos a tratar distinto por ejercer tus derechos.',
    ] },
    { id: 'menores', title: 'Menores', body: [
      'Mycen no está dirigido a menores de 13 años, ni a menores de 16 en los países de la Unión Europea o del Espacio Económico Europeo que exigen esa edad para tratar sus datos sin el consentimiento de los padres (ni a quienes no tengan la edad mayor que fije la ley de su país). No recolectamos a sabiendas datos de personas menores de esa edad: si sabemos que una cuenta es de alguien que no la tiene, la eliminamos junto con sus datos. Si sos madre, padre o tutor y creés que pasó, escribinos a **team@mycen.id**.',
    ] },
    { id: 'cambios', title: 'Cambios en esta política', body: [
      'Si cambiamos esta política de forma importante, te avisamos por email o dentro de Mycen antes de que se aplique. Arriba vas a ver siempre la fecha de la última actualización.',
    ] },
  ] as LegalSection[],
}

export type LegalDict = typeof es
export default es
