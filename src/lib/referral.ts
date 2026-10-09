// "Creá tu identidad" (V1 · etapa 08): /register?ref=<handle>&tipo=<propósito>. El registro guarda ref y tipo en los
// datos de la cuenta; el onboarding preselecciona el tipo y, al crear el perfil, lo atribuye con record_referral.

export interface Referral { ref: string; purpose: string | null }

const HANDLE = /^[a-z0-9][a-z0-9_-]{0,62}(\/[a-z0-9][a-z0-9-]{0,39})?$/
const PURPOSE = /^[a-z_]{1,30}$/

/** Lee ?ref y ?tipo de la URL; si ref no es un handle válido, no hay referido. */
export function parseReferral(search: string): Referral | null {
  const q = new URLSearchParams(search)
  const ref = (q.get('ref') ?? '').trim().toLowerCase()
  if (!HANDLE.test(ref)) return null
  const tipo = (q.get('tipo') ?? '').trim().toLowerCase()
  return { ref, purpose: PURPOSE.test(tipo) ? tipo : null }
}

/** Lo que guardó el registro en los datos de la cuenta (user_metadata.ref / ref_purpose). */
export function referralFromMetadata(meta: Record<string, unknown> | null | undefined): Referral | null {
  const ref = typeof meta?.ref === 'string' ? meta.ref : ''
  if (!HANDLE.test(ref)) return null
  const purpose = typeof meta?.ref_purpose === 'string' && PURPOSE.test(meta.ref_purpose) ? meta.ref_purpose : null
  return { ref, purpose }
}
