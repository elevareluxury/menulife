// Genera las plantillas de mail de Supabase Auth en los 12 idiomas (Lanzamiento L3c).
//   node scripts/build-email-templates.mjs  →  supabase/templates/*.html + supabase/templates/asuntos.md
// Cada plantilla elige el idioma con user_metadata.locale (lo guarda el registro y Ajustes); sin locale, español.
// `with` (y no `.Data.locale` directo) para que una cuenta sin metadata no rompa la plantilla.
// Se pegan en Supabase → Authentication → Emails → Templates (ver supabase/templates/LEEME.md).
import { mkdirSync, writeFileSync } from 'node:fs'

const LANGS = ['es', 'en', 'pt', 'fr', 'de', 'it', 'zh', 'ja', 'ko', 'hi', 'ar', 'ru']

/** Textos comunes del pie */
const COMMON = {
  es: { ignore: 'Si no fuiste vos, podés ignorar este mail.', fallback: 'Si el botón no funciona, copiá este link en tu navegador:' },
  en: { ignore: 'If this wasn’t you, you can ignore this email.', fallback: 'If the button doesn’t work, copy this link into your browser:' },
  pt: { ignore: 'Se não foi você, pode ignorar este e-mail.', fallback: 'Se o botão não funcionar, copie este link no seu navegador:' },
  fr: { ignore: 'Si ce n’était pas vous, vous pouvez ignorer cet e-mail.', fallback: 'Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :' },
  de: { ignore: 'Wenn du das nicht warst, kannst du diese E-Mail ignorieren.', fallback: 'Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:' },
  it: { ignore: 'Se non sei stato tu, puoi ignorare questa email.', fallback: 'Se il pulsante non funziona, copia questo link nel browser:' },
  zh: { ignore: '如果这不是你本人的操作，请忽略这封邮件。', fallback: '如果按钮无法使用，请将此链接复制到浏览器中：' },
  ja: { ignore: 'お心当たりがない場合は、このメールを無視してください。', fallback: 'ボタンが使えない場合は、このリンクをブラウザに貼り付けてください：' },
  ko: { ignore: '본인이 요청하지 않았다면 이 메일을 무시하셔도 됩니다.', fallback: '버튼이 작동하지 않으면 이 링크를 브라우저에 붙여 넣으세요:' },
  hi: { ignore: 'अगर यह आपने नहीं किया, तो इस ईमेल को अनदेखा कर दें।', fallback: 'अगर बटन काम न करे, तो यह लिंक अपने ब्राउज़र में कॉपी करें:' },
  ar: { ignore: 'إذا لم تكن أنت، يمكنك تجاهل هذه الرسالة.', fallback: 'إذا لم يعمل الزر، انسخ هذا الرابط في متصفحك:' },
  ru: { ignore: 'Если это были не вы, просто проигнорируйте это письмо.', fallback: 'Если кнопка не работает, скопируйте эту ссылку в браузер:' },
}

/**
 * Tipos de mail. `kind: 'link'` lleva botón con {{ .ConfirmationURL }}; `kind: 'code'` muestra {{ .Token }}.
 * Campos por idioma: subject, title, body, cta (sólo link).
 */
const EMAILS = {
  confirmar_cuenta: { kind: 'link', supabase: 'Confirm signup', text: {
    es: ['Confirmá tu cuenta de Mycen', 'Te damos la bienvenida a Mycen', 'Confirmá tu email para activar tu cuenta y empezar a armar tu identidad.', 'Confirmar mi cuenta'],
    en: ['Confirm your Mycen account', 'Welcome to Mycen', 'Confirm your email to activate your account and start building your identity.', 'Confirm my account'],
    pt: ['Confirme sua conta Mycen', 'Boas-vindas ao Mycen', 'Confirme seu e-mail para ativar sua conta e começar a montar sua identidade.', 'Confirmar minha conta'],
    fr: ['Confirmez votre compte Mycen', 'Bienvenue sur Mycen', 'Confirmez votre e-mail pour activer votre compte et commencer à créer votre identité.', 'Confirmer mon compte'],
    de: ['Bestätige dein Mycen-Konto', 'Willkommen bei Mycen', 'Bestätige deine E-Mail, um dein Konto zu aktivieren und deine Identität aufzubauen.', 'Konto bestätigen'],
    it: ['Conferma il tuo account Mycen', 'Benvenuto su Mycen', 'Conferma la tua email per attivare l’account e iniziare a creare la tua identità.', 'Conferma il mio account'],
    zh: ['确认你的 Mycen 账户', '欢迎来到 Mycen', '请确认你的邮箱以激活账户，开始打造你的数字身份。', '确认我的账户'],
    ja: ['Mycen アカウントの確認', 'Mycen へようこそ', 'メールアドレスを確認してアカウントを有効にし、アイデンティティづくりを始めましょう。', 'アカウントを確認する'],
    ko: ['Mycen 계정을 인증하세요', 'Mycen에 오신 것을 환영합니다', '이메일을 인증해 계정을 활성화하고 나의 아이덴티티를 만들어 보세요.', '계정 인증하기'],
    hi: ['अपने Mycen अकाउंट की पुष्टि करें', 'Mycen में आपका स्वागत है', 'अपना अकाउंट चालू करने और अपनी पहचान बनाना शुरू करने के लिए अपने ईमेल की पुष्टि करें।', 'मेरे अकाउंट की पुष्टि करें'],
    ar: ['أكّد حسابك في Mycen', 'مرحبًا بك في Mycen', 'أكّد بريدك الإلكتروني لتفعيل حسابك والبدء في بناء هويتك.', 'تأكيد حسابي'],
    ru: ['Подтвердите аккаунт Mycen', 'Добро пожаловать в Mycen', 'Подтвердите почту, чтобы активировать аккаунт и начать создавать свою идентичность.', 'Подтвердить аккаунт'],
  } },
  recuperar_contrasena: { kind: 'link', supabase: 'Reset Password', text: {
    es: ['Creá una contraseña nueva para Mycen', 'Recuperá tu contraseña', 'Recibimos un pedido para cambiar la contraseña de tu cuenta. El link vence en 1 hora.', 'Crear contraseña nueva'],
    en: ['Create a new password for Mycen', 'Reset your password', 'We received a request to change your account password. The link expires in 1 hour.', 'Create new password'],
    pt: ['Crie uma nova senha para o Mycen', 'Recupere sua senha', 'Recebemos um pedido para trocar a senha da sua conta. O link expira em 1 hora.', 'Criar nova senha'],
    fr: ['Créez un nouveau mot de passe Mycen', 'Réinitialisez votre mot de passe', 'Nous avons reçu une demande de changement du mot de passe de votre compte. Le lien expire dans 1 heure.', 'Créer un nouveau mot de passe'],
    de: ['Neues Passwort für Mycen erstellen', 'Passwort zurücksetzen', 'Wir haben eine Anfrage erhalten, das Passwort deines Kontos zu ändern. Der Link ist 1 Stunde gültig.', 'Neues Passwort erstellen'],
    it: ['Crea una nuova password per Mycen', 'Recupera la tua password', 'Abbiamo ricevuto una richiesta per cambiare la password del tuo account. Il link scade tra 1 ora.', 'Crea nuova password'],
    zh: ['为 Mycen 设置新密码', '找回你的密码', '我们收到了修改你账户密码的请求。链接 1 小时内有效。', '设置新密码'],
    ja: ['Mycen の新しいパスワードを設定', 'パスワードの再設定', 'アカウントのパスワード変更のリクエストを受け付けました。リンクの有効期限は 1 時間です。', '新しいパスワードを設定する'],
    ko: ['Mycen 새 비밀번호 만들기', '비밀번호 재설정', '계정 비밀번호 변경 요청을 받았습니다. 링크는 1시간 후 만료됩니다.', '새 비밀번호 만들기'],
    hi: ['Mycen के लिए नया पासवर्ड बनाएँ', 'अपना पासवर्ड रीसेट करें', 'हमें आपके अकाउंट का पासवर्ड बदलने का अनुरोध मिला है। लिंक 1 घंटे में समाप्त हो जाएगा।', 'नया पासवर्ड बनाएँ'],
    ar: ['أنشئ كلمة مرور جديدة لـ Mycen', 'استعادة كلمة المرور', 'تلقّينا طلبًا لتغيير كلمة مرور حسابك. تنتهي صلاحية الرابط خلال ساعة واحدة.', 'إنشاء كلمة مرور جديدة'],
    ru: ['Создайте новый пароль для Mycen', 'Восстановление пароля', 'Мы получили запрос на смену пароля вашего аккаунта. Ссылка действует 1 час.', 'Создать новый пароль'],
  } },
  enlace_magico: { kind: 'link', supabase: 'Magic Link', text: {
    es: ['Tu link para entrar a Mycen', 'Entrá a Mycen', 'Tocá el botón para iniciar sesión. El link sirve una sola vez.', 'Iniciar sesión'],
    en: ['Your link to log in to Mycen', 'Log in to Mycen', 'Tap the button to log in. The link works only once.', 'Log in'],
    pt: ['Seu link para entrar no Mycen', 'Entre no Mycen', 'Toque no botão para entrar. O link funciona uma única vez.', 'Entrar'],
    fr: ['Votre lien de connexion à Mycen', 'Connectez-vous à Mycen', 'Touchez le bouton pour vous connecter. Le lien ne fonctionne qu’une fois.', 'Se connecter'],
    de: ['Dein Anmeldelink für Mycen', 'Bei Mycen anmelden', 'Tippe auf den Button, um dich anzumelden. Der Link funktioniert nur einmal.', 'Anmelden'],
    it: ['Il tuo link per accedere a Mycen', 'Accedi a Mycen', 'Tocca il pulsante per accedere. Il link funziona una sola volta.', 'Accedi'],
    zh: ['你的 Mycen 登录链接', '登录 Mycen', '点击按钮即可登录。链接只能使用一次。', '登录'],
    ja: ['Mycen のログイン用リンク', 'Mycen にログイン', 'ボタンをタップしてログインしてください。リンクは 1 回だけ使えます。', 'ログイン'],
    ko: ['Mycen 로그인 링크', 'Mycen에 로그인', '버튼을 눌러 로그인하세요. 링크는 한 번만 사용할 수 있습니다.', '로그인'],
    hi: ['Mycen में लॉग इन करने का आपका लिंक', 'Mycen में लॉग इन करें', 'लॉग इन करने के लिए बटन दबाएँ। यह लिंक सिर्फ़ एक बार काम करता है।', 'लॉग इन'],
    ar: ['رابط تسجيل الدخول إلى Mycen', 'سجّل الدخول إلى Mycen', 'اضغط الزر لتسجيل الدخول. يعمل الرابط مرة واحدة فقط.', 'تسجيل الدخول'],
    ru: ['Ваша ссылка для входа в Mycen', 'Вход в Mycen', 'Нажмите кнопку, чтобы войти. Ссылка работает только один раз.', 'Войти'],
  } },
  cambio_de_email: { kind: 'link', supabase: 'Change Email Address', text: {
    es: ['Confirmá tu nuevo email en Mycen', 'Confirmá el cambio de email', 'Pediste cambiar el email de tu cuenta de {{ .Email }} a {{ .NewEmail }}. Confirmalo con el botón.', 'Confirmar nuevo email'],
    en: ['Confirm your new email on Mycen', 'Confirm your email change', 'You asked to change your account email from {{ .Email }} to {{ .NewEmail }}. Confirm it with the button.', 'Confirm new email'],
    pt: ['Confirme seu novo e-mail no Mycen', 'Confirme a troca de e-mail', 'Você pediu para trocar o e-mail da sua conta de {{ .Email }} para {{ .NewEmail }}. Confirme pelo botão.', 'Confirmar novo e-mail'],
    fr: ['Confirmez votre nouvel e-mail sur Mycen', 'Confirmez le changement d’e-mail', 'Vous avez demandé à changer l’e-mail de votre compte de {{ .Email }} à {{ .NewEmail }}. Confirmez avec le bouton.', 'Confirmer le nouvel e-mail'],
    de: ['Bestätige deine neue E-Mail bei Mycen', 'E-Mail-Änderung bestätigen', 'Du möchtest die E-Mail deines Kontos von {{ .Email }} auf {{ .NewEmail }} ändern. Bestätige es mit dem Button.', 'Neue E-Mail bestätigen'],
    it: ['Conferma la tua nuova email su Mycen', 'Conferma il cambio di email', 'Hai chiesto di cambiare l’email del tuo account da {{ .Email }} a {{ .NewEmail }}. Confermalo con il pulsante.', 'Conferma nuova email'],
    zh: ['确认你在 Mycen 的新邮箱', '确认更换邮箱', '你申请将账户邮箱从 {{ .Email }} 更换为 {{ .NewEmail }}。请点击按钮确认。', '确认新邮箱'],
    ja: ['Mycen の新しいメールアドレスの確認', 'メールアドレス変更の確認', 'アカウントのメールアドレスを {{ .Email }} から {{ .NewEmail }} に変更するリクエストを受け付けました。ボタンから確認してください。', '新しいメールアドレスを確認する'],
    ko: ['Mycen 새 이메일 인증', '이메일 변경 확인', '계정 이메일을 {{ .Email }}에서 {{ .NewEmail }}(으)로 변경하도록 요청하셨습니다. 버튼을 눌러 확인하세요.', '새 이메일 인증하기'],
    hi: ['Mycen पर अपने नए ईमेल की पुष्टि करें', 'ईमेल बदलने की पुष्टि करें', 'आपने अपने अकाउंट का ईमेल {{ .Email }} से {{ .NewEmail }} में बदलने का अनुरोध किया है। बटन से पुष्टि करें।', 'नए ईमेल की पुष्टि करें'],
    ar: ['أكّد بريدك الجديد في Mycen', 'أكّد تغيير البريد الإلكتروني', 'طلبت تغيير بريد حسابك من {{ .Email }} إلى {{ .NewEmail }}. أكّد ذلك بالزر.', 'تأكيد البريد الجديد'],
    ru: ['Подтвердите новую почту в Mycen', 'Подтвердите смену почты', 'Вы запросили смену почты аккаунта с {{ .Email }} на {{ .NewEmail }}. Подтвердите кнопкой.', 'Подтвердить новую почту'],
  } },
  reautenticacion: { kind: 'code', supabase: 'Reauthentication', text: {
    es: ['Tu código de verificación de Mycen', 'Confirmá que sos vos', 'Usá este código para continuar. Vence en unos minutos.'],
    en: ['Your Mycen verification code', 'Confirm it’s you', 'Use this code to continue. It expires in a few minutes.'],
    pt: ['Seu código de verificação do Mycen', 'Confirme que é você', 'Use este código para continuar. Ele expira em poucos minutos.'],
    fr: ['Votre code de vérification Mycen', 'Confirmez que c’est bien vous', 'Utilisez ce code pour continuer. Il expire dans quelques minutes.'],
    de: ['Dein Mycen-Bestätigungscode', 'Bestätige, dass du es bist', 'Verwende diesen Code, um fortzufahren. Er läuft in wenigen Minuten ab.'],
    it: ['Il tuo codice di verifica Mycen', 'Conferma che sei tu', 'Usa questo codice per continuare. Scade tra pochi minuti.'],
    zh: ['你的 Mycen 验证码', '确认是你本人', '请使用此验证码继续。几分钟后失效。'],
    ja: ['Mycen の確認コード', 'ご本人確認', 'このコードを入力して続けてください。数分で期限が切れます。'],
    ko: ['Mycen 인증 코드', '본인 확인', '이 코드를 입력해 계속하세요. 몇 분 후 만료됩니다.'],
    hi: ['आपका Mycen सत्यापन कोड', 'पुष्टि करें कि यह आप हैं', 'आगे बढ़ने के लिए यह कोड इस्तेमाल करें। यह कुछ मिनटों में समाप्त हो जाएगा।'],
    ar: ['رمز التحقق من Mycen', 'أكّد أنه أنت', 'استخدم هذا الرمز للمتابعة. تنتهي صلاحيته خلال دقائق.'],
    ru: ['Ваш код подтверждения Mycen', 'Подтвердите, что это вы', 'Введите этот код, чтобы продолжить. Он действует несколько минут.'],
  } },
}

/** Paleta Amanecer (sistema de diseño §3): fondo claro, que se ve bien en todos los clientes de correo */
const C = {
  bg: '#FBF4EE', card: '#FFFFFF', border: '#EADFD6', text: '#1A1530', muted: '#4E4866', subtle: '#6B6580',
  accent: '#C8431F', onAccent: '#FFFFFF',
}
/** La huella de Mycen como PNG (los clientes de correo no muestran SVG). Se genera con scripts/landing-shots/brand.spec.ts */
const HUELLA = 'https://mycen.id/email/huella.png'

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
// Las variables de Supabase ({{ .Email }}) se dejan tal cual dentro del texto ya escapado
const html = s => esc(s).replace(/\{\{ \.(\w+) \}\}/g, '{{ .$1 }}')

/** Cadena if / else if por idioma. El español va en el `else` (también para cuentas sin locale). */
function byLang(render) {
  const others = LANGS.filter(l => l !== 'es')
  return others.map((l, i) => `{{ ${i === 0 ? 'if' : 'else if'} eq $l "${l}" }}${render(l)}`).join('')
    + `{{ else }}${render('es')}{{ end }}`
}

function body(email, l) {
  const [, title, text, cta] = email.text[l]
  const c = COMMON[l]
  const action = email.kind === 'link'
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0"><tr><td style="border-radius:999px;background:${C.accent}"><a href="{{ .ConfirmationURL }}" style="display:inline-block;background:${C.accent};color:${C.onAccent};text-decoration:none;font-weight:600;font-size:15px;padding:13px 26px;border-radius:999px">${html(cta)}</a></td></tr></table>
<p style="margin:0 0 6px;font-size:13px;color:${C.muted}">${html(c.fallback)}</p>
<p style="margin:0;font-size:13px;word-break:break-all"><a href="{{ .ConfirmationURL }}" style="color:${C.accent}">{{ .ConfirmationURL }}</a></p>`
    : `<p style="margin:28px 0;font-size:32px;font-weight:700;letter-spacing:6px;color:${C.text}" dir="ltr">{{ .Token }}</p>`
  return `
<h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:${C.text}">${html(title)}</h1>
<p style="margin:0;font-size:15px;line-height:1.6;color:${C.muted}">${html(text)}</p>
${action}
<p style="margin:28px 0 0;font-size:12px;color:${C.subtle}">${html(c.ignore)}</p>
`
}

function template(name, email) {
  return `{{/* Mycen — ${email.supabase} (${name}). Generado por scripts/build-email-templates.mjs: editar allá, no acá. */}}
{{ $l := "es" }}{{ with .Data }}{{ with .locale }}{{ $l = . }}{{ end }}{{ end }}<!doctype html>
<html lang="{{ $l }}" dir="{{ if eq $l "ar" }}rtl{{ else }}ltr{{ end }}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"></head>
<body style="margin:0;padding:0;background:${C.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Noto Sans','Helvetica Neue',Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:${C.card};border:1px solid ${C.border};border-radius:20px;padding:32px;text-align:start">
<tr><td style="padding-bottom:20px"><table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="padding-inline-end:10px;vertical-align:middle"><img src="${HUELLA}" width="40" height="40" alt="" style="display:block;border:0;width:40px;height:40px"></td>
<td style="vertical-align:middle;font-size:20px;font-weight:800;letter-spacing:-0.02em;color:${C.text}">Mycen</td>
</tr></table></td></tr>
<tr><td>${byLang(l => body(email, l))}</td></tr>
</table>
<p style="margin:16px 0 0;font-size:12px;color:${C.subtle}">Mycen · <a href="https://mycen.id" style="color:${C.subtle}">mycen.id</a></p>
</td></tr></table>
</body>
</html>
`
}

/** Supabase no acepta asuntos de más de 255 caracteres (se usa 250 por las dudas) */
const SUBJECT_MAX = 250  // con un margen
/** Idiomas del asunto por prioridad: español (sin locale), inglés (los que no entran) y después los demás */
const SUBJECT_ORDER = ['es', 'en', 'pt', 'fr', 'it', 'de', 'ru', 'ar', 'hi', 'zh', 'ja', 'ko']

/**
 * Asunto con la misma regla de idioma que el cuerpo (Supabase también lo procesa como plantilla), pero compacto: entra
 * cada idioma que quepa en 255 caracteres, en el orden de SUBJECT_ORDER; los que no entran reciben el asunto en inglés.
 * El cuerpo del mail sigue en los 12 idiomas.
 */
function subject(email) {
  const head = '{{$l := "es"}}{{with .Data}}{{with .locale}}{{$l = .}}{{end}}{{end}}'
  const build = langs => head + langs.map((l, i) => `{{${i ? 'else if' : 'if'} eq $l "${l}"}}${email.text[l][0]}`).join('')
    + `{{else}}${email.text.en[0]}{{end}}`
  // Español siempre (es el valor sin locale); el inglés va en el {{else}}
  let langs = ['es']
  for (const l of SUBJECT_ORDER.slice(2)) if (build([...langs, l]).length <= SUBJECT_MAX) langs = [...langs, l]
  return build(langs)
}

const OUT = process.env.OUT_DIR || 'supabase/templates'
mkdirSync(OUT, { recursive: true })
const subjects = ['# Asuntos de los mails (Supabase → Authentication → Emails → Templates → Subject)', '',
  'Generado por `scripts/build-email-templates.mjs`. Pegar cada línea en el campo "Subject" de su plantilla.',
  'Supabase acepta hasta 255 caracteres: cada asunto lleva los idiomas que entran (español, inglés y los que alcancen);',
  'el resto recibe el asunto en inglés. El cuerpo del mail sí está en los 12 idiomas.', '']
for (const [name, email] of Object.entries(EMAILS)) {
  for (const l of LANGS) if (!email.text[l]) throw new Error(`${name}: falta ${l}`)
  writeFileSync(`${OUT}/${name}.html`, template(name, email))
  subjects.push(`## ${email.supabase} → \`${name}.html\``, '', '```', subject(email), '```', '')
}
writeFileSync(`${OUT}/asuntos.md`, subjects.join('\n'))
console.log(`✓ ${Object.keys(EMAILS).length} plantillas × ${LANGS.length} idiomas en ${OUT}/`)
