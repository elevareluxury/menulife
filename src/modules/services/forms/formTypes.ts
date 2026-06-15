import {
  Type, AlignLeft, Hash, Mail, Phone, Calendar, CalendarDays,
  ChevronDown, ListChecks, Circle, CheckSquare, Paperclip,
  PenLine, Link, Banknote, Star, ToggleLeft,
  type LucideIcon,
} from 'lucide-react'

export type FieldType =
  | 'text' | 'textarea' | 'number' | 'email' | 'phone'
  | 'date' | 'datetime' | 'select' | 'multiselect' | 'radio'
  | 'checkbox' | 'file' | 'signature' | 'url' | 'currency' | 'rating' | 'boolean'

export type FormStatus = 'draft' | 'active' | 'archived'

export interface FieldVisibilityRule {
  conditions: Array<{
    field_id: string
    operator: 'eq' | 'neq' | 'contains' | 'gt' | 'lt'
    value:    unknown
  }>
  logic:  'AND' | 'OR'
  action: 'show' | 'hide'
}

export interface FormField {
  id:                     string
  template_id:            string
  restaurant_id:          string
  type:                   FieldType
  label:                  string
  placeholder:            string | null
  help_text:              string | null
  required:               boolean
  sort_order:             number
  settings_json:          Record<string, unknown>
  field_visibility_rules: FieldVisibilityRule | Record<string, never>
  created_at:             string
  updated_at:             string
}

export interface FormTemplate {
  id:            string
  restaurant_id: string
  name:          string
  description:   string | null
  status:        FormStatus
  is_public:     boolean
  slug:          string | null
  sort_order:    number
  metadata:      Record<string, unknown>
  created_at:    string
  updated_at:    string
}

export interface FormSubmission {
  id:            string
  restaurant_id: string
  template_id:   string
  customer_id:   string | null
  submitted_at:  string
  submitted_by:  string | null
  data_json:     Record<string, unknown>
  metadata:      Record<string, unknown>
  created_at:    string
  template?:     Pick<FormTemplate, 'id' | 'name'> | null
}

export interface FieldTypeConfig {
  label:           string
  icon:            LucideIcon
  description:     string
  defaultSettings: Record<string, unknown>
  group:           'basic' | 'choice' | 'advanced'
}

export const FIELD_TYPE_CONFIG: Record<FieldType, FieldTypeConfig> = {
  text:        { label: 'Texto corto',     icon: Type,        description: 'Una línea de texto',        defaultSettings: { maxLength: null },                 group: 'basic'    },
  textarea:    { label: 'Texto largo',     icon: AlignLeft,   description: 'Múltiples líneas',          defaultSettings: { rows: 4 },                        group: 'basic'    },
  number:      { label: 'Número',          icon: Hash,        description: 'Valor numérico',            defaultSettings: { min: null, max: null, step: 1 },   group: 'basic'    },
  email:       { label: 'Email',           icon: Mail,        description: 'Dirección de correo',       defaultSettings: {},                                 group: 'basic'    },
  phone:       { label: 'Teléfono',        icon: Phone,       description: 'Número de teléfono',       defaultSettings: {},                                 group: 'basic'    },
  date:        { label: 'Fecha',           icon: Calendar,    description: 'Solo fecha',                defaultSettings: {},                                 group: 'basic'    },
  datetime:    { label: 'Fecha y hora',    icon: CalendarDays,description: 'Fecha + hora',              defaultSettings: {},                                 group: 'basic'    },
  select:      { label: 'Selector',        icon: ChevronDown, description: 'Una opción de lista',       defaultSettings: { options: ['Opción 1', 'Opción 2'] },group: 'choice'  },
  multiselect: { label: 'Multi-opción',    icon: ListChecks,  description: 'Varias opciones posibles',  defaultSettings: { options: ['Opción 1', 'Opción 2'] },group: 'choice'  },
  radio:       { label: 'Opción única',    icon: Circle,      description: 'Botones de selección',      defaultSettings: { options: ['Sí', 'No'] },           group: 'choice'  },
  checkbox:    { label: 'Casilla',         icon: CheckSquare, description: 'Sí / No',                   defaultSettings: {},                                 group: 'choice'  },
  boolean:     { label: 'Verdadero/Falso', icon: ToggleLeft,  description: 'Toggle encendido/apagado',  defaultSettings: {},                                 group: 'choice'  },
  rating:      { label: 'Puntaje',         icon: Star,        description: 'Escala de calificación',    defaultSettings: { max: 5 },                         group: 'advanced' },
  currency:    { label: 'Monto',           icon: Banknote,    description: 'Valor monetario',           defaultSettings: { currency: 'ARS' },                 group: 'advanced' },
  url:         { label: 'URL',             icon: Link,        description: 'Dirección web',             defaultSettings: {},                                 group: 'advanced' },
  file:        { label: 'Archivo',         icon: Paperclip,   description: 'Subir documento o imagen',  defaultSettings: { accept: '*', maxSizeMb: 10 },      group: 'advanced' },
  signature:   { label: 'Firma',           icon: PenLine,     description: 'Firma digital (próxim.)',   defaultSettings: {},                                 group: 'advanced' },
}

export const FORM_STATUS_CONFIG: Record<FormStatus, { label: string; color: string; bg: string }> = {
  draft:    { label: 'Borrador', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)'  },
  active:   { label: 'Activo',   color: '#22C55E', bg: 'rgba(34,197,94,0.12)'   },
  archived: { label: 'Archivado',color: '#6B7280', bg: 'rgba(107,114,128,0.12)' },
}

export const FIELD_TYPE_GROUPS: Array<{ id: 'basic' | 'choice' | 'advanced'; label: string }> = [
  { id: 'basic',    label: 'Básicos'   },
  { id: 'choice',   label: 'Selección' },
  { id: 'advanced', label: 'Avanzados' },
]
