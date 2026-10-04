# Asuntos de los mails (Supabase → Authentication → Emails → Templates → Subject)

Generado por `scripts/build-email-templates.mjs`. Pegar cada línea en el campo "Subject" de su plantilla.

## Confirm signup → `confirmar_cuenta.html`

```
{{ $l := "es" }}{{ with .Data }}{{ with .locale }}{{ $l = . }}{{ end }}{{ end }}{{ if eq $l "en" }}Confirm your Mycen account{{ else if eq $l "pt" }}Confirme sua conta Mycen{{ else if eq $l "fr" }}Confirmez votre compte Mycen{{ else if eq $l "de" }}Bestätige dein Mycen-Konto{{ else if eq $l "it" }}Conferma il tuo account Mycen{{ else if eq $l "zh" }}确认你的 Mycen 账户{{ else if eq $l "ja" }}Mycen アカウントの確認{{ else if eq $l "ko" }}Mycen 계정을 인증하세요{{ else if eq $l "hi" }}अपने Mycen अकाउंट की पुष्टि करें{{ else if eq $l "ar" }}أكّد حسابك في Mycen{{ else if eq $l "ru" }}Подтвердите аккаунт Mycen{{ else }}Confirmá tu cuenta de Mycen{{ end }}
```

## Reset Password → `recuperar_contrasena.html`

```
{{ $l := "es" }}{{ with .Data }}{{ with .locale }}{{ $l = . }}{{ end }}{{ end }}{{ if eq $l "en" }}Create a new password for Mycen{{ else if eq $l "pt" }}Crie uma nova senha para o Mycen{{ else if eq $l "fr" }}Créez un nouveau mot de passe Mycen{{ else if eq $l "de" }}Neues Passwort für Mycen erstellen{{ else if eq $l "it" }}Crea una nuova password per Mycen{{ else if eq $l "zh" }}为 Mycen 设置新密码{{ else if eq $l "ja" }}Mycen の新しいパスワードを設定{{ else if eq $l "ko" }}Mycen 새 비밀번호 만들기{{ else if eq $l "hi" }}Mycen के लिए नया पासवर्ड बनाएँ{{ else if eq $l "ar" }}أنشئ كلمة مرور جديدة لـ Mycen{{ else if eq $l "ru" }}Создайте новый пароль для Mycen{{ else }}Creá una contraseña nueva para Mycen{{ end }}
```

## Magic Link → `enlace_magico.html`

```
{{ $l := "es" }}{{ with .Data }}{{ with .locale }}{{ $l = . }}{{ end }}{{ end }}{{ if eq $l "en" }}Your link to log in to Mycen{{ else if eq $l "pt" }}Seu link para entrar no Mycen{{ else if eq $l "fr" }}Votre lien de connexion à Mycen{{ else if eq $l "de" }}Dein Anmeldelink für Mycen{{ else if eq $l "it" }}Il tuo link per accedere a Mycen{{ else if eq $l "zh" }}你的 Mycen 登录链接{{ else if eq $l "ja" }}Mycen のログイン用リンク{{ else if eq $l "ko" }}Mycen 로그인 링크{{ else if eq $l "hi" }}Mycen में लॉग इन करने का आपका लिंक{{ else if eq $l "ar" }}رابط تسجيل الدخول إلى Mycen{{ else if eq $l "ru" }}Ваша ссылка для входа в Mycen{{ else }}Tu link para entrar a Mycen{{ end }}
```

## Change Email Address → `cambio_de_email.html`

```
{{ $l := "es" }}{{ with .Data }}{{ with .locale }}{{ $l = . }}{{ end }}{{ end }}{{ if eq $l "en" }}Confirm your new email on Mycen{{ else if eq $l "pt" }}Confirme seu novo e-mail no Mycen{{ else if eq $l "fr" }}Confirmez votre nouvel e-mail sur Mycen{{ else if eq $l "de" }}Bestätige deine neue E-Mail bei Mycen{{ else if eq $l "it" }}Conferma la tua nuova email su Mycen{{ else if eq $l "zh" }}确认你在 Mycen 的新邮箱{{ else if eq $l "ja" }}Mycen の新しいメールアドレスの確認{{ else if eq $l "ko" }}Mycen 새 이메일 인증{{ else if eq $l "hi" }}Mycen पर अपने नए ईमेल की पुष्टि करें{{ else if eq $l "ar" }}أكّد بريدك الجديد في Mycen{{ else if eq $l "ru" }}Подтвердите новую почту в Mycen{{ else }}Confirmá tu nuevo email en Mycen{{ end }}
```

## Reauthentication → `reautenticacion.html`

```
{{ $l := "es" }}{{ with .Data }}{{ with .locale }}{{ $l = . }}{{ end }}{{ end }}{{ if eq $l "en" }}Your Mycen verification code{{ else if eq $l "pt" }}Seu código de verificação do Mycen{{ else if eq $l "fr" }}Votre code de vérification Mycen{{ else if eq $l "de" }}Dein Mycen-Bestätigungscode{{ else if eq $l "it" }}Il tuo codice di verifica Mycen{{ else if eq $l "zh" }}你的 Mycen 验证码{{ else if eq $l "ja" }}Mycen の確認コード{{ else if eq $l "ko" }}Mycen 인증 코드{{ else if eq $l "hi" }}आपका Mycen सत्यापन कोड{{ else if eq $l "ar" }}رمز التحقق من Mycen{{ else if eq $l "ru" }}Ваш код подтверждения Mycen{{ else }}Tu código de verificación de Mycen{{ end }}
```
