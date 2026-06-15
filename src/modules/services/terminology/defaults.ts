import type { TermKey, TermPair, TerminologyTerms } from './types'

export const DEFAULT_TERMS: TerminologyTerms = {
  customers:   { singular: 'Cliente',      plural: 'Clientes'      },
  resources:   { singular: 'Recurso',      plural: 'Recursos'      },
  services:    { singular: 'Servicio',     plural: 'Servicios'     },
  bookings:    { singular: 'Reserva',      plural: 'Reservas'      },
  memberships: { singular: 'Membresía',    plural: 'Membresías'    },
  packages:    { singular: 'Paquete',      plural: 'Paquetes'      },
  documents:   { singular: 'Documento',    plural: 'Documentos'    },
  quotes:      { singular: 'Presupuesto',  plural: 'Presupuestos'  },
}

export function resolveTerms(custom: Partial<TerminologyTerms>): TerminologyTerms {
  const result = {} as TerminologyTerms
  for (const key of Object.keys(DEFAULT_TERMS) as TermKey[]) {
    result[key] = custom[key] ?? DEFAULT_TERMS[key]
  }
  return result
}

export function getTerm(
  custom: Partial<TerminologyTerms>,
  key: TermKey,
  form: 'singular' | 'plural' = 'plural',
): string {
  return custom[key]?.[form] ?? DEFAULT_TERMS[key][form]
}

export interface TermMeta {
  key: TermKey
  defaultSingular: string
  defaultPlural: string
  description: string
}

export const TERM_META: TermMeta[] = [
  { key: 'customers',   defaultSingular: 'Cliente',     defaultPlural: 'Clientes',     description: 'Las personas que usan tu servicio' },
  { key: 'resources',   defaultSingular: 'Recurso',     defaultPlural: 'Recursos',     description: 'Personas, salas, equipos o espacios' },
  { key: 'services',    defaultSingular: 'Servicio',    defaultPlural: 'Servicios',    description: 'Lo que ofrecés con precio y duración' },
  { key: 'bookings',    defaultSingular: 'Reserva',     defaultPlural: 'Reservas',     description: 'Citas, turnos o sesiones agendadas' },
  { key: 'memberships', defaultSingular: 'Membresía',   defaultPlural: 'Membresías',   description: 'Planes de acceso recurrente' },
  { key: 'packages',    defaultSingular: 'Paquete',     defaultPlural: 'Paquetes',     description: 'Conjuntos de sesiones o servicios' },
  { key: 'documents',   defaultSingular: 'Documento',   defaultPlural: 'Documentos',   description: 'Contratos, formularios y archivos' },
  { key: 'quotes',      defaultSingular: 'Presupuesto', defaultPlural: 'Presupuestos', description: 'Propuestas económicas para clientes' },
]

// Utility — get effective pair with fallback
export function effectivePair(custom: Partial<TerminologyTerms>, key: TermKey): TermPair {
  return custom[key] ?? DEFAULT_TERMS[key]
}
