import { describe, expect, it } from 'vitest'
import { pushPayload, sameSecret, type DueReminder } from '../../supabase/functions/life-reminders/payload'
import { keyBytes } from '@/lib/webPush'

// Avisos con la app cerrada (Web Push): lo que lleva cada aviso y la clave del cron (supabase/functions/life-reminders)

const base: DueReminder = {
  user_id: 'u1', kind: 'task', item_id: 't1', title: 'Pagar la luz', body: '18:30',
  url: '/life/brain?vista=tareas', tag: 'life-task-t1',
}

describe('pushPayload', () => {
  it('tarea: título, hora y su pantalla', () => {
    expect(pushPayload(base)).toEqual({ title: 'Pagar la luz', body: '⏰ 18:30', url: '/life/brain?vista=tareas', tag: 'life-task-t1' })
  })
  it('tarea sin hora: sin texto de más', () => {
    expect(pushPayload({ ...base, body: null }).body).toBeUndefined()
  })
  it('hábito: el ancla debajo', () => {
    expect(pushPayload({ ...base, kind: 'habit', title: 'Tomar agua', body: 'el almuerzo', url: '/life/habits', tag: 'h' }))
      .toMatchObject({ title: 'Tomar agua', body: '↪ el almuerzo', url: '/life/habits' })
  })
  it('nunca lleva afuera de Mycen', () => {
    for (const url of ['https://evil.com', '//evil.com', 'javascript:alert(1)']) {
      expect(pushPayload({ ...base, url }).url).toBe('/life')
    }
  })
  it('títulos vacíos o larguísimos', () => {
    expect(pushPayload({ ...base, title: '   ' }).title).toBe('Mycen')
    expect(pushPayload({ ...base, title: 'x'.repeat(500) }).title).toHaveLength(120)
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
