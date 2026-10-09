import { describe, expect, it } from 'vitest'
import { weeklySummary } from '../../src/modules/studio/lib/weekly'

const stat = (event_type: string, events: number) => ({ day: '2026-10-08', event_type, module_id: null, events, visitors: events })

describe('resultados de la semana', () => {
  it('suma visitas, toques, contactos y mensajes reales, y destaca el canal que más trajo (sin contar directo)', () => {
    const w = weeklySummary(
      [stat('view', 20), stat('view', 3), stat('primary_action_click', 4), stat('vcard_download', 2), stat('module_click', 9)],
      [{ source: null, referrer_host: null, visits: 12, visitors: 10 }, { source: 'ig', referrer_host: null, visits: 8, visitors: 7 },
       { source: null, referrer_host: 'l.instagram.com', visits: 3, visitors: 3 }],
      5)
    expect(w).toMatchObject({ visits: 23, primary: 4, contacts: 2, messages: 5 })
    expect(w.highlight).toEqual({ kind: 'source', key: 'instagram', visits: 11 })
    expect(w.sources.map(s => s.key)).toEqual(['direct', 'instagram'])
  })

  it('el QR se cuenta como escaneos; sin canales, el total; sin visitas, nada', () => {
    expect(weeklySummary([stat('view', 4)], [{ source: 'qr', referrer_host: null, visits: 4, visitors: 4 }], 0).highlight)
      .toEqual({ kind: 'scan', visits: 4 })
    expect(weeklySummary([stat('view', 4)], [{ source: null, referrer_host: null, visits: 4, visitors: 4 }], 0).highlight)
      .toEqual({ kind: 'total', visits: 4 })
    expect(weeklySummary([], [], 0).highlight).toBeNull()
  })
})
