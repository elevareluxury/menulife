# Asuntos de los mails (Supabase → Authentication → Emails → Templates → Subject)

Generado por `scripts/build-email-templates.mjs`. Pegar cada línea en el campo "Subject" de su plantilla.
Supabase acepta hasta 255 caracteres: cada asunto lleva los idiomas que entran (español, inglés y los que alcancen);
el resto recibe el asunto en inglés. El cuerpo del mail sí está en los 12 idiomas.

## Confirm signup → `confirmar_cuenta.html`

```
{{$l := "es"}}{{with .Data}}{{with .locale}}{{$l = .}}{{end}}{{end}}{{if eq $l "es"}}Confirmá tu cuenta de Mycen{{else if eq $l "pt"}}Confirme sua conta Mycen{{else if eq $l "fr"}}Confirmez votre compte Mycen{{else}}Confirm your Mycen account{{end}}
```

## Reset Password → `recuperar_contrasena.html`

```
{{$l := "es"}}{{with .Data}}{{with .locale}}{{$l = .}}{{end}}{{end}}{{if eq $l "es"}}Creá una contraseña nueva para Mycen{{else if eq $l "pt"}}Crie uma nova senha para o Mycen{{else}}Create a new password for Mycen{{end}}
```

## Magic Link → `enlace_magico.html`

```
{{$l := "es"}}{{with .Data}}{{with .locale}}{{$l = .}}{{end}}{{end}}{{if eq $l "es"}}Tu link para entrar a Mycen{{else if eq $l "pt"}}Seu link para entrar no Mycen{{else if eq $l "zh"}}你的 Mycen 登录链接{{else}}Your link to log in to Mycen{{end}}
```

## Change Email Address → `cambio_de_email.html`

```
{{$l := "es"}}{{with .Data}}{{with .locale}}{{$l = .}}{{end}}{{end}}{{if eq $l "es"}}Confirmá tu nuevo email en Mycen{{else if eq $l "pt"}}Confirme seu novo e-mail no Mycen{{else}}Confirm your new email on Mycen{{end}}
```

## Reauthentication → `reautenticacion.html`

```
{{$l := "es"}}{{with .Data}}{{with .locale}}{{$l = .}}{{end}}{{end}}{{if eq $l "es"}}Tu código de verificación de Mycen{{else if eq $l "pt"}}Seu código de verificação do Mycen{{else}}Your Mycen verification code{{end}}
```
