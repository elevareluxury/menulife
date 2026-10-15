// Lector mínimo de Excel (.xlsx) en el navegador, sin dependencias: un .xlsx es un zip con XML. Se lee el índice del
// zip, se descomprime con DecompressionStream y se arma la primera hoja como grilla de textos (números tal cual, las
// fechas quedan como número de serie y las convierte bankImport.parseDate). El .xls viejo (binario) no se lee.

import type { Grid } from './bankImport'

interface Entry { name: string; method: number; size: number; offset: number }

function entries(buf: ArrayBuffer): Map<string, Entry> {
  const v = new DataView(buf)
  let eocd = -1
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 66_000); i--) {
    if (v.getUint32(i, true) === 0x06054b50) { eocd = i; break }
  }
  if (eocd < 0) throw new Error('not_xlsx')
  const count = v.getUint16(eocd + 10, true)
  let p = v.getUint32(eocd + 16, true)
  const dec = new TextDecoder()
  const out = new Map<string, Entry>()
  for (let i = 0; i < count; i++) {
    if (v.getUint32(p, true) !== 0x02014b50) throw new Error('not_xlsx')
    const method = v.getUint16(p + 10, true)
    const size = v.getUint32(p + 20, true)
    const nameLen = v.getUint16(p + 28, true)
    const extraLen = v.getUint16(p + 30, true)
    const commentLen = v.getUint16(p + 32, true)
    const offset = v.getUint32(p + 42, true)
    const name = dec.decode(new Uint8Array(buf, p + 46, nameLen))
    out.set(name, { name, method, size, offset })
    p += 46 + nameLen + extraLen + commentLen
  }
  return out
}

async function read(buf: ArrayBuffer, e: Entry): Promise<string> {
  const v = new DataView(buf)
  const start = e.offset + 30 + v.getUint16(e.offset + 26, true) + v.getUint16(e.offset + 28, true)
  const data = new Uint8Array(buf, start, e.size)
  if (e.method === 0) return new TextDecoder().decode(data)
  if (e.method !== 8 || typeof DecompressionStream === 'undefined') throw new Error('unsupported')
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Response(stream).text()
}

const colIndex = (ref: string) => {
  const letters = ref.replace(/\d+/g, '')
  let n = 0
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

/** Primera hoja del libro como grilla. Lanza `not_xlsx` si no es un .xlsx. */
export async function readXlsx(buf: ArrayBuffer): Promise<Grid> {
  const files = entries(buf)
  const sheetName = files.has('xl/worksheets/sheet1.xml')
    ? 'xl/worksheets/sheet1.xml'
    : [...files.keys()].filter(n => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort()[0]
  if (!sheetName) throw new Error('not_xlsx')
  const parser = new DOMParser()
  const shared: string[] = []
  const sst = files.get('xl/sharedStrings.xml')
  if (sst) {
    const doc = parser.parseFromString(await read(buf, sst), 'application/xml')
    for (const si of Array.from(doc.getElementsByTagName('si'))) {
      shared.push(Array.from(si.getElementsByTagName('t')).map(t => t.textContent ?? '').join(''))
    }
  }
  const doc = parser.parseFromString(await read(buf, files.get(sheetName)!), 'application/xml')
  const grid: Grid = []
  for (const row of Array.from(doc.getElementsByTagName('row'))) {
    const cells: string[] = []
    for (const c of Array.from(row.getElementsByTagName('c'))) {
      const j = colIndex(c.getAttribute('r') ?? '')
      const t = c.getAttribute('t')
      const v = c.getElementsByTagName('v')[0]?.textContent ?? ''
      let text = v
      if (t === 's') text = shared[Number(v)] ?? ''
      else if (t === 'inlineStr') text = Array.from(c.getElementsByTagName('t')).map(x => x.textContent ?? '').join('')
      else if (t === 'b') text = v === '1' ? 'TRUE' : 'FALSE'
      if (j >= 0) { while (cells.length < j) cells.push(''); cells[j] = text.trim() }
    }
    if (cells.some(c => c !== '')) grid.push(cells)
  }
  return grid
}
