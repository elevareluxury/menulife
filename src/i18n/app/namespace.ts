import { useEffect, useState } from 'react'
import { registerNamespace, useAppLang } from './store'
import type { AppLang } from './languages'

type Loader<D> = () => Promise<{ default: D }>

/**
 * Crea el hook de un grupo de textos (ej. Studio). El español viaja con la app;
 * los demás idiomas se descargan sólo cuando se eligen.
 *
 * Sin destello de español (auditoría v2, #3): el diccionario del idioma guardado empieza a bajar apenas se carga el
 * grupo (en paralelo al resto de la pantalla) y, mientras no llegó, el hook suspende: se ve el esqueleto de la app
 * (el `Suspense` de las rutas), nunca el español. Al cambiar de idioma, `setLang` espera los grupos ya cargados antes
 * de cambiar, así la pantalla no pasa por el esqueleto. Si la descarga falla, se muestra el español (no queda en blanco)
 * y se vuelve a intentar cuando se monte otra pantalla que lo use.
 */
export function createNamespace<D>(es: D, loaders: Partial<Record<AppLang, Loader<D>>>) {
  const cache = new Map<AppLang, D>([['es', es]])
  const pending = new Map<AppLang, Promise<D>>()
  // Idiomas cuya última descarga falló: no se suspende por ellos (se vería el esqueleto para siempre)
  const failed = new Set<AppLang>()

  function load(lang: AppLang): Promise<D> {
    const hit = cache.get(lang)
    if (hit) return Promise.resolve(hit)
    let p = pending.get(lang)
    if (!p) {
      const loader = loaders[lang]
      p = loader
        // Si la descarga falla (sin red, deploy nuevo), se muestra el español y se vuelve a intentar cuando se monte
        // otra pantalla que lo use; antes la promesa fallida quedaba guardada y la sesión seguía en español
        ? loader()
          .then(m => { cache.set(lang, m.default); failed.delete(lang); return m.default })
          .catch(() => { pending.delete(lang); failed.add(lang); return es })
        : Promise.resolve(es)
      if (!loader) cache.set(lang, es)
      pending.set(lang, p)
    }
    return p
  }

  function useDict(): D {
    const lang = useAppLang(s => s.lang)
    const [, force] = useState(0)
    const hit = cache.get(lang)
    useEffect(() => {
      if (cache.has(lang)) return
      let alive = true
      void load(lang).then(() => { if (alive) force(n => n + 1) })
      return () => { alive = false }
    }, [lang])
    if (hit) return hit
    if (failed.has(lang)) return es
    // Todavía bajando: suspende hasta tenerlo (la promesa nunca rechaza). Se lanza la promesa en vez de use(): la
    // pantalla se vuelve a dibujar de cero al llegar, sin reanudar a mitad de los hooks
    throw load(lang)
  }

  /** Diccionario del idioma activo fuera de React (español si todavía no cargó). */
  function peek(): D {
    return cache.get(useAppLang.getState().lang) ?? es
  }

  // Precarga: el idioma guardado empieza a bajar en cuanto existe el grupo, y setLang lo espera antes de cambiar
  registerNamespace(load)
  const current = useAppLang.getState().lang
  if (current !== 'es') void load(current)

  return { useDict, load, peek }
}
