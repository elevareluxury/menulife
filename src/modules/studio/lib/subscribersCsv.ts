// CSV de suscriptores (módulo "Suscribirse"). Columnas fijas en inglés (las lee cualquier herramienta de mails).
// Seguro para planillas: un valor que empieza con = + - @ (o tabulación / retorno) se antepone con ' para que
// Excel, Sheets o Numbers no lo ejecuten como fórmula.

export interface SubscriberCsvRow {
  email: string
  name: string | null
  created_at: string
  locale: string | null
}

const BOM = String.fromCharCode(0xfeff)
// También después de ; o tabulación: una planilla configurada con otro separador (Excel en español usa ;) parte la
// celda ahí, y el pedazo que empieza con = sería una fórmula (auditoría de seguridad)
const FORMULA_AT_SEGMENT = /(^|[;\t])([=+\-@\r])/g

export function csvCell(value: string | null | undefined): string {
  let v = value ?? ''
  v = v.replace(FORMULA_AT_SEGMENT, "$1'$2")
  if (/^[\t\r]/.test(v)) v = `'${v}`
  return /[",;\t\n\r]/.test(v) || v !== v.trim() ? `"${v.replace(/"/g, '""')}"` : v
}

export function subscribersCsv(rows: SubscriberCsvRow[]): string {
  const lines = ['email,name,date,locale']
  for (const r of rows) lines.push([r.email, r.name, r.created_at, r.locale].map(csvCell).join(','))
  // BOM: Excel abre bien los acentos y otros alfabetos
  return BOM + lines.join('\r\n') + '\r\n'
}
