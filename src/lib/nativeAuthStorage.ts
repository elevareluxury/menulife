// Sesión de la app de iOS/Android. iOS puede vaciar el almacenamiento del navegador interno cuando falta espacio y
// eso cerraría la sesión sin aviso: se guarda en localStorage (lo leen `publicRpc` y `useAuth` como en la web) y
// también en las preferencias nativas (UserDefaults / SharedPreferences), de donde se recupera si localStorage se
// perdió. El plugin se baja sólo en la app.

type Prefs = typeof import('@capacitor/preferences').Preferences
let prefs: Promise<Prefs> | null = null
const native = () => (prefs ??= import('@capacitor/preferences').then(m => m.Preferences))

function local(): Storage | null {
  try { return window.localStorage } catch { return null }
}

export const nativeAuthStorage = {
  async getItem(key: string): Promise<string | null> {
    const saved = local()?.getItem(key) ?? null
    if (saved !== null) return saved
    try {
      const { value } = await (await native()).get({ key })
      if (value !== null) try { local()?.setItem(key, value) } catch { /* sin espacio: queda la copia nativa */ }
      return value
    } catch { return null }
  },
  async setItem(key: string, value: string): Promise<void> {
    try { local()?.setItem(key, value) } catch { /* sin espacio: queda la copia nativa */ }
    try { await (await native()).set({ key, value }) } catch { /* sin plugin: queda localStorage */ }
  },
  async removeItem(key: string): Promise<void> {
    try { local()?.removeItem(key) } catch { /* nada */ }
    try { await (await native()).remove({ key }) } catch { /* nada */ }
  },
}
