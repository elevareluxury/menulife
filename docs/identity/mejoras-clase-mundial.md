# Mycen Identity: mejoras para ser la mejor identidad digital del mundo

31/10/2026. Junta la auditoría visual de los 23 módulos (357 capturas: 5 estructuras × 2 temas × celular y computadora,
árabe y "reproduciendo") con una revisión del perfil completo. Cada punto dice prioridad, tamaño del trabajo
(S = horas, M = 1–2 días, L = más) y si entra en la V1 o va a la V1.1/V1.2 según `docs/v1/ROADMAP.md`.

---

## A. Antes de abrir al público (PR "Pulido de módulos", V1)

Errores que un visitante nota y que restan confianza:

| # | Qué | Por qué | Tamaño |
|---|---|---|---|
| A1 | El chip "Cerrado ahora" aparece en el encabezado de cualquiera que tenga Horarios (aunque diga "Disponible") | Contradice el estado de la persona | S |
| A2 | Estrellas de Reseñas con color fijo (casi invisibles en Amanecer) y sin la 5.ª vacía | Contraste y prolijidad | S |
| A3 | Precio de Producto siempre en "$" | Un perfil mundial necesita la moneda (USD, EUR, BRL…) | S/M |
| A4 | "Botón destacado" se ve más débil que un link común | Es la acción que el dueño quiere que toquen | S |
| A5 | Colaboraciones abre 8 campos (≈ 1.500 px) | Tapa el resto del perfil; mejor un botón que lo despliega | S/M |
| A6 | Música/video sin portada = caja negra; con portada, una placa "pegada" | Se ve vacío o barato | M |
| A7 | Grupo de links no se ve como grupo | Lista agrupada estilo iOS | S |
| A8 | Dos estilos de título mezclados sin regla | Los módulos no parecen de la misma familia | M |
| A9 | Tamaños de letra, radios y hover sueltos en el CSS | Coherencia con el sistema de diseño | S |
| A10 | Bento reordena (sube lo que el dueño puso abajo) y estira cuadrados | Rompe el orden elegido | S |
| A11 | Árabe: flechas sin espejar; texto del dueño sin `dir="auto"` | 12 idiomas de verdad | S |
| A12 | Proyecto sin portada deja un hueco; flyer de Entradas más alto que la pantalla | Detalles | S |
| A13 | Formularios: título pegado, desplegable distinto, fecha "mm/dd/yyyy" | Detalles | S |

## B. Tamaños por módulo y un Bento de verdad (PR "Tamaños", V1 si llega; si no, primer PR de la V1.1)

El cambio que más se va a notar: hoy todo es una franja de ancho completo y el perfil parece una lista larga.

- Cuatro tamaños: **Barra** (fila compacta), **Cuadrado** (dos por fila en el celular), **Ancho** y **Destacado**.
  Cada módulo ofrece los que le quedan bien; selector "Tamaño" en Studio; se guarda en `config.size` (sin migración
  obligatoria).
- **Música:** barra de 80 px (el reproductor compacto de Spotify mide lo mismo: no salta al tocar) o cuadrado con la
  portada a sangre que pasa a ancho recién al tocar. Nada de terceros antes de tocar.
- **Video:** ancho 16:9, cuadrado, o vertical 9:16 para TikTok/Reels/Shorts.
- **Links, fotos, productos, contacto, ubicación, reseñas, horarios, proyectos:** cuadrados de a dos.
- **Bento en la computadora:** 4 columnas (hoy sigue en 2 dentro de una columna angosta).
- Todas las estructuras respetan el orden del dueño.

## C. Íconos y variantes ricas (PR "Íconos y variantes", V1.1)

- Redes: sumar Spotify, Apple Music, SoundCloud, Threads, Behance, Dribbble, GitHub, Twitch, Pinterest, Telegram,
  Discord y Substack. Variantes "filas" (nombre + @usuario) y "cuadrados".
- Links reconocidos por dominio (Etsy, Behance, Substack, Mercado Libre…) con su glifo; si no, la inicial con el acento
  (no la cadenita repetida).
- "Escuchá en" con el glifo de cada plataforma y en filas (ningún nombre partido en dos renglones).
- Glifos dibujados dentro de Mycen (no se carga nada de afuera). **Decisión del dueño:** confirmar que "sin íconos de
  terceros" significa "sin cargar nada de afuera".
- Galería en mosaico y carrusel; Portfolio en carrusel; "Leer más" en textos largos; Contacto en 3 botones grandes.
- "Último video" con título y miniaturas servidas por Mycen (como las portadas automáticas).

## D. Más allá de los módulos: lo que hace a una identidad de primer nivel

| # | Qué | Para qué | Alcance | Tamaño |
|---|---|---|---|---|
| D1 | Datos para Google en cada perfil (`ProfilePage` + `Person` / `Organization` en JSON-LD) | Que Google muestre el perfil como ficha de persona o negocio | V1 | S |
| D2 | Imagen para historias de Instagram/WhatsApp (9:16 con la huella, el nombre y el QR) desde Compartir | Es el canal por el que más se comparte un link de bio | V1.1 | M |
| D3 | Aviso "Abrí en tu navegador" dentro de los navegadores de Instagram y TikTok cuando un botón no anda ahí (WhatsApp, descargas, vCard) | Esos navegadores bloquean cosas; es la queja nº 1 de los link-in-bio | V1.1 | S |
| D4 | Perfil pre-armado en el servidor (el HTML ya trae el contenido) | Lighthouse de 74 a 90+, mejor posición en Google y carga instantánea al compartir | V1.1 | L |
| D5 | Revisión de links peligrosos (lista propia de dominios de phishing + denuncia rápida) | Una plataforma mundial de links atrae estafas; protege la marca | V1.1 | M |
| D6 | Reclamos por nombre o marca (formulario y proceso en el panel) | Usernames de marcas conocidas ocupados por terceros | V1.1 | S |
| D7 | Reporte semanal por mail al dueño ("Tu semana") | Que vuelvan sin tener que entrar | V1.1 | M |
| D8 | Reservas, preguntas frecuentes y cuenta regresiva como módulos | Casos de uso de profesionales y lanzamientos | V1.1 (ya en la hoja de ruta) | M c/u |
| D9 | Tarjeta en Apple Wallet / Google Wallet | El "tarjeta personal" del futuro | V1.1 (ya en la hoja de ruta) | M |
| D10 | Portada con video | Perfiles de creadores | V1.1 (ya en la hoja de ruta) | M |
| D11 | Widget para insertar la tarjeta en otra web | Firma de mail, sitio personal | V1.1 | S/M |
| D12 | Traducción automática del perfil, dominio propio, tarjeta NFC | Diferenciales grandes | V1.2 (ya en la hoja de ruta) | L |
| D13 | Página pública de estado (estado.mycen.id) | Confianza de un sistema mundial | V1.1 | S (UptimeRobot) |

## Orden recomendado

1. **PR A (pulido)** antes de abrir: errores visibles y coherencia.
2. **D1 (datos para Google)** en el mismo PR o en uno chico: es barato y suma desde el día uno.
3. **PR B (tamaños)** apenas se pueda: es lo que más cambia la percepción ("se ve como Bento.me, pero mejor").
4. Después de abrir, con datos reales de uso: C, D2, D3, D4 y D5 primero.

Capturas e informe técnico completo de la auditoría visual: `…/scratchpad/module-audit/` (informe.md + shots/).
