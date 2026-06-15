import type { FormField } from './formTypes'

export function getFieldOptions(field: FormField): string[] {
  return (field.settings_json?.options as string[]) ?? []
}

export function hasOptions(type: string): boolean {
  return ['select', 'multiselect', 'radio'].includes(type)
}

export function formatFieldValue(field: FormField, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : '—'
  if (field.type === 'boolean' || field.type === 'checkbox') return value ? 'Sí' : 'No'
  if (field.type === 'date' && typeof value === 'string' && value) {
    try {
      return new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
        .format(new Date(value + 'T00:00:00'))
    } catch { return String(value) }
  }
  if (field.type === 'rating' && typeof value === 'number') {
    const max = (field.settings_json?.max as number) ?? 5
    return `${value}/${max} ★`
  }
  if (field.type === 'currency' && typeof value === 'number') {
    const currency = (field.settings_json?.currency as string) ?? 'ARS'
    return `${currency} ${value.toLocaleString('es-AR')}`
  }
  return String(value)
}
