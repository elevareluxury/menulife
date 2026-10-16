import { LATEST_VIDEOS } from './mockYoutubeLatest'
import type { MockState } from './mockSupabase'

// Detector de español para las pruebas con la app en otro idioma (i18n-coverage.spec.ts, lang-flash.spec.ts).
// Palabras que no existen en inglés (ni en los nombres propios de la app) + letras del español.
export const SPANISH = /(^|[^\p{L}])(de|que|para|con|tu|tus|una|los|las|del|por|más|está|sin|hoy|ver|nuevo|nueva|guardar|editar|borrar|agregar|eliminar|cerrar|cancelar|todavía|acá|vos|tenés|podés|elegí|mañana|semana|día|días|meta|metas|hábito|hábitos|tarea|tareas|dinero|gasto|gastos|ingresos|perfil|módulo|módulos|compartir|ajustes|inicio|publicar|botón|mensajes|suscriptores|nada|todos)(?=$|[^\p{L}])|[áéíóúñ¿¡]/iu

/** Lo que cargó la persona (los datos de prueba están en español): no cuenta como texto de la app. */
export function userStrings(state: MockState): string[] {
  const out = new Set<string>(LATEST_VIDEOS.map(v => v.title))
  const walk = (v: unknown) => {
    if (typeof v === 'string') { if (v.length >= 3) out.add(v) }
    else if (Array.isArray(v)) v.forEach(walk)
    else if (v && typeof v === 'object') Object.values(v).forEach(walk)
  }
  walk(state.tables)
  return [...out].sort((a, b) => b.length - a.length)
}
