// Colaboraciones (módulo 'collab', V1.1): una marca propone una colaboración desde el perfil y llega a Studio → Mensajes.
// La lista de formatos es la misma que valida la base (mycen_valid_collab_details).

export const COLLAB_DELIVERABLES = ['post', 'video', 'story', 'event', 'ugc', 'other'] as const
export type CollabDeliverable = typeof COLLAB_DELIVERABLES[number]

/** profile_messages.details de una propuesta */
export interface CollabDetails {
  company: string
  website?: string
  deliverable: CollabDeliverable
  budget?: string
  deadline?: string
}

export const isCollabDeliverable = (v: unknown): v is CollabDeliverable =>
  typeof v === 'string' && (COLLAB_DELIVERABLES as readonly string[]).includes(v)

/** Web de la marca: sólo https con dominio (igual que la base); devuelve la URL limpia o null */
export function collabWebsite(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  if (s.length > 300 || !/^https:\/\/[^\s/?#]+\.[^\s/?#]+([/?#]\S*)?$/i.test(s)) return null
  try {
    return new URL(s).protocol === 'https:' ? s : null
  } catch {
    return null
  }
}

/** Lo que se puede mostrar de profile_messages.details (o null si no es una propuesta válida) */
export function readCollabDetails(v: unknown): CollabDetails | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null
  const d = v as Record<string, unknown>
  if (typeof d.company !== 'string' || !d.company.trim() || !isCollabDeliverable(d.deliverable)) return null
  const website = collabWebsite(d.website)
  return {
    company: d.company,
    deliverable: d.deliverable,
    ...(website ? { website } : {}),
    ...(typeof d.budget === 'string' && d.budget.trim() ? { budget: d.budget } : {}),
    ...(typeof d.deadline === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.deadline) ? { deadline: d.deadline } : {}),
  }
}
