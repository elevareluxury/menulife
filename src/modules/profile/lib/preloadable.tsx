import { lazy, useState, type ComponentType } from 'react'

export type Preloadable<P> = ComponentType<P> & { preload: () => Promise<void> }

/**
 * Como `React.lazy`, pero se puede bajar antes de dibujar (`preload`). Si ya llegó, se dibuja directo, sin pasar por
 * Suspense: la página pública baja la estructura y los módulos mientras espera los datos y aparece completa de una
 * vez, sin un estado intermedio que haga saltar el contenido (CLS).
 */
export function preloadable<P extends object>(load: () => Promise<{ default: ComponentType<P> }>): Preloadable<P> {
  let loaded: ComponentType<P> | null = null
  let pending: Promise<ComponentType<P>> | null = null
  const get = () => (pending ??= load().then(m => (loaded = m.default)))
  const Lazy = lazy(() => get().then(C => ({ default: C })))

  function PreloadableComponent(props: P) {
    // Se elige una vez por instancia: cambiar de Lazy al componente lo volvería a montar (perdería su estado)
    const [C] = useState<ComponentType<P>>(() => loaded ?? Lazy)
    return <C {...props} />
  }
  // Si falla, lo muestra el Suspense/ErrorBoundary de siempre cuando se dibuje
  const preload = () => get().then(() => undefined, () => undefined)
  return Object.assign(PreloadableComponent, { preload })
}
