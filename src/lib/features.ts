// Funciones que se prenden por etapas. Insights y "Tu mes" (Replay) entraron antes del freeze de la V1.
// Las de la V1.1 quedan apagadas para todos, salvo en el dispositivo de quien abre la app con ?beta=1 (se recuerda;
// ?beta=0 lo apaga). Así se prueban en producción antes de prenderlas.
export const FEATURES = {
  lifeInsights:   true,
  lifeReplay:     true,
  businessInLife: false,
  bankImport:     false,
  calendarFeed:   false,
  voiceCapture:   false,
  // Entrar con Google: prendido para todos (se apaga acá si hiciera falta)
  googleSignIn:   true,
} as const

export type FeatureName = keyof typeof FEATURES

const BETA: readonly FeatureName[] = ['bankImport', 'calendarFeed', 'voiceCapture']
const BETA_KEY = 'mycen_beta'

export function betaOn(): boolean {
  try {
    const q = new URLSearchParams(window.location.search).get('beta')
    if (q === '1') localStorage.setItem(BETA_KEY, '1')
    if (q === '0') localStorage.removeItem(BETA_KEY)
    return localStorage.getItem(BETA_KEY) === '1'
  } catch {
    return false
  }
}

export function featureOn(name: FeatureName): boolean {
  return FEATURES[name] || (BETA.includes(name) && betaOn())
}
