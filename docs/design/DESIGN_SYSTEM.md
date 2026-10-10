# Sistema de diseño Mycen

Este documento es la fuente de verdad visual de Mycen. Toda pantalla nueva o rediseñada
tiene que seguirlo. Si algo de acá entra en conflicto con un pedido puntual, gana el
pedido puntual, pero hay que avisarlo en el resumen de la tarea.

Referencia visual: los mockups del lienzo "Mycen · Perfil Universo" (estructuras A a E y huellas).

---

## 1. Concepto

**Tu identidad flotando en el universo.** Mycen se ve como un espacio profundo donde
la identidad de cada persona flota frente a quien la mira. La firma de la marca es la
**huella Mycen**: un dibujo generativo único por persona, calculado a partir de su
identidad. Nadie tiene una igual.

El futuro que transmite Mycen es de asombro y confianza, nunca inquietante:
futurista pero humano.

## 2. Principios

1. **Una sola cosa memorable por pantalla.** En el perfil es la huella. Todo lo demás
   es calmo y disciplinado.
2. **Profundidad real.** Fondo profundo, objetos de vidrio flotando delante, sombras
   largas. Nada se apoya "pegado" al fondo.
3. **Movimiento lento y con sentido.** Flotación suave, huella que gira muy despacio.
   Una sola entrada orquestada al abrir el perfil. Nunca animaciones en todo.
4. **Accesible y rápido siempre.** Contraste AA, áreas táctiles de 44 px, respeto por
   "reducir movimiento" y "reducir transparencia", y presupuesto de peso.
5. **Se diseña para la persona real.** Textos claros, sin culpa, que dicen qué pasa
   y qué hacer después.

## 3. Temas

Mycen tiene dos temas. Cada perfil público elige el suyo. Studio y Life OS siguen el
modo del sistema del celular (claro → Amanecer, oscuro → Universo), con opción manual
en Ajustes.

Se implementan como variables CSS bajo `[data-mycen-theme="universo"]` y
`[data-mycen-theme="amanecer"]`. Ningún componente usa colores sueltos: solo variables.

### 3.1 Universo (oscuro)

| Variable | Valor | Uso |
|---|---|---|
| `--my-bg` | `#04050D` | Fondo base |
| `--my-text` | `#EEF0FF` | Texto principal |
| `--my-muted` | `#B7BCD6` | Texto secundario (contraste ≈ 10:1) |
| `--my-subtle` | `#A3A8C3` | Metadatos pequeños |
| `--my-glass` | `rgba(255,255,255,0.06)` | Superficie de vidrio |
| `--my-glass-strong` | `rgba(255,255,255,0.09)` | Vidrio destacado (credencial) |
| `--my-border` | `rgba(255,255,255,0.14)` | Borde de vidrio |
| `--my-field` | `rgba(4,5,13,0.6)` | Fondo de campos de formulario |
| `--my-tile` | `#0A0C1F` | Fondo de medios (video, portadas) |
| `--my-track` | `rgba(255,255,255,0.12)` | Pistas de progreso |
| `--my-shadow-float` | `0 30px 60px -28px rgba(0,0,0,0.9)` | Sombra de objeto flotante |
| `--my-star` | `#FFFFFF` | Estrellas |
| `--my-verified` | `#7DD3FC` | Ícono de verificación (V1.1) |
| `--my-secondary` | `#7DD3FC` | Segundo color de la huella |

Nebulosas (capa de fondo, una sola declaración):
```css
background:
  radial-gradient(60% 30% at 88% 6%, rgba(255,122,89,0.20), transparent 70%),
  radial-gradient(75% 35% at 6% 30%, rgba(99,76,224,0.30), transparent 70%),
  radial-gradient(70% 30% at 90% 70%, rgba(56,152,236,0.16), transparent 70%),
  #04050D;
```

### 3.2 Amanecer (claro)

| Variable | Valor | Uso |
|---|---|---|
| `--my-bg` | ver degradé abajo | Cielo de amanecer |
| `--my-text` | `#1A1530` | Texto principal |
| `--my-muted` | `#4E4866` | Texto secundario (contraste ≈ 7:1) |
| `--my-subtle` | `#5B5672` | Metadatos pequeños |
| `--my-glass` | `rgba(255,255,255,0.55)` | Vidrio esmerilado |
| `--my-glass-strong` | `rgba(255,255,255,0.70)` | Vidrio destacado |
| `--my-border` | `rgba(255,255,255,0.85)` | Borde |
| `--my-field` | `rgba(255,255,255,0.75)` | Campos |
| `--my-tile` | `#F3E8F0` | Fondo de medios |
| `--my-track` | `rgba(26,21,48,0.12)` | Pistas |
| `--my-shadow-float` | `0 28px 56px -30px rgba(70,45,120,0.35)` | Sombra violeta suave |
| `--my-star` | `#3A2E6E` | Últimas estrellas (solo en la parte alta, opacidad ≤ 0.45) |
| `--my-verified` | `#4B3BC4` | Verificación |
| `--my-secondary` | `#5B3FD1` | Segundo color de la huella |

Cielo:
```css
background:
  radial-gradient(60% 22% at 72% 24%, rgba(255,170,120,0.55), transparent 70%),
  linear-gradient(180deg, #E9E3F7 0%, #F6DDD6 32%, #FFE9DA 52%, #FFF6EE 70%, #FBF4EE 100%);
```

### 3.3 Acento personal

Cada perfil elige un acento de una paleta cerrada. Cada acento tiene una versión por
tema, calculada para que el texto del botón principal cumpla contraste AA.

| Nombre | Universo (`--my-accent`) | Texto sobre acento | Amanecer (`--my-accent`) | Texto sobre acento |
|---|---|---|---|---|
| Plasma (por defecto) | `#FF7A59` | `#05060F` | `#C8431F` | `#FFFFFF` |
| Ion | `#7DD3FC` | `#05060F` | `#1D6FA5` | `#FFFFFF` |
| Nebulosa | `#C4B5FD` | `#05060F` | `#6D4AD1` | `#FFFFFF` |
| Aurora | `#5EEAD4` | `#05060F` | `#0F7C6E` | `#FFFFFF` |
| Sol | `#FBBF24` | `#05060F` | `#9A5B05` | `#FFFFFF` |
| Rosa | `#F9A8D4` | `#05060F` | `#B0306E` | `#FFFFFF` |
| Lima | `#A3E635` | `#05060F` | `#4D7C0F` | `#FFFFFF` |
| Luna (sobrio) | `#E5E7EB` | `#05060F` | `#3F3F46` | `#FFFFFF` |
| Mono (sobrio) | `#F5F5F4` | `#05060F` | `#111111` | `#FFFFFF` |
| Grafito (sobrio) | `#A8A29E` | `#05060F` | `#57534E` | `#FFFFFF` |
| Pizarra (sobrio) | `#94A3B8` | `#05060F` | `#475569` | `#FFFFFF` |
| Arena (sobrio) | `#D6C7A1` | `#05060F` | `#6B5B3E` | `#FFFFFF` |

Sol a Arena se sumaron después de la etapa 15 (migración `20261024000001_v1_more_accents.sql`). En los sobrios el brillo
de Universo baja al 35 %.

`--my-on-accent` = texto sobre acento. `--my-glow` = el acento al 55 % (universo) o 40 %
(amanecer), usado en el brillo bajo el botón principal y la credencial.

## 4. Tipografía

| Familia | Rol | Pesos |
|---|---|---|
| **Unbounded** | Nombres, títulos, marca "mycen" | 500, 700 |
| **Geist** | Interfaz y textos | 400, 500, 600 |
| **Instrument Serif** | Solo la estructura Editorial | 400 normal e itálica |

- Se auto-alojan con `@fontsource` (Geist e Instrument Serif ya están; sumar
  `@fontsource/unbounded`), solo los subsets `latin` y `latin-ext`, `font-display: swap`.
- **Idiomas sin alfabeto latino** (ar, hi, ja, ko, ru, zh): Unbounded no los cubre.
  La pila de fuentes cae a la fuente del sistema para ese alfabeto. Verificar que los
  nombres en esos idiomas se vean bien y no queden con letras faltantes.
- Escala (px): 46 portada · 28 nombre · 22 título de sección · 17 destacado ·
  15 texto · 13 secundario · 11 metadatos. Interlineado 1.1 en títulos, 1.45 en texto.
- Textos en oración (sin MAYÚSCULAS sostenidas). Las mayúsculas espaciadas se reservan
  para metadatos de 11 px y con moderación.

## 5. Superficies

**Vidrio** = `--my-glass` + borde 1 px `--my-border` + `backdrop-filter: blur(14px)` +
`--my-shadow-float`. El vidrio destacado (credencial, portada) suma un brillo:
`0 30px 80px -40px var(--my-glow)` y un borde superior interior
`inset 0 1px 0 rgba(255,255,255,0.12)`.

**Radios por jerarquía** (nunca uno solo para todo):

| Elemento | Radio |
|---|---|
| Credencial / bloque protagonista | 30 px |
| Tarjetas y medios | 24 px |
| Bloques Bento | 26 px |
| Botón principal | 20 px |
| Campos | 14 px |
| Chips y pastillas | 999 px |

## 6. Fondo y rendimiento

- Las estrellas **no son elementos del DOM**. Se generan una vez como imagen
  (SVG o PNG liviano, menos de 8 KB, repetible) y se usan como `background-image`.
- Las nebulosas son una sola declaración CSS (ver arriba).
- `backdrop-filter` es caro en celulares: como máximo 6 superficies con desenfoque
  visibles a la vez. Con `@media (prefers-reduced-transparency: reduce)` o en equipos
  lentos (`navigator.hardwareConcurrency <= 4`), el vidrio pasa a un color sólido
  equivalente sin desenfoque.
- Presupuesto de las páginas públicas: perfil y proyecto ≤ 240 KB gzip, landing
  ≤ 310 KB (lo controla `scripts/check-bundle-budget.mjs`). Nada de este sistema
  puede romperlo.

## 7. Movimiento

| Movimiento | Especificación |
|---|---|
| Flotación | `translateY` ±5 px, 7 s, ease-in-out, infinito. Cada objeto con un retraso distinto. Máximo 6 objetos flotando por pantalla. |
| Huella | Rotación completa en 90–140 s, lineal. |
| Estado en vivo | Punto que late (opacidad 1 → 0.35), 2.4 s. |
| Entrada del perfil | Una sola secuencia: la huella se dibuja (600 ms), después el contenido aparece en cascada (300 ms, 40 ms entre elementos). Total ≤ 900 ms. |
| Respuesta a acciones | Transiciones de 150–250 ms al abrir, confirmar o expandir. |

Con `prefers-reduced-motion: reduce`, **todo** lo anterior se apaga (la huella queda
quieta y el contenido aparece sin animación). No se agregan transiciones de hover a
cada tarjeta.

## 8. La huella Mycen

El generador vive en `docs/design/huella.ts` (copiarlo a `src/lib/huella/`).

- **Semilla:** el `id` del perfil (estable) + un `huella_salt` opcional que cambia
  cuando el usuario toca "Generar otra". Nunca el nombre: si la persona cambia su
  nombre, su huella no debe cambiar.
- **Estilos:** `orbitas` (por defecto), `hilos`, `constelacion`, `pulso`.
- **Colores:** degradé de `--my-accent` a `--my-secondary` del tema del perfil.
- **Dibujo:** hasta 16 trazos SVG en un `viewBox` de 200 × 200, con línea punteada
  (`stroke-dasharray: 0.01 2.6`, extremos redondeados), lo que genera el efecto de
  partículas de la landing.
- **Usos:** portada o fondo del perfil, alrededor de la foto, vista previa al
  compartir, marco del QR, ícono del perfil, momento de la huella en el onboarding,
  y en el futuro la tarjeta de Wallet.
- El generador es TypeScript puro, sin DOM: funciona en el navegador y en la función
  Edge de `api/og`.

## 9. Estructuras del perfil

Todas comparten los mismos módulos; lo que cambia es la composición.

| Estructura | Para quién (plantilla por defecto) | Composición |
|---|---|---|
| **Credencial** | Personas | Tarjeta de identidad flotante con huella, nombre, estado y QR. Debajo, la acción principal y los módulos flotando. |
| **Portada** | Artistas, creadores, fotógrafos | La primera pantalla completa (`100svh`) es la tapa: huella, foto o video. Abajo, sobre un degradé, nombre, acción principal, "Guardar contacto" y una señal visible de "Más sobre mí". |
| **Editorial** | Profesionales | Nombre enorme en Instrument Serif sobre la huella, texto con aire, secciones con títulos claros. Menos vidrio, más tipografía. |
| **Bento** | Negocios y emprendimientos | Grilla de 2 columnas con bloques de tamaño S, M o L según el módulo. |
| **Clásica** | Quien la prefiera | Foto centrada con la huella orbitando alrededor y botones apilados. |

Reglas comunes:

- La **acción principal** siempre es visible sin hacer scroll (en Portada, dentro de la tapa).
- La señal de "hay más abajo" es obligatoria en Portada (evita la "ilusión de completitud").
- El pie "mycen · Creá tu identidad" aparece en todos los perfiles.
- La verificación (tilde azul) **no se muestra en la V1**: llega con la verificación en la V1.1.

## 10. Componentes base

| Componente | Especificación |
|---|---|
| `GlassPanel` | Vidrio estándar o destacado (`variant="hero"`). |
| `PrimaryAction` | Alto 58–60 px, radio 20, fondo `--my-accent`, texto `--my-on-accent`, peso 600, brillo inferior. |
| `IconButton` | 44 × 44 mínimo, vidrio, `aria-label` obligatorio. |
| `Chip` / `StatusChip` | Pastilla de vidrio; el de estado lleva el punto que late. |
| `MediaCard` | Medios con fachada (ver módulo de video y música). |
| `Field` | `label` real + campo de 46 px, radio 14, fondo `--my-field`. |
| `Sheet` | Hoja deslizable desde abajo en celular, diálogo en computadora. |

Foco visible en todo lo interactivo: `outline: 2px solid var(--my-accent); outline-offset: 2px`.

## 11. Accesibilidad

- Texto normal ≥ 4.5:1 y grande ≥ 3:1 contra el **peor caso** del fondo detrás del
  vidrio (por ejemplo, la zona más brillante de la nebulosa o de la huella).
- Elementos reales: `<button>`, `<a href>`, `<input>` con `<label>`. Nada de `div` clickeables.
- Áreas táctiles ≥ 44 × 44 px.
- La huella es decorativa: `aria-hidden="true"`.
- Los colores que distinguen estados también difieren en luminosidad, no solo en tono.

## 12. Voz y textos

- Oraciones simples, voz activa, en el idioma del usuario. El español es la fuente
  y todo texto nuevo se traduce a los 12 idiomas.
- Los botones dicen exactamente qué pasa: "Enviar mensaje", no "Enviar"; "Publicar
  perfil" y después "Perfil publicado".
- Los errores dicen qué pasó y cómo seguir, sin disculparse ni culpar.
- Un estado vacío es una invitación a actuar.
- En Life OS, nunca culpa: siempre el siguiente paso posible.
- Evitar muletillas visuales repetidas: cadenas de metadatos con "·", flechas "→"
  al final de cada link, etiquetas en mayúsculas encima de cada título.

## 13. Qué evitar

- Colores sueltos fuera de las variables.
- Un mismo radio y una misma sombra para todo.
- Animaciones de entrada en cada sección o transiciones de hover en cada tarjeta.
- Contenedores con scroll interno dentro del perfil (atrapan el gesto en iOS: fue el
  bug del scroll de la landing).
- `touch-action: none` o listeners de `touchmove` con `preventDefault()` en el perfil.
- Imágenes remotas de terceros cargadas sin acción del usuario.
