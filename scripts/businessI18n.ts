import type { Plugin } from 'vite'

// i18next es sólo de Mycen Business. Para que no viaje con cada página (perfil público, landing, Life OS, Studio),
// la entrada de la app no lo importa: este plugin le agrega `import '@/i18n'` (que lo inicia) a cada archivo de
// `src/` que usa `react-i18next`. Así lo baja sólo la pantalla que lo necesita y nunca queda un texto sin traducir.
export function businessI18nPlugin(): Plugin {
  return {
    name: 'mycen-business-i18n',
    enforce: 'pre',
    transform(code, id) {
      if (!id.includes('/src/') || /\/src\/i18n\/index\.ts$/.test(id)) return null
      if (!/from\s+['"]react-i18next['"]/.test(code)) return null
      return { code: `import '@/i18n'\n${code}`, map: null }
    },
  }
}
