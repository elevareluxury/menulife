import { describe, expect, it } from 'vitest'
import {
  detectDateOrder, detectDecimal, detectDelimiter, detectMapping, parseAmount, parseCsv, parseDate,
  splitDuplicates, toTransactions,
} from '../../src/modules/life/lib/bankImport'

describe('CSV', () => {
  it('detecta el separador y respeta comillas', () => {
    expect(detectDelimiter('a;b;c\n1;2;3')).toBe(';')
    expect(detectDelimiter('a,b,c\n"1,5",2,3')).toBe(',')
    expect(detectDelimiter('a\tb\tc\n1\t2\t3')).toBe('\t')
    expect(parseCsv('fecha,detalle,importe\n01/02/2026,"Súper ""Día"", sucursal 3",-1.500,50\n', ','))
      .toEqual([['fecha', 'detalle', 'importe'], ['01/02/2026', 'Súper "Día", sucursal 3', '-1.500', '50']])
  })
})

describe('importes', () => {
  it('coma o punto decimal, signos y paréntesis', () => {
    expect(detectDecimal(['1.234,56', '-20,00', '3,5'])).toBe(',')
    expect(detectDecimal(['1,234.56', '-20.00'])).toBe('.')
    expect(parseAmount('$ -1.234,56', ',')).toBe(-1234.56)
    expect(parseAmount('(1,234.56)', '.')).toBe(-1234.56)
    expect(parseAmount('1234.5-', '.')).toBe(-1234.5)
    expect(parseAmount('USD 10', '.')).toBe(10)
    expect(parseAmount('−15,00', ',')).toBe(-15)
    expect(parseAmount('Saldo', ',')).toBeNull()
    expect(parseAmount('', ',')).toBeNull()
  })
})

describe('fechas', () => {
  it('día/mes, mes/día, año primero y serie de Excel', () => {
    expect(detectDateOrder(['15/03/2026', '01/04/2026'])).toBe('dmy')
    expect(detectDateOrder(['03/15/2026', '04/01/2026'])).toBe('mdy')
    expect(detectDateOrder(['2026-03-15'])).toBe('ymd')
    expect(detectDateOrder(['01/02/2026'], 'mdy')).toBe('mdy')
    expect(parseDate('15/03/2026', 'dmy')).toBe('2026-03-15')
    expect(parseDate('03/15/2026', 'mdy')).toBe('2026-03-15')
    expect(parseDate('15-03-26', 'dmy')).toBe('2026-03-15')
    expect(parseDate('15.03.2026 10:22', 'dmy')).toBe('2026-03-15')
    expect(parseDate('2026-03-15T00:00:00', 'dmy')).toBe('2026-03-15')
    expect(parseDate('46096', 'dmy')).toBe('2026-03-15')
    expect(parseDate('31/02/2026', 'dmy')).toBeNull()
    expect(parseDate('Saldo anterior', 'dmy')).toBeNull()
  })
})

describe('extractos reales', () => {
  it('banco argentino: títulos arriba, débitos y créditos separados', () => {
    const csv = [
      'Cuenta;CA $ 1234/5',
      'Período;01/03/2026 al 31/03/2026',
      '',
      'Fecha;Descripción;Origen;Débitos;Créditos;Saldo',
      '02/03/2026;COMPRA DEBITO SUPERMERCADO;;15.230,50;;100.000,00',
      '05/03/2026;TRANSFERENCIA RECIBIDA SUELDO;;;850.000,00;950.000,00',
      '10/03/2026;DEBITO AUTOMATICO NETFLIX;;8.999,00;;941.001,00',
    ].join('\n')
    const grid = parseCsv(csv)
    const m = detectMapping(grid)!
    expect(m).toMatchObject({ date: 0, description: 1, debit: 3, credit: 4, amount: null, decimal: ',', order: 'dmy' })
    const { items } = toTransactions(grid, m)
    expect(items).toEqual([
      { date: '2026-03-02', type: 'expense', amount: 15230.5, description: 'COMPRA DEBITO SUPERMERCADO' },
      { date: '2026-03-05', type: 'income', amount: 850000, description: 'TRANSFERENCIA RECIBIDA SUELDO' },
      { date: '2026-03-10', type: 'expense', amount: 8999, description: 'DEBITO AUTOMATICO NETFLIX' },
    ])
  })

  it('banco de EE. UU.: una columna con signo y mes/día', () => {
    const csv = 'Date,Description,Amount,Balance\n03/15/2026,COFFEE SHOP,-4.50,995.50\n03/16/2026,PAYROLL,"2,500.00","3,495.50"\n'
    const grid = parseCsv(csv)
    const m = detectMapping(grid, 'dmy')!
    expect(m).toMatchObject({ date: 0, description: 1, amount: 2, order: 'mdy', decimal: '.' })
    expect(toTransactions(grid, m).items).toEqual([
      { date: '2026-03-15', type: 'expense', amount: 4.5, description: 'COFFEE SHOP' },
      { date: '2026-03-16', type: 'income', amount: 2500, description: 'PAYROLL' },
    ])
  })

  it('sin títulos: adivina por el contenido y saltea las filas raras', () => {
    const csv = '2026-03-01;Panadería;-3,20\n2026-03-02;Bizum recibido;25,00\nSaldo final;;1.000,00\n'
    const grid = parseCsv(csv)
    const m = detectMapping(grid)!
    expect(m).toMatchObject({ start: 0, date: 0, description: 1, amount: 2, order: 'ymd', decimal: ',' })
    const { items, skipped } = toTransactions(grid, m)
    expect(items.map(i => [i.date, i.type, i.amount])).toEqual([['2026-03-01', 'expense', 3.2], ['2026-03-02', 'income', 25]])
    expect(skipped).toBe(1)
  })

  it('sin columna de fechas no hay nada que importar', () => {
    expect(detectMapping(parseCsv('a;b\nx;y\n'))).toBeNull()
  })
})

describe('duplicados', () => {
  it('saltea lo que ya estaba, contando repeticiones', () => {
    const cafe = { date: '2026-03-01', type: 'expense' as const, amount: 3.5, description: 'Café' }
    const { fresh, duplicates } = splitDuplicates(
      [cafe, cafe, { ...cafe, amount: 4 }],
      [{ ...cafe, description: '  café ' }],
    )
    expect(duplicates).toBe(1)
    expect(fresh).toEqual([cafe, { ...cafe, amount: 4 }])
  })
})
