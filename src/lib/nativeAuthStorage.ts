// Sesión de la app de iOS/Android. iOS puede vaciar el almacenamiento del navegador interno cuando falta espacio y
// eso cerraría la sesión sin aviso: se guarda en localStorage (lo leen `publicRpc` y `useAuth` como en la web) y
// también en las preferencias nativas (UserDefaults / SharedPreferences), de donde se recupera si localStorage se
// perdió. El plugin se baja sólo en la app.

// Se guarda el módulo, no el plugin: un plugin de Capacitor responde a cualquier nombre (también a `then`), así que una
// promesa que lo devuelve quedaría esperando para siempre
type PrefsModule = typeof import('@capacitor/preferences')
let mod: Promise<PrefsModule> | null = null
const native = () => (mod ??= import('@capacitor/preferences'))

// Si el plugin no contesta, la sesión no puede quedar esperando: se sigue sin la copia nativa
function withTimeout<T>(p: Promise<T>, fallback: T, ms = 1500): Promise<T> {
  return Promise.race([p, new Promise<T>(resolve => window.setTimeout(() => resolve(fallback), ms))])
}

function local(): Storage | null {
  try { return window.localStorage } catch { return null }
}

export const nativeAuthStorage = {
  async getItem(key: string): Promise<string | null> {
    const saved = local()?.getItem(key) ?? null
    if (saved !== null) return saved
    try {
      const value = await withTimeout(native().then(m => m.Preferences.get({ key })).then(r => r.value), null)
      if (value !== null) try { local()?.setItem(key, value) } catch { /* sin espacio: queda la copia nativa */ }
      return value
    } catch { return null }
  },
  async setItem(key: string, value: string): Promise<void> {
    try { local()?.setItem(key, value) } catch { /* sin espacio: queda la copia nativa */ }
    // La copia nativa se escribe de fondo: localStorage ya la tiene para esta sesión
    void native().then(m => m.Preferences.set({ key, value })).catch(() => { /* sin plugin: queda localStorage */ })
  },
  async removeItem(key: string): Promise<void> {
    try { local()?.removeItem(key) } catch { /* nada */ }
    void native().then(m => m.Preferences.remove({ key })).catch(() => { /* nada */ })
  },
}
