// ─── Locale utilities: dates, numbers, timezones ─────────────────────────────
// All formatting is powered by Intl — no external dependencies.

import type { DateFormat, TimeFormat, NumberFormat } from '@/modules/globalization/globalizationTypes'

// ─── Date format options ──────────────────────────────────────────────────────

export const DATE_FORMAT_OPTIONS: Array<{ value: DateFormat; label: string; example: string }> = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY',  example: '12/06/2026' },   // LATAM, Europe
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY',  example: '06/12/2026' },   // US
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD',  example: '2026-06-12' },   // ISO 8601
  { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY',  example: '12-06-2026' },
  { value: 'DD.MM.YYYY', label: 'DD.MM.YYYY',  example: '12.06.2026' },   // Germany
]

// ─── Number format options ────────────────────────────────────────────────────

export const NUMBER_FORMAT_OPTIONS: Array<{ value: NumberFormat; label: string; example: string }> = [
  { value: 'en-US', label: '1,000.50 (US / UK)',    example: '1,234.56' },
  { value: 'es-AR', label: '1.000,50 (LATAM)',       example: '1.234,56' },
  { value: 'de-DE', label: '1.000,50 (Europa)',      example: '1.234,56' },
  { value: 'fr-FR', label: '1 000,50 (Francia)', example: '1 234,56' },
  { value: 'pt-BR', label: '1.000,50 (Brasil)',      example: '1.234,56' },
  { value: 'ja-JP', label: '1,000 (Japón)',          example: '1,234'    },
]

// ─── Common IANA timezones (grouped for UI) ───────────────────────────────────

export const TIMEZONES: Array<{ group: string; zones: Array<{ value: string; label: string; offset: string }> }> = [
  {
    group: 'América Latina',
    zones: [
      { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires',         offset: 'UTC-3'  },
      { value: 'America/Sao_Paulo',              label: 'São Paulo',             offset: 'UTC-3'  },
      { value: 'America/Santiago',               label: 'Santiago de Chile',     offset: 'UTC-3'  },
      { value: 'America/Montevideo',             label: 'Montevideo',            offset: 'UTC-3'  },
      { value: 'America/Asuncion',               label: 'Asunción',              offset: 'UTC-4'  },
      { value: 'America/La_Paz',                 label: 'La Paz / Sucre',        offset: 'UTC-4'  },
      { value: 'America/Lima',                   label: 'Lima',                  offset: 'UTC-5'  },
      { value: 'America/Bogota',                 label: 'Bogotá',                offset: 'UTC-5'  },
      { value: 'America/Guayaquil',              label: 'Quito / Guayaquil',     offset: 'UTC-5'  },
      { value: 'America/Mexico_City',            label: 'Ciudad de México',      offset: 'UTC-6'  },
      { value: 'America/Guatemala',              label: 'Guatemala City',        offset: 'UTC-6'  },
      { value: 'America/Costa_Rica',             label: 'San José',              offset: 'UTC-6'  },
      { value: 'America/Caracas',                label: 'Caracas',               offset: 'UTC-4'  },
      { value: 'America/Havana',                 label: 'La Habana',             offset: 'UTC-5'  },
      { value: 'America/Santo_Domingo',          label: 'Santo Domingo',         offset: 'UTC-4'  },
      { value: 'America/Puerto_Rico',            label: 'San Juan',              offset: 'UTC-4'  },
    ],
  },
  {
    group: 'América del Norte',
    zones: [
      { value: 'America/New_York',     label: 'New York (Eastern)',    offset: 'UTC-5' },
      { value: 'America/Chicago',      label: 'Chicago (Central)',     offset: 'UTC-6' },
      { value: 'America/Denver',       label: 'Denver (Mountain)',     offset: 'UTC-7' },
      { value: 'America/Los_Angeles',  label: 'Los Angeles (Pacific)', offset: 'UTC-8' },
      { value: 'America/Toronto',      label: 'Toronto',               offset: 'UTC-5' },
      { value: 'America/Vancouver',    label: 'Vancouver',             offset: 'UTC-8' },
    ],
  },
  {
    group: 'Europa',
    zones: [
      { value: 'Europe/London',    label: 'Londres',      offset: 'UTC+0' },
      { value: 'Europe/Paris',     label: 'París',        offset: 'UTC+1' },
      { value: 'Europe/Madrid',    label: 'Madrid',       offset: 'UTC+1' },
      { value: 'Europe/Berlin',    label: 'Berlín',       offset: 'UTC+1' },
      { value: 'Europe/Rome',      label: 'Roma',         offset: 'UTC+1' },
      { value: 'Europe/Amsterdam', label: 'Ámsterdam',    offset: 'UTC+1' },
      { value: 'Europe/Zurich',    label: 'Zúrich',       offset: 'UTC+1' },
      { value: 'Europe/Lisbon',    label: 'Lisboa',       offset: 'UTC+0' },
      { value: 'Europe/Moscow',    label: 'Moscú',        offset: 'UTC+3' },
      { value: 'Europe/Istanbul',  label: 'Estambul',     offset: 'UTC+3' },
    ],
  },
  {
    group: 'Asia-Pacífico',
    zones: [
      { value: 'Asia/Tokyo',          label: 'Tokio',         offset: 'UTC+9'    },
      { value: 'Asia/Shanghai',       label: 'Shanghái',      offset: 'UTC+8'    },
      { value: 'Asia/Seoul',          label: 'Seúl',          offset: 'UTC+9'    },
      { value: 'Asia/Singapore',      label: 'Singapur',      offset: 'UTC+8'    },
      { value: 'Asia/Hong_Kong',      label: 'Hong Kong',     offset: 'UTC+8'    },
      { value: 'Asia/Bangkok',        label: 'Bangkok',       offset: 'UTC+7'    },
      { value: 'Asia/Jakarta',        label: 'Yakarta',       offset: 'UTC+7'    },
      { value: 'Asia/Kolkata',        label: 'Mumbai / Delhi',offset: 'UTC+5:30' },
      { value: 'Asia/Dubai',          label: 'Dubái',         offset: 'UTC+4'    },
      { value: 'Asia/Riyadh',         label: 'Riad',          offset: 'UTC+3'    },
      { value: 'Asia/Jerusalem',      label: 'Tel Aviv',      offset: 'UTC+2'    },
      { value: 'Australia/Sydney',    label: 'Sídney',        offset: 'UTC+10'   },
      { value: 'Australia/Melbourne', label: 'Melbourne',     offset: 'UTC+10'   },
      { value: 'Pacific/Auckland',    label: 'Auckland',      offset: 'UTC+12'   },
    ],
  },
  {
    group: 'África',
    zones: [
      { value: 'Africa/Cairo',         label: 'El Cairo',          offset: 'UTC+2' },
      { value: 'Africa/Johannesburg',  label: 'Johannesburgo',     offset: 'UTC+2' },
      { value: 'Africa/Lagos',         label: 'Lagos',             offset: 'UTC+1' },
      { value: 'Africa/Nairobi',       label: 'Nairobi',           offset: 'UTC+3' },
      { value: 'Africa/Casablanca',    label: 'Casablanca',        offset: 'UTC+1' },
    ],
  },
  {
    group: 'UTC',
    zones: [
      { value: 'UTC', label: 'UTC (Coordinado)', offset: 'UTC+0' },
    ],
  },
]

// Flat list for simple select elements
export const TIMEZONE_OPTIONS = TIMEZONES.flatMap(g =>
  g.zones.map(z => ({ value: z.value, label: `${z.label} (${z.offset})`, group: g.group }))
)

// ─── Date formatting ──────────────────────────────────────────────────────────

/**
 * Format a date using the business's configured date format.
 * Uses Intl.DateTimeFormat internally — DST and timezone-safe.
 *
 * @example formatDate('2026-06-12T14:00:00Z', 'DD/MM/YYYY', 'America/Argentina/Buenos_Aires')
 *   → '12/06/2026'
 */
export function formatDate(
  date:      string | Date,
  format:    DateFormat  = 'DD/MM/YYYY',
  timezone?: string,
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return ''

  const opts: Intl.DateTimeFormatOptions = {
    day:      '2-digit',
    month:    '2-digit',
    year:     'numeric',
    timeZone: timezone,
  }
  const parts = new Intl.DateTimeFormat('en-CA', opts).formatToParts(d)
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '00'
  const [DD, MM, YYYY] = [get('day'), get('month'), get('year')]

  switch (format) {
    case 'DD/MM/YYYY': return `${DD}/${MM}/${YYYY}`
    case 'MM/DD/YYYY': return `${MM}/${DD}/${YYYY}`
    case 'YYYY-MM-DD': return `${YYYY}-${MM}-${DD}`
    case 'DD-MM-YYYY': return `${DD}-${MM}-${YYYY}`
    case 'DD.MM.YYYY': return `${DD}.${MM}.${YYYY}`
    default:           return `${DD}/${MM}/${YYYY}`
  }
}

/**
 * Format time as HH:MM (24h) or h:MM AM/PM (12h).
 */
export function formatTime(
  date:      string | Date,
  format:    TimeFormat  = '24h',
  timezone?: string,
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return ''

  const opts: Intl.DateTimeFormatOptions = {
    hour:     '2-digit',
    minute:   '2-digit',
    hour12:   format === '12h',
    timeZone: timezone,
  }
  return new Intl.DateTimeFormat('en', opts).format(d)
}

/**
 * Format a number using locale-aware separators.
 * @example formatNumber(1234567.89, 'es-AR')  → '1.234.567,89'
 * @example formatNumber(1234567.89, 'en-US')  → '1,234,567.89'
 */
export function formatNumber(
  value:  number,
  locale: NumberFormat | string = 'es-AR',
  opts?:  Intl.NumberFormatOptions,
): string {
  try {
    return new Intl.NumberFormat(locale, opts).format(value)
  } catch {
    return String(value)
  }
}

/** Combined date + time string */
export function formatDateTime(
  date:        string | Date,
  dateFormat?: DateFormat,
  timeFormat?: TimeFormat,
  timezone?:   string,
): string {
  return `${formatDate(date, dateFormat, timezone)} ${formatTime(date, timeFormat, timezone)}`.trim()
}
