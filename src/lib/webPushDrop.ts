// Al cerrar sesión, este dispositivo deja de recibir los avisos push de la cuenta (en un celular compartido, los de
// otra persona). Lo llama signOutDevice antes de cerrar la sesión, así vale para todas las salidas: el botón "Cerrar
// sesión", "Salir" del segundo paso, aceptar términos, cambiar la contraseña y "Olvidé el PIN" del diario.
// Sin dependencias (lo usa signOutDevice, que se carga en cualquier pantalla privada).

type RpcClient = { rpc?: (fn: string, args: Record<string, unknown>) => PromiseLike<unknown> }

export async function dropPushSubscription(client: unknown, waitMs = 3000): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    const sub = await reg?.pushManager?.getSubscription()
    if (!sub) return
    // Con la sesión todavía abierta (la función borra sólo las de la cuenta); sin esperar de más si no hay red.
    // Aunque el servidor no conteste, la baja del navegador alcanza: el próximo envío responde 410 y se borra la fila.
    const rpc = (client as RpcClient | null)?.rpc
    if (typeof rpc === 'function') {
      let timer: ReturnType<typeof setTimeout> | undefined
      await Promise.race([
        Promise.resolve(rpc.call(client, 'life_push_unsubscribe', { p_endpoint: sub.endpoint })).catch(() => undefined),
        new Promise(resolve => { timer = setTimeout(resolve, waitMs) }),
      ])
      clearTimeout(timer)
    }
    await sub.unsubscribe()
  } catch { /* sin red o sin push: no hay nada que hacer */ }
}
