// Términos y privacidad (Lanzamiento L4). El español es la versión de referencia; las traducciones tienen las mismas
// secciones (tsc lo exige). Texto preparado sin revisión de un abogado: revisarlo antes de abrir al público y cuando haya
// razón social inscripta (docs/lanzamiento/00-plan.md, sección 4).
// Formato de cada bloque: texto (admite **negrita**) o { list: [...] }.

export type LegalBlock = string | { list: string[] }
export interface LegalSection { id: string; title: string; body: LegalBlock[] }

const UPDATED = '2026-10-09'

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
  },
  updated: UPDATED,
  terms: [
    { id: 'quien', title: 'Quién presta el servicio', body: [
      'Mycen es un servicio operado por **Resilio**, con domicilio en la República Argentina. Podés escribirnos a **team@mycen.id**.',
      'Mycen te permite crear una identidad digital pública (Mycen Identity), administrarla desde Mycen Studio, organizar tu vida personal en Life OS y, si tenés un negocio, gestionarlo con Mycen Business.',
    ] },
    { id: 'edad', title: 'Quién puede usar Mycen', body: [
      'Tenés que tener al menos **13 años**. Si en tu país la edad mínima para aceptar estas condiciones o para el tratamiento de tus datos es mayor (por ejemplo, 16 en algunos países de la Unión Europea), necesitás esa edad o la autorización de tu madre, padre o tutor.',
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
    ] },
    { id: 'derechos-de-autor', title: 'Derechos de autor y marcas', body: [
      'Si creés que algo publicado en Mycen usa tu obra o tu marca sin permiso, escribinos a **team@mycen.id** con: tus datos de contacto, qué obra o marca es tuya, la dirección exacta del contenido en Mycen y una declaración de que la información es correcta y de que sos titular o actuás en su nombre.',
      'Si el reclamo es válido, quitamos o bloqueamos el contenido y avisamos a quien lo publicó, que puede responder con su versión. Quien publique reiteradamente contenido de otros sin permiso puede perder su cuenta.',
    ] },
    { id: 'usernames', title: 'Nombres de usuario', body: [
      'Algunos nombres están reservados. No se permite registrar nombres para hacerse pasar por otra persona o marca, ni para revenderlos; podemos recuperarlos en esos casos. Si cambiás tu username, la dirección anterior redirige a la nueva para que tus links y QR sigan funcionando.',
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
    { id: 'responsable', title: 'Quién es responsable de tus datos', body: [
      'El responsable del tratamiento es **Resilio**, con domicilio en la República Argentina, que opera Mycen. Para cualquier consulta sobre tus datos escribinos a **team@mycen.id**.',
      'Cuando un negocio usa Mycen Business para gestionar datos de sus propios clientes (pedidos, reservas, turnos), ese negocio es el responsable de esos datos y Mycen los trata por su cuenta y siguiendo sus instrucciones.',
    ] },
    { id: 'datos', title: 'Qué datos usamos', body: [
      { list: [
        '**Tu cuenta:** nombre, email, contraseña (guardada cifrada, nunca la vemos), idioma, moneda, zona horaria y la fecha en que aceptaste estas condiciones.',
        '**Tu perfil público:** lo que cargás en Studio (nombre, foto, textos, links, proyectos, tarjeta de contacto). Sólo se publica lo que decidís mostrar.',
        '**Life OS:** tus metas, hábitos, tareas, finanzas y notas. Son privados: sólo vos podés verlos.',
        '**Mycen Business:** los datos de tu negocio y los que cargues sobre tus clientes y ventas.',
        '**Estadísticas de visitas:** eventos anónimos (visitas y clicks en tu perfil) con un identificador que cambia todos los días. No guardamos direcciones IP ni datos del dispositivo, y no contamos robots.',
        '**Denuncias:** el motivo y el detalle que escribe quien denuncia, con un identificador anónimo diario para evitar abusos.',
        '**Errores técnicos:** cuando algo falla, guardamos el mensaje de error, la pantalla, la versión de Mycen y el navegador (por ejemplo, "Chrome 128 · Android"), sin IP ni datos personales, para poder arreglarlo.',
      ] },
    ] },
    { id: 'para-que', title: 'Para qué los usamos y con qué base', body: [
      { list: [
        '**Prestarte el servicio** que pediste al crear tu cuenta: guardar, mostrar y sincronizar tu información (ejecución del contrato).',
        '**Mantener Mycen seguro y funcionando:** prevenir abusos, revisar denuncias y arreglar errores (interés legítimo).',
        '**Mostrarte estadísticas** de tu perfil, de forma anónima (interés legítimo).',
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
        '**YouTube, Vimeo, TikTok, Spotify y SoundCloud:** sólo si un perfil integra un video o una canción y tocás "Reproducir". Antes de eso no nos conectamos con ellos; desde ese momento se aplican sus propias políticas.',
        '**Anthropic:** sólo si un negocio usa la importación de su menú desde un PDF; se procesa ese archivo.',
        '**Mercado Pago:** sólo si un negocio lo configura para cobrar; el pago se hace en Mercado Pago.',
      ] },
      'Fuera de eso, sólo compartimos datos si la ley nos obliga o para proteger los derechos y la seguridad de las personas.',
    ] },
    { id: 'transferencias', title: 'Datos fuera de tu país', body: [
      'Nuestros proveedores pueden guardar o procesar datos en servidores de otros países, como Estados Unidos o países de la Unión Europea. Cuando eso pasa, usamos las garantías que prevé la ley, como cláusulas contractuales aprobadas por las autoridades de protección de datos, para que tus datos tengan un nivel de protección adecuado.',
    ] },
    { id: 'plazos', title: 'Cuánto tiempo los guardamos', body: [
      { list: [
        'Los datos de tu cuenta, tu perfil y Life OS, mientras tengas la cuenta. Si la eliminás, los borramos; las copias de seguridad de los proveedores se sobrescriben en sus ciclos habituales.',
        'Las estadísticas de visitas se guardan agrupadas y anónimas.',
        'Los registros de errores se guardan hasta que se resuelven; el conteo de personas afectadas, 90 días.',
        'Lo que la ley obligue a conservar (por ejemplo, datos de facturación), por el plazo que fije.',
      ] },
    ] },
    { id: 'dispositivo', title: 'Lo que se guarda en tu dispositivo', body: [
      'Mycen no usa cookies de publicidad ni de seguimiento. En tu navegador guardamos sólo lo necesario para que funcione: tu sesión, tu idioma y algunos borradores y preferencias. Podés borrarlo desde la configuración del navegador (vas a tener que iniciar sesión de nuevo).',
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
      'Mycen no está dirigido a menores de 13 años. Si sabemos que una cuenta es de alguien menor de esa edad (o de la que fije la ley de su país) sin autorización, la eliminamos. Si sos madre, padre o tutor y creés que pasó, escribinos.',
    ] },
    { id: 'cambios', title: 'Cambios en esta política', body: [
      'Si cambiamos esta política de forma importante, te avisamos por email o dentro de Mycen antes de que se aplique. Arriba vas a ver siempre la fecha de la última actualización.',
    ] },
  ] as LegalSection[],
}

export type LegalDict = typeof es
export default es
