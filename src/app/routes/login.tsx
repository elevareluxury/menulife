import { Link, useSearchParams } from 'react-router-dom'
import { LoginForm } from '@/modules/auth/components/LoginForm'
import { LanguageSelect } from '@/components/ui/LanguageSelect'
import { useAuthT } from '@/i18n/app/auth'
import { useLangDir } from '@/i18n/app/useLangDir'

// Avisos que llegan por la URL desde otros pasos (códigos, no texto: así se muestran en el idioma de la persona)
const MESSAGES = { password_updated: 'passwordUpdated' } as const

export function LoginPage() {
  const t = useAuthT()
  useLangDir()
  const [params] = useSearchParams()
  const code = params.get('message')
  const message = code && code in MESSAGES ? t.login[MESSAGES[code as keyof typeof MESSAGES]]
    : params.get('error') ? t.login.linkInvalid : null

  return (
    <div style={{
      minHeight: '100vh', background: '#0F1115',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', position: 'relative', overflow: 'hidden',
    }}>
      {/* Bottom ambient glow */}
      <div style={{
        position: 'fixed', bottom: '-180px', left: '50%', transform: 'translateX(-50%)',
        width: '700px', height: '360px', borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(244,112,90,0.11) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      <div style={{
        width: '100%', maxWidth: '420px',
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '24px', padding: '40px 36px',
        backdropFilter: 'blur(20px)',
        position: 'relative', zIndex: 1,
        animation: 'ml-fade-up 0.45s ease-out both',
      }}>
        <div style={{ position: 'absolute', top: '16px', insetInlineEnd: '16px' }}>
          <LanguageSelect label={t.common.language} />
        </div>

        {/* Logo + title */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none', marginBottom: '16px' }}>
            <img src="/logo.png" alt="Mycen" className="h-8 w-auto" />
          </Link>
          <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '14px', color: 'rgba(255,255,255,0.7)', margin: 0 }}>
            {t.login.subtitle}
          </p>
        </div>

        {/* Message from password reset flow */}
        {message && (
          <div style={{
            padding: '11px 14px', borderRadius: '10px',
            background: 'rgba(244,112,90,0.08)', border: '1px solid rgba(244,112,90,0.2)',
            marginBottom: '20px',
            fontFamily: 'var(--font-jakarta)', fontSize: '13px', color: 'rgba(255,255,255,0.65)',
            lineHeight: 1.5,
          }}>
            {message}
          </div>
        )}

        <LoginForm />

        <p style={{ marginTop: '24px', textAlign: 'center', fontFamily: 'var(--font-jakarta)', fontSize: '13px', color: 'rgba(255,255,255,0.65)' }}>
          {t.login.newHere}{' '}
          <Link to="/register" style={{ color: 'var(--ml-salmon)', fontWeight: 600, textDecoration: 'none' }}>
            {t.login.createFree}
          </Link>
        </p>

        <div style={{ marginTop: '18px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '11px', color: 'rgba(255,255,255,0.55)', margin: 0 }}>
            {t.login.team}{' '}
            <Link to="/super-admin" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'underline' }}>
              {t.login.adminAccess}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
