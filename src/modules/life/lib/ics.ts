import { taskDueAt, type LifeTask } from '../hooks/useTasks'

type IcsTask = Pick<LifeTask, 'id' | 'title' | 'notes' | 'due_date' | 'due_time' | 'remind_minutes'>

function esc(v: string): string {
  return v.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1')
}

function utcStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

/**
 * Evento de calendario (.ics) con alarma: al abrirlo, el celular lo agrega a su
 * calendario y avisa aunque la app esté cerrada.
 */
export function buildTaskIcs(task: IcsTask): string | null {
  const start = taskDueAt(task)
  if (!start || !task.due_date) return null
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Mycen//Life OS//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${task.id}@mycen.id`,
    `DTSTAMP:${utcStamp(new Date())}`,
  ]
  if (task.due_time) {
    lines.push(`DTSTART:${utcStamp(start)}`, `DTEND:${utcStamp(new Date(start.getTime() + 30 * 60_000))}`)
  } else {
    const next = new Date(`${task.due_date}T12:00:00`)
    next.setDate(next.getDate() + 1)
    const ymd = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
    lines.push(`DTSTART;VALUE=DATE:${task.due_date.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${ymd(next)}`)
  }
  lines.push(`SUMMARY:${esc(task.title)}`)
  if (task.notes) lines.push(`DESCRIPTION:${esc(task.notes)}`)
  if (task.remind_minutes != null) {
    lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(task.title)}`,
      `TRIGGER:-PT${Math.max(0, task.remind_minutes)}M`, 'END:VALARM')
  }
  lines.push('END:VEVENT', 'END:VCALENDAR')
  return lines.join('\r\n')
}

export function downloadTaskIcs(task: IcsTask): boolean {
  const ics = buildTaskIcs(task)
  if (!ics) return false
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${task.title.replace(/[^\p{L}\p{N}]+/gu, '-').slice(0, 40) || 'tarea'}.ics`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return true
}
