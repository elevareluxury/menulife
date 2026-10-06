import { Component, type ErrorInfo, type ReactNode } from 'react'
import { reportError, type ErrorArea } from '@/lib/errorReporter'
import { useAppLang } from '@/i18n/app/store'
import type { AppLang } from '@/i18n/app/languages'

// Texto de la pantalla de error en los 12 idiomas (acá no hay diccionario cargado: tiene que andar siempre)
const TEXT: Record<AppLang, [title: string, body: string, reload: string]> = {
  es: ['Algo salió mal', 'Ya nos llegó el aviso. Recargá la página para seguir.', 'Recargar'],
  en: ['Something went wrong', 'We’ve been notified. Reload the page to continue.', 'Reload'],
  pt: ['Algo deu errado', 'Já fomos avisados. Recarregue a página para continuar.', 'Recarregar'],
  fr: ['Un problème est survenu', 'Nous avons été prévenus. Rechargez la page pour continuer.', 'Recharger'],
  de: ['Etwas ist schiefgelaufen', 'Wir wurden benachrichtigt. Lade die Seite neu, um weiterzumachen.', 'Neu laden'],
  it: ['Qualcosa è andato storto', 'Abbiamo ricevuto la segnalazione. Ricarica la pagina per continuare.', 'Ricarica'],
  zh: ['出了点问题', '我们已收到通知。请刷新页面继续。', '刷新'],
  ja: ['問題が発生しました', 'エラーは報告されました。ページを再読み込みして続けてください。', '再読み込み'],
  ko: ['문제가 발생했습니다', '오류가 전달되었습니다. 페이지를 새로고침해 계속하세요.', '새로고침'],
  hi: ['कुछ गड़बड़ हो गई', 'हमें सूचना मिल गई है। जारी रखने के लिए पेज रीलोड करें।', 'रीलोड करें'],
  ar: ['حدث خطأ ما', 'وصلنا إشعار بالخطأ. أعد تحميل الصفحة للمتابعة.', 'إعادة التحميل'],
  ru: ['Что-то пошло не так', 'Мы уже получили уведомление. Перезагрузите страницу, чтобы продолжить.', 'Перезагрузить'],
}

class ErrorBoundary extends Component<
  { children: ReactNode; label?: string; area?: ErrorArea },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError(error, { area: this.props.area, componentStack: info.componentStack ?? undefined })
  }

  render() {
    if (!this.state.hasError) return this.props.children
    const [title, body, reload] = TEXT[useAppLang.getState().lang] ?? TEXT.es
    return (
      <div role="alert" style={{
        minHeight: '100vh', background: '#06080F', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '24px', color: 'white',
        fontFamily: 'Geist, sans-serif', textAlign: 'center',
      }}>
        <h1 style={{ fontSize: '24px', marginBottom: '12px' }}>{title}</h1>
        <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.75)', marginBottom: '20px', maxWidth: 420 }}>{body}</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '11px 22px', borderRadius: '10px', background: '#C8442F', color: '#fff',
            fontSize: '15px', fontWeight: 600, border: 'none', cursor: 'pointer',
          }}
        >
          {reload}
        </button>
        {/* El detalle técnico sólo en desarrollo: en producción lo ve el super-admin en /super-admin/errores */}
        {import.meta.env.DEV && this.state.error && (
          <pre style={{
            marginTop: 24, background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '8px',
            fontSize: '11px', color: '#EF4444', maxWidth: '100%', overflow: 'auto', whiteSpace: 'pre-wrap', textAlign: 'start',
          }}>
            {this.state.error.message}{'\n'}{this.state.error.stack}
          </pre>
        )}
      </div>
    )
  }
}

export default ErrorBoundary
