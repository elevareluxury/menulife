// Pedidos del servidor (funciones de api/) a direcciones que vienen de un perfil: cada redirección se valida antes de
// seguirla (con `redirect: 'follow'` el pedido intermedio ya salía aunque después se descartara la respuesta).
// Sin dependencias ni imports con alias: lo usan las funciones Edge con import relativo.

/** Máximo de redirecciones que se siguen */
export const MAX_REDIRECTS = 3

/**
 * `fetch` que sigue hasta `MAX_REDIRECTS` redirecciones sólo si `allowed(siguiente)` lo permite. Falla con
 * `redirect_blocked` o `too_many_redirects`; la respuesta final es la del último salto permitido.
 */
export async function fetchCheckedRedirects(url: string, init: RequestInit, allowed: (next: string) => boolean): Promise<Response> {
  let current = url
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await fetch(current, { ...init, redirect: 'manual' })
    const location = res.status >= 300 && res.status < 400 ? res.headers.get('location') : null
    if (!location) return res
    const next = new URL(location, current).toString()
    if (!allowed(next)) throw new Error('redirect_blocked')
    current = next
  }
  throw new Error('too_many_redirects')
}
