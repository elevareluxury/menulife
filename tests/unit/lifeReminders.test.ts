import { describe, expect, it } from 'vitest'
import { pushPayload, sameSecret, shownEvents, withReminderMark, type DueReminder } from '../../supabase/functions/life-reminders/payload'
import { parseReminderParam, reminderUrl } from '@/modules/life/lib/reminderOpen'
import { keyBytes } from '@/lib/webPush'

// Avisos con la app cerrada (Web Push): lo que lleva cada aviso y la clave del cron (supabase/functions/life-reminders)

const base: DueReminder = {
  user_id: 'u1', kind: 'task', item_id: 't1', title: 'Pagar la luz', body: '18:30',
  url: '/life/brain?vista=tareas', tag: 'life-task-t1',
}

describe('pushPayload', () => {
  it('tarea: título, hora y su pantalla', () => {
    expect(pushPayload(base)).toEqual({ title: 'Pagar la luz', body: '⏰ 18:30', url: '/life/brain?vista=tareas&aviso=task.push', tag: 'life-task-t1' })
  })
  it('tarea sin hora: sin texto de más', () => {
    expect(pushPayload({ ...base, body: null }).body).toBeUndefined()
  })
  it('hábito: el ancla debajo', () => {
    expect(pushPayload({ ...base, kind: 'habit', title: 'Tomar agua', body: 'el almuerzo', url: '/life/habits', tag: 'h' }))
      .toMatchObject({ title: 'Tomar agua', body: '↪ el almuerzo', url: '/life/habits?aviso=habit.push' })
  })
  it('nunca lleva afuera de Mycen', () => {
    for (const url of ['https://evil.com', '//evil.com', 'javascript:alert(1)']) {
      expect(pushPayload({ ...base, url }).url).toBe('/life?aviso=task.push')
    }
  })
  it('títulos vacíos o larguísimos', () => {
    expect(pushPayload({ ...base, title: '   ' }).title).toBe('Mycen')
    expect(pushPayload({ ...base, title: 'x'.repeat(500) }).title).toHaveLength(120)
  })
})

describe('marca del recordatorio tocado', () => {
  it('la Edge Function y la app marcan igual la dirección', () => {
    for (const url of ['/life/habits', '/life/brain?vista=tareas', '/life#hoy']) {
      expect(withReminderMark(url, 'habit')).toBe(reminderUrl(url, 'habit', 'push'))
    }
    expect(reminderUrl('/life#hoy', 'task', 'app')).toBe('/life?aviso=task.app#hoy')
  })
  it('sólo se leen marcas conocidas', () => {
    expect(parseReminderParam('task.push')).toEqual({ kind: 'task', channel: 'push' })
    expect(parseReminderParam('habit.app')).toEqual({ kind: 'habit', channel: 'app' })
    for (const raw of [null, '', 'task', 'task.sms', 'Pagar la luz.push']) expect(parseReminderParam(raw)).toBeNull()
  })
  it('un reminder_shown por recordatorio entregado, sin el título', () => {
    const events = shownEvents([base, { ...base, kind: 'habit', user_id: 'u2' }])
    expect(events).toEqual([
      { user_id: 'u1', event: 'reminder_shown', props: { kind: 'task', channel: 'push' } },
      { user_id: 'u2', event: 'reminder_shown', props: { kind: 'habit', channel: 'push' } },
    ])
    expect(JSON.stringify(events)).not.toContain('Pagar la luz')
  })
})

describe('sameSecret', () => {
  it('sólo con la clave exacta', () => {
    expect(sameSecret('abc123', 'abc123')).toBe(true)
    expect(sameSecret('abc124', 'abc123')).toBe(false)
    expect(sameSecret('abc', 'abc123')).toBe(false)
    expect(sameSecret(null, 'abc123')).toBe(false)
    // Sin clave configurada, nadie entra
    expect(sameSecret('', undefined)).toBe(false)
  })
})

describe('keyBytes', () => {
  it('pasa la clave VAPID (base64url) a bytes', () => {
    expect([...keyBytes('AQID_-8')]).toEqual([1, 2, 3, 255, 239])
  })
})
