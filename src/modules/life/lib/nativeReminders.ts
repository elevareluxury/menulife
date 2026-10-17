// Recordatorios de verdad en la app de iOS/Android: en vez de avisar sólo con Life OS abierto, se programan en el
// teléfono (notificaciones locales) y llegan aunque la app esté cerrada. Cada vez que se leen tareas o hábitos
// (`reminderLoop`) se reemplazan los programados de ese tipo por los que tocan ahora: si algo se completa, se borra o
// cambia de hora, desaparece en la próxima lectura. En la web no se usa (ahí sigue el aviso con la app abierta).

export type ReminderKind = 'task' | 'habit'

export interface NativeReminder {
  /** Clave estable (tarea o hábito + día): de ahí sale el id de la notificación */
  key: string
  title: string
  body?: string
  at: Date
}

/** id de 31 bits estable para cada clave (las notificaciones locales piden un entero) */
export function reminderId(kind: ReminderKind, key: string): number {
  let h = kind === 'task' ? 5381 : 7919
  for (let i = 0; i < key.length; i++) h = ((h * 33) ^ key.charCodeAt(i)) >>> 0
  return (h & 0x7fffffff) || 1
}

/** iOS guarda hasta 64 programadas por app: se reparten entre tareas y hábitos */
const MAX_PER_KIND = 30

export async function scheduleNativeReminders(kind: ReminderKind, items: NativeReminder[]): Promise<void> {
  const { LocalNotifications } = await import('@capacitor/local-notifications')
  const now = Date.now()
  const next = items.filter(r => r.at.getTime() > now + 5_000)
    .sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, MAX_PER_KIND)

  // Permiso: se pide la primera vez que hay algo para recordar (la persona acaba de poner un recordatorio)
  let perm = await LocalNotifications.checkPermissions()
  if (perm.display === 'prompt' || perm.display === 'prompt-with-rationale') perm = await LocalNotifications.requestPermissions()
  if (perm.display !== 'granted') return

  const pending = await LocalNotifications.getPending()
  const ours = pending.notifications.filter(n => (n.extra as { kind?: string } | undefined)?.kind === kind)
  if (ours.length) await LocalNotifications.cancel({ notifications: ours.map(n => ({ id: n.id })) })
  if (!next.length) return
  await LocalNotifications.schedule({
    notifications: next.map(r => ({
      id: reminderId(kind, r.key),
      title: r.title,
      body: r.body ?? '',
      schedule: { at: r.at, allowWhileIdle: true },
      extra: { kind, path: kind === 'task' ? '/life/brain?vista=tareas' : '/life/habits' },
    })),
  })
}
