import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { pathFromAppUrl } from '@/lib/appLinks'
import { nativePlatform } from '@/lib/platform'
import { textZoomFor } from '@/lib/textZoom'

// Sólo en la app de iOS/Android (App.tsx lo carga aparte, la web no lo baja):
// - un link de mycen.id que abre la app (vuelta de Google, confirmar email, recuperar contraseña, un perfil) navega a
//   esa pantalla adentro de la app y cierra el navegador del sistema si estaba abierto;
// - el botón "atrás" de Android vuelve atrás y, en la primera pantalla, minimiza la app;
// - tocar un recordatorio abre su pantalla;
// - la barra de estado sigue el tema del celular y la pantalla de carga nativa se va cuando la app ya dibujó;
// - el texto sigue el tamaño de letra elegido en el celular (lib/textZoom, con tope) y se vuelve a leer al volver a la app;
// - <html data-native> apaga la selección de texto y el menú de "copiar" al mantener apretado un botón (index.css).

export default function NativeBridge() {
  const navigate = useNavigate()

  useEffect(() => {
    document.documentElement.dataset.native = nativePlatform()
    let cancelled = false
    const removers: Array<() => void> = []
    ;(async () => {
      const [{ App }, { Browser }, { StatusBar, Style }, { SplashScreen }] = await Promise.all([
        import('@capacitor/app'), import('@capacitor/browser'), import('@capacitor/status-bar'), import('@capacitor/splash-screen'),
      ])
      if (cancelled) return
      const open = await App.addListener('appUrlOpen', ({ url }) => {
        const path = pathFromAppUrl(url)
        if (!path) return
        void Browser.close().catch(() => undefined)
        navigate(path)
      })
      // Tamaño de letra del sistema (se lee otra vez al volver: la persona pudo cambiarlo mientras tanto)
      const { TextZoom } = await import('@capacitor/text-zoom')
      const zoom = () => void TextZoom.getPreferred()
        .then(({ value }) => TextZoom.set({ value: textZoomFor(value) }))
        .catch(() => undefined)
      zoom()
      const resume = await App.addListener('resume', zoom)
      removers.push(() => void resume.remove())
      const back = await App.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack) window.history.back()
        else void App.minimizeApp()
      })
      // Tocar un recordatorio (lib/nativeReminders) abre su pantalla
      const { LocalNotifications } = await import('@capacitor/local-notifications')
      const tap = await LocalNotifications.addListener('localNotificationActionPerformed', ({ notification }) => {
        const path = (notification.extra as { path?: string } | undefined)?.path
        if (path?.startsWith('/')) navigate(path)
      })
      removers.push(() => void open.remove(), () => void back.remove(), () => void tap.remove())

      const dark = window.matchMedia('(prefers-color-scheme: dark)')
      const paint = () => void StatusBar.setStyle({ style: dark.matches ? Style.Dark : Style.Light }).catch(() => undefined)
      paint()
      dark.addEventListener('change', paint)
      removers.push(() => dark.removeEventListener('change', paint))
      void SplashScreen.hide().catch(() => undefined)
    })().catch(() => { /* sin un plugin nativo: la app sigue funcionando sin ese extra */ })
    return () => { cancelled = true; removers.forEach(r => r()) }
  }, [navigate])

  return null
}
