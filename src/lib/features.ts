// Funciones que se prenden por etapas. Insights y "Tu mes" (Replay) entraron antes del freeze de la V1.
// Las de la V1.1 se prueban primero en BETA: apagadas para todos salvo en el dispositivo que abre la app con ?beta=1
// (se recuerda; ?beta=0 lo apaga). Importar del banco, calendario y voz ya pasaron la prueba y están prendidas.
export const FEATURES = {
  lifeInsights:   true,
  lifeReplay:     true,
  businessInLife: false,
  bankImport:     true,
  calendarFeed:   true,
  voiceCapture:   true,
  // Entrar con Google: prendido para todos (se apaga acá si hiciera falta)
  googleSignIn:   true,
  // Entrar con Apple: la App Store lo exige si la app ofrece Google. Prendido: el botón aparece solo cuando Apple está
  // configurado en Supabase → Authentication → Providers (lo pregunta `authProviders.ts`; pasos en docs/app/README.md).
  // Con ?beta=1 aparece aunque Supabase no lo tenga (para probar).
  appleSignIn:    true,
  // Diario privado con bloqueo en el dispositivo (Life OS → Brain → Diario)
  journal:        true,
  // Ánimo del día y revisión semanal guiada en Life OS (V1.1, pedido directo; prendido para todos)
  lifeReflection: true,
  // Módulos de bio (V1.1, pedido directo; prendidos): Apoyame, Suscribirse, Último video, Escuchá en y Colaboraciones.
  // Apagado, Studio no los ofrece al agregar un módulo (los ya creados se siguen viendo).
  bioModules:     true,
  // Módulos de la entrega 2 (pedido directo; prendidos): Encuesta, Descargables, Cupón, Galería de videos y Podcast.
  // Apagado, Studio no los ofrece al agregar un módulo (los ya creados se siguen viendo).
  modulesV2:      true,
} as const

export type FeatureName = keyof typeof FEATURES

const BETA: readonly FeatureName[] = ['appleSignIn']
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
