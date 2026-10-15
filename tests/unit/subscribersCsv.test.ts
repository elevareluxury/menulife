import { describe, expect, it } from 'vitest'
import { csvCell, subscribersCsv } from '../../src/modules/studio/lib/subscribersCsv'

describe('CSV de suscriptores', () => {
  it('escapa comas, comillas y saltos de línea', () => {
    expect(csvCell('ana@mail.com')).toBe('ana@mail.com')
    expect(csvCell('Pérez, Ana')).toBe('"Pérez, Ana"')
    expect(csvCell('Ana "la" Diseñadora')).toBe('"Ana ""la"" Diseñadora"')
    expect(csvCell('a\nb')).toBe('"a\nb"')
    expect(csvCell(null)).toBe('')
  })

  it('neutraliza fórmulas de planilla', () => {
    expect(csvCell('=HYPERLINK("http://x")')).toBe('"\'=HYPERLINK(""http://x"")"')
    expect(csvCell('+54 9 11')).toBe("'+54 9 11")
    expect(csvCell('-1')).toBe("'-1")
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)")
    expect(csvCell('\tcmd')).toBe("'\tcmd")
  })

  it('arma el archivo con encabezado, BOM y CRLF', () => {
    const csv = subscribersCsv([
      { email: 'ana@mail.com', name: 'Ana', created_at: '2026-10-15T12:00:00.000Z', locale: 'es' },
      { email: 'bo@mail.com', name: null, created_at: '2026-10-14T12:00:00.000Z', locale: null },
    ])
    expect(csv).toBe(String.fromCharCode(0xfeff) + 'email,name,date,locale\r\nana@mail.com,Ana,2026-10-15T12:00:00.000Z,es\r\nbo@mail.com,,2026-10-14T12:00:00.000Z,\r\n')
  })
})
