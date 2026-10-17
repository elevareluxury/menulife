import type { CapacitorConfig } from '@capacitor/cli'

// App de Mycen para iOS y Android: la misma web (dist/) adentro de una app nativa. Se arma con `npm run app:sync`
// (build + copia a ios/ y android/) y se abre en Xcode / Android Studio con `npx cap open ios|android`.
// La app se construye siempre desde la rama release/v1 (docs/v1/RELEASE.md). Pasos completos: docs/app/README.md.
const config: CapacitorConfig = {
  appId: 'id.mycen.app',
  appName: 'Mycen',
  webDir: 'dist',
  server: {
    // https://localhost en Android (cookies y almacenamiento como en la web)
    androidScheme: 'https',
  },
  ios: {
    // El contenido llega hasta los bordes; la app ya respeta las zonas seguras (env(safe-area-inset-*))
    contentInset: 'never',
  },
  plugins: {
    SplashScreen: {
      // La app la saca cuando dibujó la primera pantalla (NativeBridge)
      launchAutoHide: false,
      launchShowDuration: 3000,
      backgroundColor: '#04050D',
      showSpinner: false,
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_mycen',
      iconColor: '#C8431F',
    },
  },
}

export default config
