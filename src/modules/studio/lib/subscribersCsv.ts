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
const FORMULA = /^[=+\-@\t\r]/

export function csvCell(value: string | null | undefined): string {
  let v = value ?? ''
  if (FORMULA.test(v)) v = `'${v}`
  return /[",\n\r]/.test(v) || v !== v.trim() ? `"${v.replace(/"/g, '""')}"` : v
}

export function subscribersCsv(rows: SubscriberCsvRow[]): string {
  const lines = ['email,name,date,locale']
  for (const r of rows) lines.push([r.email, r.name, r.created_at, r.locale].map(csvCell).join(','))
  // BOM: Excel abre bien los acentos y otros alfabetos
  return BOM + lines.join('\r\n') + '\r\n'
}
