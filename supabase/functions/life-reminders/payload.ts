// Lo que lleva cada aviso push de Life OS (sin Deno ni red: también lo usan las pruebas, tests/unit/lifeReminders.test.ts)

export interface DueReminder {
  user_id: string
  kind: 'task' | 'habit'
  item_id: string
  title: string
  body: string | null
  url: string
  tag: string
}

export interface PushPayload {
  title: string
  body?: string
  url: string
  tag: string
}

/** Tarea: el título y la hora ("⏰ 18:30"); hábito: el nombre y su ancla ("↪ el café"). */
export function pushPayload(r: DueReminder): PushPayload {
  const title = r.title.trim().slice(0, 120) || 'Mycen'
  const extra = r.body?.trim().slice(0, 120)
  const body = extra ? `${r.kind === 'task' ? '⏰' : '↪'} ${extra}` : undefined
  // Sólo pantallas de Mycen (el aviso nunca lleva afuera)
  const url = r.url.startsWith('/') && !r.url.startsWith('//') ? r.url : '/life'
  return { title, body, url: withReminderMark(url, r.kind), tag: r.tag }
}

/**
 * ?aviso=<kind>.push: al tocarlo, Life OS registra reminder_opened y lo saca de la dirección
 * (lo mismo que reminderUrl en src/modules/life/lib/reminderOpen.ts, que acá no se puede importar).
 */
export function withReminderMark(url: string, kind: DueReminder['kind']): string {
  const [base, hash = ''] = url.split('#')
  return `${base}${base.includes('?') ? '&' : '?'}aviso=${kind}.push${hash ? `#${hash}` : ''}`
}

/** reminder_shown por recordatorio que llegó al menos a un dispositivo (sin título ni texto: sólo el tipo) */
export function shownEvents(delivered: DueReminder[]): Array<{ user_id: string; event: 'reminder_shown'; props: { kind: DueReminder['kind']; channel: 'push' } }> {
  return delivered.map(r => ({ user_id: r.user_id, event: 'reminder_shown', props: { kind: r.kind, channel: 'push' } }))
}

/** Comparación de la clave del cron sin cortar en el primer carácter distinto */
export function sameSecret(a: string | null, b: string | undefined): boolean {
  if (!a || !b || a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
