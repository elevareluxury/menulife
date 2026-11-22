// Términos y privacidad (Lanzamiento L4; revisión mundial del 20/11/2026). El español es la versión de referencia; las
// traducciones tienen las mismas secciones (tsc y tests/unit/legal.test.ts lo exigen). Texto preparado sin revisión de un
// abogado: revisarlo con uno cuando se pueda y cuando haya razón social inscripta (docs/lanzamiento/legal-mundial.md).
// Formato de cada bloque: texto (admite **negrita**) o { list: [...] }.
// RESPONSABLE: Luca Cazzoli (monotributo, CUIT 20-42325961-3), nombre de fantasía Resilio. Si se arma una sociedad,
// cambiarlo en los 12 idiomas.

export type LegalBlock = string | { list: string[] }
export interface LegalSection { id: string; title: string; body: LegalBlock[] }

const UPDATED = "2026-11-22"

const es = {
  ui: {
    termsTitle: "Términos y condiciones",
    privacyTitle: "Política de privacidad",
    termsIntro: "Al crear una cuenta o usar Mycen aceptás estas condiciones. Están escritas para que se entiendan.",
    privacyIntro: "Qué datos usamos, para qué, con quién los compartimos y qué control tenés.",
    updated: "Última actualización",
    contents: "Contenido",
    reference: "La versión en español es la de referencia. Las traducciones son para tu comodidad; si hay diferencias, vale el texto en español, salvo que la ley de tu país diga otra cosa.",
    seeOther: { terms: "Política de privacidad", privacy: "Términos y condiciones" },
    language: "Idioma",
    back: "Volver a Mycen",
    supportTitle: "Ayuda y soporte",
    supportIntro: "Cómo escribirnos y respuestas a lo que más se pregunta.",
    deletionTitle: "Eliminar tu cuenta de Mycen",
    deletionIntro: "Cómo eliminar tu cuenta y tus datos de Mycen (app y web), qué se borra y qué puede quedar.",
  },
  updated: UPDATED,
  support: [
    { id: "contacto", title: "Escribinos", body: [
      "Para cualquier consulta, problema o pedido escribinos a **team@mycen.id**. Contanos tu usuario de Mycen (o el email de tu cuenta) y, si podés, mandá una captura. Respondemos lo antes posible.",
    ] },
    { id: "acceso", title: "Entrar a tu cuenta", body: [
      { list: [
        "**Olvidé mi contraseña:** en la pantalla de acceso tocá “¿Olvidaste tu contraseña?” y seguí el link que te llega por email.",
        "**No me llegó el mail de confirmación:** revisá spam y promociones. Si no está, registrate de nuevo con el mismo email y te lo mandamos otra vez.",
        "**Entré con Google:** usá siempre el mismo botón; no hace falta contraseña.",
      ] },
    ] },
    { id: "datos", title: "Tus datos", body: [
      { list: [
        "**Descargarlos:** Studio → Ajustes → “Descargar mis datos” (tu perfil, módulos y Life OS en un archivo). En Life OS → Ajustes → “Tus datos” también podés bajar Dinero en CSV.",
        "**Eliminar tu cuenta:** desde Studio → Ajustes o Life OS → Ajustes → Cuenta. Todos los pasos, y qué se borra, en **mycen.id/eliminar-cuenta**.",
      ] },
    ] },
    { id: "seguridad", title: "Denunciar o bloquear", body: [
      { list: [
        "**Un perfil:** en cualquier perfil público tocá “Denunciar”. Lo revisa el equipo de Mycen y el dueño no sabe quién denunció.",
        "**Un mensaje:** en Studio → Mensajes, “Reportar” manda el mensaje al equipo y bloquea a quien lo escribió; “Bloquear” sólo deja de recibir sus mensajes.",
      ] },
      "Si algo es urgente o pone en riesgo a alguien, escribinos a **team@mycen.id** con el asunto “Urgente”.",
    ] },
  ] as LegalSection[],
  deletion: [
    { id: "app", title: "Desde la app o la web", body: [
      "Entrá a tu cuenta y elegí una de estas opciones:",
      { list: [
        "**Life OS → Ajustes → Cuenta → “Eliminar mi cuenta”**",
        "**Studio → Ajustes → “Eliminar mi cuenta”**",
      ] },
      "Para confirmar escribí la palabra que te pedimos. La cuenta se borra en el momento.",
    ] },
    { id: "sin-acceso", title: "Si no podés entrar", body: [
      "Escribinos a **team@mycen.id** desde el email de tu cuenta, con el asunto “Eliminar mi cuenta”. La borramos dentro de los plazos de la ley (en Argentina, 5 días hábiles) y te avisamos cuando esté hecho.",
    ] },
    { id: "que-se-borra", title: "Qué se borra", body: [
      { list: [
        "Tu cuenta y tu email de acceso.",
        "Tu identidad: perfiles, Spaces, módulos, proyectos, imágenes, versiones publicadas, estadísticas, mensajes y suscriptores.",
        "Todo Life OS: tareas, hábitos, metas, Mi día, revisiones, Dinero y diario.",
      ] },
    ] },
    { id: "que-queda", title: "Qué puede quedar", body: [
      { list: [
        "Las copias de seguridad de los proveedores, que se sobrescriben en sus ciclos habituales, y la copia diaria de fotos y PDF, que guarda lo borrado 30 días.",
        "Los registros de errores, que no están vinculados a tu cuenta.",
        "Lo que la ley obligue a conservar (por ejemplo, datos de facturación), por el plazo que fije.",
        "Si tu cuenta tenía un perfil suspendido, su nombre de usuario queda reservado para que nadie lo vuelva a usar, y el registro de esa suspensión se guarda 3 años.",
        "Si tu cuenta tiene un negocio en Mycen Business, escribinos: lo damos de baja con vos para cuidar los datos de tus clientes y ventas.",
      ] },
    ] },
  ] as LegalSection[],
  terms: [
    { id: "quien", title: "Quién presta el servicio", body: [
      "Mycen es un servicio operado por **Luca Cazzoli** (CUIT 20-42325961-3), bajo el nombre de fantasía **Resilio**, con domicilio en la República Argentina. Podés escribirnos a **team@mycen.id**.",
      "Mycen te permite crear una identidad digital pública (Mycen Identity), administrarla desde Mycen Studio y organizar tu vida personal en Life OS. Mycen Business, para gestionar negocios, todavía no está abierto a nuevos negocios.",
      "**Punto de contacto:** para las personas usuarias y para las autoridades (también a efectos del Reglamento de Servicios Digitales de la Unión Europea), escribinos a **team@mycen.id**, en español o en inglés.",
    ] },
    { id: "edad", title: "Quién puede usar Mycen", body: [
      "Para usar Mycen tenés que tener al menos **13 años**, o la edad mayor que fije la ley de tu país para usar un servicio como este sin el consentimiento de tu madre, padre o tutor (por ejemplo, **14** en Corea del Sur y en China, y hasta **16** en algunos países de la Unión Europea).",
      "Al crear una cuenta confirmás que tenés la edad necesaria. Si sabemos que una cuenta es de alguien que no la tiene, la eliminamos.",
      "Para usar Mycen Business en nombre de un negocio tenés que ser mayor de edad y tener autorización para representarlo.",
    ] },
    { id: "cuenta", title: "Tu cuenta", body: [
      "Sos responsable de mantener segura tu contraseña y de lo que pase en tu cuenta. Los datos que cargues tienen que ser verdaderos y tienen que ser tuyos, o tenés que tener permiso para usarlos.",
      "Si notás un uso que no autorizaste, cambiá tu contraseña y escribinos.",
    ] },
    { id: "contenido", title: "Tu contenido", body: [
      "Lo que publicás sigue siendo tuyo. Nos das un permiso gratuito y mundial para guardarlo, mostrarlo en tu dirección pública y adaptarlo técnicamente (por ejemplo, achicar imágenes) mientras lo tengas publicado. Podés editarlo, ocultarlo, despublicarlo o eliminarlo cuando quieras.",
      "Lo que publiques tiene que cumplir las reglas de contenido. Podemos ocultar o suspender lo que no las cumpla.",
      "Si publicás contenido o datos de otras personas o marcas (por ejemplo, el contacto de tu agencia, una cita de prensa, un logo o los números de tu audiencia), tenés que tener derecho a hacerlo y lo que digas tiene que ser verdad. Si algo es publicidad pagada o un canje, aclaralo, como piden las leyes de publicidad de muchos países.",
    ] },
    { id: "reglas", title: "Reglas de contenido", body: [
      "En Mycen no se permite publicar:",
      { list: [
        "**Spam o publicidad engañosa:** promesas falsas, links que no llevan a donde dicen o reseñas inventadas.",
        "**Estafas o fraude:** pedir dinero o datos con engaños, vender lo que no existe.",
        "**Suplantación:** hacerse pasar por otra persona, empresa o marca.",
        "**Odio o acoso:** atacar a personas o grupos por lo que son, o acosar a alguien.",
        "**Violencia o amenazas:** amenazar, incitar a la violencia o mostrarla de forma gratuita.",
        "**Contenido sexual explícito**, y cualquier contenido sexual que involucre a menores (se denuncia a las autoridades).",
        "**Algo ilegal:** productos o servicios prohibidos, o contenido que infrinja derechos de otros (marcas, fotos, textos).",
        "**Links maliciosos:** virus, phishing o sitios que engañan.",
      ] },
      "Cualquier persona puede denunciar un perfil o un proyecto con el link \"Denunciar\" al pie de la página, sin cuenta y de forma anónima. Revisamos cada denuncia. Si un perfil no cumple las reglas, lo suspendemos: deja de verse (página, proyectos y tarjeta de contacto) y su dueño ve el motivo en Studio. Si creés que fue un error, escribinos desde la cuenta con la que lo creaste y lo revisamos de nuevo.",
      "Mientras un perfil está suspendido, su cuenta no puede crear perfiles nuevos ni borrarlo para empezar de cero. Si se elimina la cuenta, ese nombre de usuario queda reservado y no se puede volver a usar.",
      "**Cómo moderamos:** combinamos herramientas automáticas y personas. Por ejemplo, revisamos los links publicados con Google Web Risk y ponemos límites automáticos contra el abuso, pero ningún perfil se suspende sólo por una herramienta automática: una persona del equipo revisa cada caso. Cuando ocultamos o suspendemos algo te decimos qué, por qué y qué regla incumple, y podés pedir que lo revisemos de nuevo. Si vivís en la Unión Europea, también podés acudir a un órgano certificado de resolución extrajudicial de litigios o a los tribunales. Si un contenido muestra un peligro para la vida o la seguridad de alguien, o abuso sexual infantil, avisamos a las autoridades.",
    ] },
    { id: "uso", title: "Uso correcto del servicio", body: [
      "Además de las reglas de contenido, no está permitido:",
      { list: [
        "**Automatizar** la creación de cuentas, las visitas, los votos o los mensajes, ni usar bots para inflar números.",
        "**Copiar en masa** los perfiles o los datos de otras personas (scraping), salvo lo que hacen los buscadores con las páginas públicas.",
        "**Atacar o probar la seguridad** de Mycen sin permiso. Si encontrás una falla, avisanos a team@mycen.id.",
        "**Eludir** una suspensión, un bloqueo o los límites del servicio, por ejemplo creando otra cuenta.",
        "**Vender, alquilar o transferir** tu cuenta o tu nombre de usuario.",
      ] },
    ] },
    { id: "derechos-de-autor", title: "Derechos de autor y otros derechos", body: [
      "Si creés que algo publicado en Mycen infringe tus derechos de autor u otros derechos (por ejemplo, tu marca o tu imagen), podés pedirnos que lo bajemos. Escribinos a **team@mycen.id** con:",
      { list: [
        "**El link al contenido:** la dirección exacta en Mycen del perfil, proyecto o imagen.",
        "**Quién es el titular** del derecho y cómo contactarlo. Si actuás en nombre de otra persona o empresa, decilo.",
        "**Por qué infringe:** qué obra, marca u otro derecho es y cómo se está usando sin permiso.",
        "**Una declaración:** que creés de buena fe que ese uso no está autorizado por el titular, su representante o la ley y, bajo pena de perjurio, que la información es correcta y que sos el titular o estás autorizado a actuar en su nombre.",
        "**Tu firma**, física o electrónica (alcanza con tu nombre completo escrito).",
      ] },
      "Revisamos cada pedido. Si corresponde, bajamos o bloqueamos el contenido y le avisamos a quien lo publicó, con el motivo. Esa persona puede respondernos con su versión (por ejemplo, si tiene permiso para usarlo) y lo revisamos de nuevo.",
      "**Si bajamos algo tuyo y creés que fue un error,** mandanos una contranotificación con el link al contenido que se bajó, una declaración bajo pena de perjurio de que creés de buena fe que se bajó por error o por una identificación equivocada, tu nombre, dirección y teléfono, y tu aceptación de la jurisdicción de los tribunales que correspondan. Se la pasamos a quien hizo el pedido y, si en 10 a 14 días hábiles no nos muestra que inició una acción judicial, podemos volver a publicarlo.",
      "Las cuentas que publican una y otra vez contenido que infringe derechos de otros pueden ser suspendidas o cerradas.",
    ] },
    { id: "usernames", title: "Nombres de usuario", body: [
      "Algunos nombres están reservados. No se permite registrar nombres para hacerse pasar por otra persona o marca, ni para revenderlos; podemos recuperarlos en esos casos. Si cambiás tu username, la dirección anterior redirige a la nueva para que tus links y QR sigan funcionando.",
      "No se pueden elegir nombres que imiten bancos, billeteras, servicios o marcas conocidas (por ejemplo, con la palabra “banco” o el nombre de una marca): Mycen los rechaza al elegirlos. Si tu cuenta está verificada y cambiás tu nombre o tu nombre de usuario, el tilde de verificada vuelve a revisión.",
      "A pedido de una persona conocida, una marca o su representante, podemos reservar su nombre de usuario antes de que cree su cuenta: lo puede tomar sólo esa persona. Si creés que alguien registró un nombre que te corresponde, escribinos con pruebas y lo revisamos.",
    ] },
    { id: "propiedad", title: "Lo que es de Mycen", body: [
      "La marca Mycen, la huella, el diseño y el software de Mycen pertenecen a sus titulares. Estas condiciones te dan permiso para usar el servicio, no derechos sobre esas cosas. Si nos mandás ideas o sugerencias, las podemos usar libremente para mejorar Mycen, sin ninguna obligación hacia vos.",
    ] },
    { id: "pagos", title: "Precio", body: [
      "Hoy Mycen es **gratis**: tu identidad, Studio y Life OS no tienen costo y no te pedimos ningún medio de pago.",
      "Si en el futuro sumamos planes pagos (por ejemplo, cuando abra Mycen Business), te vamos a avisar antes, con su precio en dólares estadounidenses (US$) más los impuestos de tu país, y nada de lo que hoy usás gratis va a pasar a cobrarse sin tu acuerdo. No va a haber permanencia mínima, y si sos consumidor conservás los derechos que te da la ley de tu país, como el de arrepentirte de una compra a distancia.",
    ] },
    { id: "servicio", title: "El servicio", body: [
      "Trabajamos para que Mycen funcione siempre y bien, pero puede haber interrupciones, errores o cambios. Las funciones pueden cambiar, mejorar o dejar de estar disponibles; si algo importante cambia, te avisamos con anticipación cuando sea posible.",
      "En la medida que permita la ley, Mycen se ofrece \"tal como está\", y no respondemos por daños indirectos ni por la pérdida de ganancias que se deriven del uso del servicio. Nada de esto limita los derechos que la ley de tu país no permite limitar, como los derechos de quienes usan el servicio como consumidores.",
      "Los links, videos, canciones y servicios de terceros que aparecen en los perfiles son de esos terceros: no los controlamos ni respondemos por ellos.",
      "Si aun así tuviéramos que responder, nuestra responsabilidad total queda limitada a lo que nos hayas pagado en los 12 meses anteriores o a US$ 100, lo que sea mayor. Este límite no se aplica en casos de dolo o culpa grave, daños a la vida o la salud, ni donde la ley no permita limitarla.",
    ] },
    { id: "baja", title: "Baja y suspensión", body: [
      "Podés eliminar tu cuenta cuando quieras desde Studio → Ajustes, y descargar antes una copia de tus datos. Las cuentas con un negocio activo en Mycen Business se dan de baja por soporte, porque involucran datos de clientes y ventas.",
      "Podemos suspender o cerrar cuentas que incumplan estas condiciones o la ley, o que pongan en riesgo a otras personas o al servicio. Cuando sea posible, te avisamos y te explicamos el motivo.",
    ] },
    { id: "apps", title: "Si usás la app de iPhone o de Android", body: [
      "Si descargaste Mycen de la App Store de Apple, también vale esto:",
      { list: [
        "Estas condiciones son entre vos y Mycen, no con Apple. Apple no es responsable de la app ni de su contenido.",
        "Podés usar la app en los dispositivos Apple que tengas o controles, según las reglas de uso de la App Store.",
        "Apple no tiene ninguna obligación de darte mantenimiento ni soporte de la app; para eso, escribinos a team@mycen.id.",
        "Si la app no cumple una garantía que se aplique, podés avisarle a Apple, que te devolverá lo que hayas pagado por ella (la app es gratis); Apple no tiene ninguna otra obligación de garantía. Los reclamos sobre la app (responsabilidad por el producto, cumplimiento de la ley, protección del consumidor o derechos de propiedad intelectual de terceros) los atiende Mycen, no Apple.",
        "Declarás que no estás en un país sujeto a embargo de los Estados Unidos ni figurás en sus listas de personas con prohibiciones o restricciones.",
        "Apple y sus filiales son terceros beneficiarios de estas condiciones y pueden hacerlas valer frente a vos.",
      ] },
      "Si la descargaste de Google Play, también se aplican las condiciones de Google Play.",
    ] },
    { id: "cambios", title: "Cambios en estas condiciones", body: [
      "Si cambiamos estas condiciones de forma importante, te avisamos por email o dentro de Mycen antes de que entren en vigencia. Si no estás de acuerdo, podés dejar de usar el servicio y eliminar tu cuenta.",
    ] },
    { id: "ley", title: "Ley aplicable", body: [
      "Estas condiciones se rigen por las leyes de la República Argentina. Si usás Mycen como consumidor desde otro país, también te protegen las normas de tu país que no se pueden dejar de lado por contrato, y podés reclamar ante los tribunales de tu domicilio.",
      "**Otras condiciones:** si una parte de estas condiciones no fuera válida, el resto sigue vigente. Que no hagamos valer un derecho en algún momento no significa que renunciemos a él. No respondemos por demoras o fallas causadas por hechos fuera de nuestro control razonable. Podemos transferir estas condiciones si Mycen pasa a otra persona o empresa (por ejemplo, al constituir una sociedad), con aviso previo; vos no podés transferirlas sin nuestro acuerdo. Estas condiciones y la política de privacidad son el acuerdo completo entre vos y Mycen.",
      "Antes de cualquier reclamo, escribinos a **team@mycen.id**: casi todo se resuelve hablando.",
    ] },
  ] as LegalSection[],
  privacy: [
    { id: "responsable", title: "Quién es responsable de tus datos", body: [
      "El responsable del tratamiento es **Luca Cazzoli** (CUIT 20-42325961-3), que opera Mycen bajo el nombre de fantasía **Resilio**, con domicilio en la República Argentina. Para cualquier consulta sobre tus datos escribinos a **team@mycen.id**.",
      "Cuando un negocio usa Mycen Business para gestionar datos de sus propios clientes (pedidos, reservas, turnos), ese negocio es el responsable de esos datos y Mycen los trata por su cuenta y siguiendo sus instrucciones.",
      "Mycen no tiene establecimiento en la Unión Europea ni en el Reino Unido. Para cualquier tema de protección de datos —también para contactar al delegado o encargado que pide la ley de tu país, como el «encarregado» de la LGPD en Brasil o el oficial de reclamos de la ley de la India— escribinos a **team@mycen.id**.",
    ] },
    { id: "datos", title: "Qué datos usamos", body: [
      { list: [
        "**Tu cuenta:** nombre, email, contraseña (guardada cifrada, nunca la vemos), idioma, moneda, zona horaria y la fecha en que aceptaste estas condiciones. Si activás la verificación en dos pasos, también la clave de tu app de autenticación (la guarda Supabase, cifrada).",
        "**Nombres reservados y huella o cara:** si el equipo de Mycen reservó tu nombre de usuario a pedido tuyo o de tu agencia o representante (que nos da esos datos si todavía no tenés cuenta), guardamos tu nombre, tu email y una nota mientras dure la reserva, sólo para que nadie más lo use. Si entrás con la huella o la cara, eso nunca sale de tu dispositivo: Mycen (con Supabase) guarda sólo una clave pública.",
        "**Portfolio (medidas, audiencia, marcas, prensa, créditos y representación):** son datos que cargás vos, opcionales, y se muestran en tu perfil público sólo si los completás y el módulo está visible. Mycen no los verifica ni los calcula: los números de audiencia llevan la fecha que pusiste y dejan de mostrarse al año. Los podés cambiar u ocultar cuando quieras.",
        "**Tu perfil público:** lo que cargás en Studio (nombre, foto, textos, links, proyectos, tarjeta de contacto). Sólo se publica lo que decidís mostrar. Cada foto se vuelve a generar en tu dispositivo antes de subirla, así que se borran los datos ocultos que trae (como la ubicación GPS o el modelo de la cámara).",
        "**Life OS:** tus metas, hábitos, tareas, finanzas y notas, incluidos los nombres que escribas (por ejemplo, con quién compartiste un gasto). Son privados: sólo vos podés verlos. Tu diario también: el bloqueo con PIN, huella o cara funciona sólo en tu dispositivo (no viaja a Mycen) y las entradas no tienen cifrado de extremo a extremo.",
        "**Cómo te sentiste:** si al cerrar el día tocás una de las caritas, guardamos ese dato (del 1 al 5) y la fecha. Puede decir algo de tu salud: por eso es opcional, sólo lo ves vos y lo usamos sólo para mostrarte tus propios patrones (por ejemplo, en Insights y en “Tu mes”). Tocar la carita es tu consentimiento, y lo retirás tocándola de nuevo (se borra) o borrando Life OS.",
        "**Mycen Business:** los datos de tu negocio y los que cargues sobre tus clientes y ventas.",
        "**Estadísticas de visitas:** eventos seudonimizados (visitas y toques en tu perfil): en lugar de saber quién es cada visitante, usamos un identificador que cambia todos los días y no se puede revertir. No guardamos direcciones IP ni datos del dispositivo, y no contamos robots. También guardamos de qué sitio o link llegó la visita (por ejemplo, Instagram o el QR).",
        "**Denuncias:** el motivo y el detalle que escribe quien denuncia, con un identificador seudonimizado que cambia todos los días, para evitar abusos. Si quien denuncia tiene la sesión iniciada, guardamos también su cuenta: la ve sólo el equipo de Mycen, nunca la persona denunciada.",
        "**Mensajes del formulario de contacto:** el nombre, el contacto (email o WhatsApp) y el mensaje que deja un visitante. Si el perfil tiene el módulo Colaboraciones, una marca deja además su empresa y qué busca, y si quiere su sitio web, un presupuesto y una fecha límite. Los ve sólo la persona dueña del perfil, en Studio; no se publican ni se mandan por email. Para evitar abusos usamos un identificador seudonimizado que cambia todos los días, sin IP ni datos del dispositivo. Si la persona dueña reporta un mensaje, guardamos una copia para que la revise el equipo de Mycen. Si bloquea a un contacto (o lo reporta), guardamos ese email o teléfono en su perfil para descartar lo que vuelva a mandar.",
        "**Suscripciones:** si te suscribís desde el módulo “Suscribirse” de un perfil, guardamos tu email (y tu nombre, si el perfil lo pide), la fecha en que diste tu consentimiento y tu idioma, y se los damos a la persona dueña de ese perfil, que los ve en Studio y los puede exportar. Mycen no le manda nada a esa lista: la persona dueña del perfil decide cómo usarla y es responsable de hacerlo bien. Para salir, pedíselo a esa persona o escribinos a team@mycen.id y lo borramos. Para evitar abusos usamos un identificador seudonimizado que cambia todos los días, sin IP ni datos del dispositivo.",
        "**Encuestas:** si votás en la encuesta de un perfil, guardamos tu opción con un identificador seudonimizado que cambia todos los días (sin IP, sin cuenta y sin datos del dispositivo), para contar un voto por persona. La persona dueña ve sólo los totales. Tu navegador recuerda qué votaste, para mostrártelo.",
        "**Invitaciones:** si creás tu cuenta desde “Creá tu identidad” en el perfil de otra persona, guardamos qué perfil te trajo y su tipo, para saber cómo crece Mycen. Esa persona no ve tus datos.",
        "**Uso de la app:** para saber si Mycen funciona y cómo crece, guardamos eventos de uso (por ejemplo, que publicaste tu perfil, que abriste “Mi día” o que marcaste un hábito) con tu cuenta, la fecha y datos cortos como la estructura elegida o la cantidad de días. Además, una vez por día anotamos que usaste Mycen, desde qué tipo de dispositivo (navegador, app instalada, iPhone o Android), en qué idioma y la zona horaria del dispositivo (por ejemplo, “America/Argentina/Buenos_Aires”); nunca tu IP ni tu ubicación exacta. Nunca guardamos el contenido de tus tareas, hábitos, notas ni mensajes. No usamos servicios de analítica de terceros.",
        "**Verificación de cuenta:** si pedís el tilde de cuenta verificada, guardamos tu mensaje, el link que nos pases y la respuesta. Los ve sólo el equipo de Mycen para revisarlo; si se aprueba, tu perfil muestra el tilde.",
        "**Errores técnicos:** cuando algo falla, guardamos el mensaje de error, la pantalla, la versión de Mycen y el navegador (por ejemplo, \"Chrome 128 · Android\"), sin IP ni datos personales, para poder arreglarlo.",
        "**Avisos con la app cerrada (web):** si permitís los avisos de Life OS en el navegador, guardamos la dirección de envío que crea tu navegador, sus claves de cifrado, la zona horaria y el nombre del navegador (por ejemplo, “Chrome · Android”), para mandarte tus recordatorios. Se borra cuando desactivás los avisos, cuando el navegador da de baja la suscripción o al eliminar tu cuenta.",
        "**Protección contra abusos:** para frenar ataques, contamos cuántos pedidos llegan desde cada conexión a las funciones públicas (visitas, mensajes, votos, denuncias). No guardamos la dirección IP: la convertimos en un código que no se puede revertir (un hash con una clave secreta) y lo borramos a los 2 días.",
        "**Lo que hace el equipo de Mycen:** cuando el equipo suspende un perfil, resuelve una denuncia, verifica una cuenta o borra archivos, queda anotado quién lo hizo, cuándo y sobre qué cuenta, para poder rendir cuentas. Ese registro no se puede modificar y se guarda 3 años.",
      ] },
    ] },
    { id: "para-que", title: "Para qué los usamos y con qué base", body: [
      { list: [
        "**Prestarte el servicio** que pediste al crear tu cuenta: guardar, mostrar y sincronizar tu información (ejecución del contrato).",
        "**Guardar cómo te sentiste** (las caritas de Life OS), sólo si lo anotás: con tu consentimiento explícito, que retirás cuando quieras borrándolo.",
        "**Mandarte avisos con la app cerrada**, sólo si los permitís en tu navegador o en tu teléfono (consentimiento; lo retirás desactivándolos).",
        "**Mantener Mycen seguro y funcionando:** prevenir abusos, revisar denuncias y arreglar errores (interés legítimo).",
        "**Mostrarte estadísticas** de tu perfil, con datos seudonimizados (interés legítimo).",
        "**Mandarte mails necesarios** sobre tu cuenta: confirmación, recuperación de contraseña y cambios importantes (ejecución del contrato).",
        "**Evitar la suplantación:** revisar pedidos de verificación y reservar los nombres de personas conocidas a su pedido (interés legítimo).",
        "**Saber cómo se usa y cómo crece Mycen** (uso de la app e invitaciones), sin publicidad ni terceros (interés legítimo).",
        "**Rendir cuentas y conservar evidencia** cuando la ley lo exige, por ejemplo el registro de lo que hace el equipo o una denuncia de abuso sexual infantil (obligación legal e interés legítimo).",
        "**Cumplir la ley** cuando una autoridad competente lo exija.",
      ] },
      "Cuando la base es el interés legítimo, podés oponerte escribiéndonos y dejamos de hacerlo, salvo que haya motivos legítimos más fuertes o haga falta para un reclamo legal. No tomamos decisiones automatizadas con efectos legales o igual de importantes sobre vos: cuando una herramienta marca algo (por ejemplo, un link peligroso), lo revisa una persona.",
      "No vendemos tus datos, no los usamos para publicidad y no hay rastreadores de terceros en Mycen.",
    ] },
    { id: "publico", title: "Qué es público", body: [
      "Tu página pública muestra sólo lo que publicás. Los módulos ocultos, los borradores y los Spaces no publicados no se ven. Los perfiles públicos pueden aparecer en buscadores; si elegís la visibilidad \"no listado\" o \"privado\", no se incluyen en el mapa del sitio que leen los buscadores.",
    ] },
    { id: "proveedores", title: "Con quién los compartimos", body: [
      "Usamos proveedores que tratan datos sólo para prestar el servicio y bajo contrato:",
      { list: [
        "**Supabase:** base de datos, inicio de sesión y archivos.",
        "**Vercel:** alojamiento de la aplicación y entrega de las páginas.",
        "**Resend:** envío de los mails de tu cuenta.",
        "**Cloudflare (Turnstile):** la verificación anti-bots del registro, el inicio de sesión y la recuperación de contraseña. Al abrir esas pantallas, Cloudflare recibe datos técnicos de tu navegador (como la dirección IP) sólo para comprobar que no sos un bot.",
        "**Cloudflare R2:** guarda una copia de seguridad diaria de las fotos y los PDF que suben los perfiles, para poder recuperarlos si algo falla. Lo que se borra en Mycen queda en esa copia 30 días y después se elimina.",
        "**Google Web Risk:** revisamos con Google los links públicos de los perfiles y proyectos publicados, para encontrar estafas y virus. Se manda sólo el link; nada tuyo ni de quien visita. Si un link es peligroso, lo revisa el equipo de Mycen.",
        "**YouTube, Vimeo, TikTok, Spotify y SoundCloud:** sólo si un perfil integra un video o una canción y tocás \"Reproducir\". Antes de eso no nos conectamos con ellos; desde ese momento se aplican sus propias políticas. Si un perfil muestra su \"Último video\", el servidor de Mycen consulta el listado público de videos del canal de YouTube que eligió su dueño, sin enviar ningún dato tuyo. Cuando el dueño de un perfil pega uno de esos links en Studio, el servidor de Mycen trae la portada pública de ese video o esa canción y la guarda como una foto más de su perfil: así la página la muestra sin conectarte con el proveedor. Si un perfil muestra un podcast, el servidor de Mycen lee el feed RSS público que eligió su dueño, sin enviar ningún dato tuyo; al tocar \"Escuchar\", tu navegador se conecta con el servicio que aloja ese podcast y se aplican sus políticas. Si un perfil tiene varias sucursales y tocás \"Ver la más cerca\", tu navegador te pide permiso para usar tu ubicación: se usa sólo en tu dispositivo para ordenar la lista y no se manda a Mycen ni a nadie.",
        "**Anthropic:** sólo si un negocio usa la importación de su menú desde un PDF; se procesa ese archivo.",
        "**Mercado Pago:** sólo si un negocio lo configura para cobrar; el pago se hace en Mercado Pago.",
        "**Google (inicio de sesión):** sólo si elegís \"Continuar con Google\". Google nos confirma tu nombre, tu email y tu foto; no recibimos tu contraseña de Google ni accedemos a nada más de tu cuenta.",
        "**Apple (inicio de sesión):** sólo si elegís \"Continuar con Apple\". Apple nos confirma tu nombre y tu email (o un email de reenvío que Apple genera si preferís ocultar el tuyo); no recibimos tu contraseña ni accedemos a nada más de tu cuenta.",
        "**App de iOS y Android:** si la descargás, Apple (App Store) o Google (Google Play) registran la descarga según sus propias políticas. En la app, los recordatorios se programan en tu teléfono, sin un servicio de notificaciones de terceros.",
        "**Servicio de avisos de tu navegador:** sólo si permitís los avisos de Life OS en la web. El recordatorio (el nombre de la tarea o el hábito y su hora) viaja cifrado hasta tu dispositivo a través del servicio de avisos de tu navegador: Google (Firebase Cloud Messaging) en Chrome y Android, Microsoft en Edge, Apple en Safari y Mozilla en Firefox. Ese servicio ve la dirección de envío, pero no puede leer el contenido.",
        "**Google Calendar, Apple u otro calendario:** sólo si activás el link de calendario de Life OS; ese servicio descarga tus tareas pendientes con fecha (título, fecha, hora y aviso). Lo podés apagar o cambiar cuando quieras.",
        "**Reconocimiento de voz de tu navegador:** sólo si usás \"Dictar\" en Life OS. Tu navegador convierte la voz en texto (en Chrome lo hace el servicio de voz de Google; en Safari, Apple). Mycen recibe sólo el texto.",
      ] },
      "Fuera de eso, sólo compartimos datos si la ley nos obliga o para proteger los derechos y la seguridad de las personas.",
    ] },
    { id: "transferencias", title: "Datos fuera de tu país", body: [
      "Mycen se opera desde la Argentina, un país que la Comisión Europea reconoce con un nivel de protección adecuado. Nuestros proveedores pueden guardar o procesar datos en otros países, como Estados Unidos o países de la Unión Europea. En esos casos usamos las garantías que prevé la ley: decisiones de adecuación (por ejemplo, el Marco de Privacidad de Datos UE-EE. UU. para los proveedores adheridos), las cláusulas contractuales tipo de la Comisión Europea y del Reino Unido, y las cláusulas modelo de la autoridad argentina (AAIP). Podés pedirnos más información o una copia de esas garantías.",
    ] },
    { id: "plazos", title: "Cuánto tiempo los guardamos", body: [
      { list: [
        "Los datos de tu cuenta, tu perfil y Life OS, mientras tengas la cuenta. Si la eliminás, los borramos, también tus fotos y PDF; las copias de seguridad de los proveedores se sobrescriben en sus ciclos habituales y la copia diaria de fotos y PDF guarda lo borrado 30 días.",
        "Las estadísticas de visitas se guardan seudonimizadas (con el identificador que cambia cada día) 13 meses —Studio muestra hasta 90 días— y los votos de las encuestas, mientras exista el perfil. Si se borra el perfil, se borran con él.",
        "Los mensajes del formulario de contacto, hasta que la persona dueña del perfil los borra o elimina su cuenta.",
        "Los emails de suscripción, hasta que la persona dueña del perfil los borra, elimina su cuenta o nos pedís que los borremos.",
        "Los registros de errores se guardan mientras sirvan para arreglarlos (uno resuelto queda guardado por si vuelve a pasar); el conteo de personas afectadas, 90 días.",
        "Los eventos de uso de la app y el registro de los días que usaste Mycen, 25 meses (después se borran solos); si antes eliminás tu cuenta, quedan sin ningún vínculo con vos.",
        "Los avisos del navegador, hasta que los desactives o elimines tu cuenta; el código de conexión para frenar abusos, 2 días; los contactos bloqueados, hasta que la persona dueña los desbloquee o elimine su perfil; y el registro de lo que hace el equipo de Mycen, 3 años.",
        "Las denuncias, mientras exista el perfil denunciado (se borran con él); los pedidos de verificación y las invitaciones, mientras exista la cuenta; los nombres reservados, mientras dure la reserva; y los links marcados como peligrosos, 13 meses.",
        "Lo que la ley obligue a conservar (por ejemplo, datos de facturación o la evidencia que pide una autoridad ante un abuso sexual infantil), por el plazo que fije, bloqueado para cualquier otro uso y aunque se pida borrarlo.",
      ] },
    ] },
    { id: "dispositivo", title: "Lo que se guarda en tu dispositivo", body: [
      "Mycen no usa cookies de publicidad ni de seguimiento. En tu navegador guardamos sólo lo necesario para que funcione: tu sesión, tu idioma y algunos borradores y preferencias. Podés borrarlo desde la configuración del navegador (vas a tener que iniciar sesión de nuevo). Si cargás algo en Life OS sin conexión, queda en tu dispositivo hasta que se sube (sólo con tu sesión). Del PIN del diario guardamos sólo una huella cifrada (hash), nunca el PIN. Por eso no te mostramos un aviso de cookies: usamos sólo lo estrictamente necesario, que la ley permite sin pedir consentimiento.",
    ] },
    { id: "seguridad", title: "Seguridad", body: [
      "Usamos conexiones cifradas, contraseñas guardadas con cifrado, verificación en dos pasos para el equipo y permisos en la base de datos para que cada persona vea sólo lo suyo. Ningún sistema es perfecto: si una filtración pudiera afectar tus derechos, avisamos a la autoridad que corresponda (en la Unión Europea, dentro de las 72 horas) y, si el riesgo es alto, también a vos, sin demora.",
    ] },
    { id: "derechos", title: "Tus derechos", body: [
      "Podés pedir acceder a tus datos, corregirlos, borrarlos, llevártelos (portabilidad), oponerte o limitar ciertos usos, y retirar un consentimiento que hayas dado, sin que eso afecte lo hecho antes. Muchas cosas las hacés directo desde Studio → Ajustes (descargar tus datos, eliminar tu cuenta) o desde Life OS → Ajustes → Tus datos. Para lo demás, escribinos a **team@mycen.id**; para proteger tu cuenta, podemos pedirte que confirmes que sos vos (por ejemplo, escribiéndonos desde el email de la cuenta). Es gratis.",
      "Respondemos dentro de los plazos de la ley (en Argentina, 10 días corridos para el acceso y 5 días hábiles para corregir o borrar). También podés reclamar ante la autoridad de protección de datos: en Argentina, la **Agencia de Acceso a la Información Pública (AAIP)**; en la Unión Europea, la autoridad de tu país; en Brasil, la **ANPD**.",
    ] },
    { id: "segun-pais", title: "Según dónde vivís", body: [
      "Además de lo anterior:",
      { list: [
        "**Unión Europea, Espacio Económico Europeo, Reino Unido y Suiza:** respondemos en un mes (dos más si el pedido es complejo, y te avisamos). Podés reclamar ante la autoridad de protección de datos de tu país.",
        "**Brasil (LGPD):** también podés pedir saber con qué empresas compartimos tus datos y que se revise una decisión automatizada. Autoridad: la **ANPD**.",
        "**Estados Unidos (California y los estados con leyes de privacidad, como Virginia, Colorado, Connecticut o Texas):** podés saber qué datos tenemos —identificadores como tu nombre y tu email, lo que publicás, datos de uso de la app y, sólo si lo anotás, cómo te sentiste, un dato sensible que usamos únicamente para mostrártelo—, pedir que los corrijamos o borremos y llevártelos. No vendemos ni compartimos tus datos para publicidad, así que no hace falta que te des de baja de nada; igual respetamos la señal Global Privacy Control. Podés actuar por medio de un representante autorizado y no te vamos a tratar distinto por ejercer tus derechos. Si rechazamos un pedido, podés apelar respondiendo con el asunto «Apelación» y, si seguís en desacuerdo, reclamar ante el fiscal general de tu estado.",
        "**Canadá, Australia, Japón y Corea del Sur:** podés acceder a tus datos, corregirlos y retirar tu consentimiento. Podés reclamar ante el Comisionado de Privacidad de Canadá, la OAIC de Australia, la PPC de Japón o la PIPC de Corea.",
        "**India (DPDP):** podés acceder a tus datos, corregirlos y borrarlos, y nombrar a alguien que ejerza tus derechos si no pudieras hacerlo. Las quejas se presentan primero ante nosotros (team@mycen.id) y después ante la Junta de Protección de Datos de la India.",
        "**Corea del Sur y China continental:** como Mycen no tiene servidores ahí, al registrarte te pedimos un consentimiento aparte para guardar y procesar tus datos fuera del país, con el detalle de qué datos salen, a qué proveedores y países (los de «Datos fuera de tu país»), para qué y por cuánto tiempo. Podés retirarlo cuando quieras eliminando tu cuenta. En Corea podés reclamar ante la PIPC y en China, ante la Administración del Ciberespacio (CAC).",
        "**Otros países:** te damos los derechos que te reconozca la ley de tu país; escribinos y te ayudamos.",
      ] },
    ] },
    { id: "menores", title: "Menores", body: [
      "Mycen no está dirigido a menores de 13 años, ni a quienes no tengan la edad mayor que exija la ley de su país para usar un servicio así sin el consentimiento de sus padres (por ejemplo, 14 en Corea del Sur y en China, y hasta 16 en algunos países de la Unión Europea). No recolectamos a sabiendas datos de personas menores de esa edad: si sabemos que una cuenta es de alguien que no la tiene, la eliminamos junto con sus datos. Si sos madre, padre o tutor y creés que pasó, escribinos a **team@mycen.id**.",
      "Si tenés menos de 18 años, recordá que tu perfil público lo puede ver cualquiera: no publiques tu dirección, tu escuela ni datos que permitan ubicarte. En Ajustes podés elegir «Sólo con el link» o «Privado».",
    ] },
    { id: "cambios", title: "Cambios en esta política", body: [
      "Si cambiamos esta política de forma importante, te avisamos por email o dentro de Mycen antes de que se aplique. Arriba vas a ver siempre la fecha de la última actualización.",
    ] },
  ] as LegalSection[],
}

export type LegalDict = typeof es
export default es
