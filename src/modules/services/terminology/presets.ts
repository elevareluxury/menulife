import type { TerminologyTerms } from './types'

export interface TerminologyPreset {
  id: string
  label: string
  emoji: string
  description: string
  terms: Partial<TerminologyTerms>
}

export const TERMINOLOGY_PRESETS: TerminologyPreset[] = [
  {
    id: 'default',
    label: 'General',
    emoji: '🔧',
    description: 'Terminología genérica para cualquier negocio',
    terms: {},
  },
  {
    id: 'academia',
    label: 'Academia',
    emoji: '🎓',
    description: 'Academias, centros educativos, escuelas de idiomas',
    terms: {
      customers:   { singular: 'Alumno',     plural: 'Alumnos'      },
      resources:   { singular: 'Profesor',   plural: 'Profesores'   },
      services:    { singular: 'Curso',      plural: 'Cursos'       },
      bookings:    { singular: 'Clase',      plural: 'Clases'       },
      memberships: { singular: 'Inscripción',plural: 'Inscripciones'},
      packages:    { singular: 'Pack',       plural: 'Packs'        },
      documents:   { singular: 'Contrato',   plural: 'Contratos'    },
      quotes:      { singular: 'Propuesta',  plural: 'Propuestas'   },
    },
  },
  {
    id: 'gimnasio',
    label: 'Gimnasio',
    emoji: '💪',
    description: 'Gimnasios, CrossFit, centros de entrenamiento',
    terms: {
      customers:   { singular: 'Socio',       plural: 'Socios'        },
      resources:   { singular: 'Entrenador',  plural: 'Entrenadores'  },
      services:    { singular: 'Plan',        plural: 'Planes'        },
      bookings:    { singular: 'Clase',       plural: 'Clases'        },
      memberships: { singular: 'Membresía',   plural: 'Membresías'    },
      packages:    { singular: 'Pack',        plural: 'Packs'         },
      documents:   { singular: 'Contrato',    plural: 'Contratos'     },
      quotes:      { singular: 'Cotización',  plural: 'Cotizaciones'  },
    },
  },
  {
    id: 'estetica',
    label: 'Centro Estético',
    emoji: '✨',
    description: 'Spas, centros estéticos, barberías, peluquerías',
    terms: {
      customers:   { singular: 'Cliente',      plural: 'Clientes'      },
      resources:   { singular: 'Profesional',  plural: 'Profesionales' },
      services:    { singular: 'Tratamiento',  plural: 'Tratamientos'  },
      bookings:    { singular: 'Turno',        plural: 'Turnos'        },
      memberships: { singular: 'Bono',         plural: 'Bonos'         },
      packages:    { singular: 'Pack',         plural: 'Packs'         },
      documents:   { singular: 'Ficha',        plural: 'Fichas'        },
      quotes:      { singular: 'Presupuesto',  plural: 'Presupuestos'  },
    },
  },
  {
    id: 'cowork',
    label: 'Cowork',
    emoji: '🏢',
    description: 'Espacios de coworking y oficinas compartidas',
    terms: {
      customers:   { singular: 'Miembro',    plural: 'Miembros'     },
      resources:   { singular: 'Sala',       plural: 'Salas'        },
      services:    { singular: 'Espacio',    plural: 'Espacios'     },
      bookings:    { singular: 'Reserva',    plural: 'Reservas'     },
      memberships: { singular: 'Plan',       plural: 'Planes'       },
      packages:    { singular: 'Pack',       plural: 'Packs'        },
      documents:   { singular: 'Contrato',   plural: 'Contratos'    },
      quotes:      { singular: 'Cotización', plural: 'Cotizaciones' },
    },
  },
  {
    id: 'inmobiliaria',
    label: 'Inmobiliaria',
    emoji: '🏠',
    description: 'Agencias inmobiliarias y gestión de propiedades',
    terms: {
      customers:   { singular: 'Prospecto',  plural: 'Prospectos'   },
      resources:   { singular: 'Agente',     plural: 'Agentes'      },
      services:    { singular: 'Visita',     plural: 'Visitas'      },
      bookings:    { singular: 'Reunión',    plural: 'Reuniones'    },
      memberships: { singular: 'Plan',       plural: 'Planes'       },
      packages:    { singular: 'Pack',       plural: 'Packs'        },
      documents:   { singular: 'Contrato',   plural: 'Contratos'    },
      quotes:      { singular: 'Tasación',   plural: 'Tasaciones'   },
    },
  },
  {
    id: 'consultoria',
    label: 'Consultoría',
    emoji: '💼',
    description: 'Consultoras, estudios jurídicos, contables y de auditoría',
    terms: {
      customers:   { singular: 'Cliente',    plural: 'Clientes'     },
      resources:   { singular: 'Consultor',  plural: 'Consultores'  },
      services:    { singular: 'Sesión',     plural: 'Sesiones'     },
      bookings:    { singular: 'Cita',       plural: 'Citas'        },
      memberships: { singular: 'Retainer',   plural: 'Retainers'    },
      packages:    { singular: 'Paquete',    plural: 'Paquetes'     },
      documents:   { singular: 'Propuesta',  plural: 'Propuestas'   },
      quotes:      { singular: 'Cotización', plural: 'Cotizaciones' },
    },
  },
  {
    id: 'salud',
    label: 'Salud y Bienestar',
    emoji: '🩺',
    description: 'Psicólogos, médicos, nutricionistas, coaches de vida',
    terms: {
      customers:   { singular: 'Paciente',   plural: 'Pacientes'    },
      resources:   { singular: 'Profesional',plural: 'Profesionales'},
      services:    { singular: 'Consulta',   plural: 'Consultas'    },
      bookings:    { singular: 'Turno',      plural: 'Turnos'       },
      memberships: { singular: 'Plan',       plural: 'Planes'       },
      packages:    { singular: 'Paquete',    plural: 'Paquetes'     },
      documents:   { singular: 'Historia',   plural: 'Historias'    },
      quotes:      { singular: 'Presupuesto',plural: 'Presupuestos' },
    },
  },
]

export function getPresetById(id: string): TerminologyPreset | undefined {
  return TERMINOLOGY_PRESETS.find(p => p.id === id)
}
