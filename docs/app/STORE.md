# Fichas de las tiendas (App Store y Google Play)

Nombre: **Mycen** · Categoría principal: **Productividad** (secundaria: Estilo de vida) · Edad: 4+ / Para todos.
Sitio: https://mycen.id · Soporte y privacidad: https://mycen.id/privacidad · Contacto: team@mycen.id.
Precio: gratis, sin compras dentro de la app (nada de precios ni planes adentro de la app).

Límites: subtítulo de Apple ≤ 30 caracteres · descripción corta de Google ≤ 80 · palabras clave de Apple ≤ 100.

| Idioma | Subtítulo (Apple) | Descripción corta (Google) |
|---|---|---|
| es | Tu identidad y tu día | Tu página personal y tu día ordenado: hábitos, tareas, metas y dinero. |
| en | Your identity and your day | Your personal page and your day in order: habits, tasks, goals and money. |
| pt | Sua identidade e seu dia | Sua página pessoal e seu dia em ordem: hábitos, tarefas, metas e dinheiro. |
| fr | Ton identité et ta journée | Ta page perso et ta journée en ordre : habitudes, tâches, objectifs, budget. |
| de | Deine Identität, dein Tag | Deine Seite und dein Tag im Griff: Gewohnheiten, Aufgaben, Ziele, Geld. |
| it | La tua identità, la tua giornata | La tua pagina e la tua giornata in ordine: abitudini, attività, obiettivi. |
| zh | 你的身份与你的一天 | 你的个人主页与井井有条的一天：习惯、任务、目标和收支。 |
| ja | あなたのページと一日 | 自分のページと整った一日：習慣、タスク、目標、お金。 |
| ko | 나의 아이덴티티와 하루 | 나만의 페이지와 정돈된 하루: 습관, 할 일, 목표, 돈. |
| hi | आपकी पहचान, आपका दिन | आपका पेज और व्यवस्थित दिन: आदतें, काम, लक्ष्य और पैसा। |
| ar | هويتك ويومك | صفحتك الشخصية ويومك المنظّم: عادات ومهام وأهداف ومال. |
| ru | Твой профиль и твой день | Твоя страница и упорядоченный день: привычки, задачи, цели и деньги. |

## Descripción (es, fuente; traducir con el mismo tono para los otros 11)
Mycen junta dos cosas en una sola app.

**Tu Mycen:** una página propia en mycen.id/tu-nombre con tus links, redes, proyectos, música, videos, formulario de
contacto y más. Elegí entre 5 estructuras, dos temas y tu huella única. Compartila con un QR o un link.

**Life OS, tu día:** tus 3 prioridades, hábitos que perdonan un día perdido, tareas con recordatorios, metas con
pasos, un diario privado y tu dinero por moneda, con presupuestos amables. Todo sin culpa y sin anuncios.

En 12 idiomas. Tus datos son tuyos: los exportás o los borrás cuando quieras.

Palabras clave (es): `link en bio,perfil,hábitos,tareas,metas,diario,presupuesto,gastos,productividad,qr`

## Privacidad (App Store "Privacy Nutrition Label" y Google "Seguridad de los datos")
- **Rastreo entre apps:** no. Sin publicidad ni SDKs de terceros.
- **Datos vinculados a la persona (para que la app funcione):** nombre, email, foto, contenido que carga (perfil,
  tareas, hábitos, metas, diario, movimientos), identificador de cuenta.
- **Uso de la app (analítica propia, vinculado a la cuenta):** eventos de producto sin contenido (`product_events`).
- **Diagnóstico (no vinculado):** errores de la app con un hash diario anónimo (`app_errors`).
- **Cifrado en tránsito:** sí (HTTPS). **Borrar la cuenta desde la app:** sí (Studio → Ajustes y Life OS → Ajustes →
  Cuenta, así llega también quien usa sólo Life OS).
- El manifiesto `ios/App/App/PrivacyInfo.xcprivacy` declara lo mismo (nombre, email, fotos, contenido, información
  financiera de Dinero, id de cuenta, uso de la app y errores no vinculados); si cambia esta lista, cambiarlo también.
- Export compliance: sólo cifrado estándar (`ITSAppUsesNonExemptEncryption = false` ya está en Info.plist).

## Revisión de Apple: notas para el revisor
- Cuenta de prueba: crear una con email (sin datos reales) y ponerla en "App Review Information".
- "La app no cobra nada; los módulos Apoyame/Mercado Pago son links del dueño del perfil a sus propios medios."
- "Entrar con Apple" está junto a "Continuar con Google" (guía 4.8). Mientras `appleSignIn` esté apagado, la app de
  iPhone no muestra Google (`oauthProviders()` en `googleSignIn.ts`): se entra con email.
