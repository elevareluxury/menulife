import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useOfflineT } from '@/i18n/app/offline'
import { useAppLang } from '@/i18n/app/store'
import { langDir } from '@/i18n/app/languages'

/** Aviso general de "sin conexión" arriba de todo (en el idioma de quien mira). */
export function OfflineBanner() {
  const t = useOfflineT()
  const { isOnline } = useOnlineStatus(t.back)
  const dir = langDir(useAppLang(s => s.lang))

  if (isOnline) return null

  return (
    <div role="status" dir={dir}
      className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-black text-center"
      style={{
        backgroundColor: '#F59E0B',
        paddingTop: 'calc(env(safe-area-inset-top) + 10px)',
        animation: 'slideDown 0.25s ease-out',
      }}
    >
      <span aria-hidden="true">📡</span>
      <span>{t.offline}</span>
      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to   { transform: translateY(0);     opacity: 1; }
        }
      `}</style>
    </div>
  )
}
