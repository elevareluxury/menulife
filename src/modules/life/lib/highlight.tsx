import type { ReactNode } from 'react'

/**
 * Devuelve el texto con ocurrencias del término resaltadas como <mark>.
 * Ignora términos < 2 caracteres para no marcar "a", "y", etc.
 * Usa idx%2===1 con regex de captura para evitar el bug de lastIndex.
 */
export function highlightTerm(text: string | null, term: string): ReactNode {
  if (!text) return null
  if (!term || term.length < 2) return text

  // Limpiar operadores de FTS y tokenizar
  const cleanTerm = term.replace(/[+\-"()|:*]/g, ' ').trim()
  const terms = cleanTerm
    .split(/\s+/)
    .filter(t => t.length >= 2)
    .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))

  if (terms.length === 0) return text

  const pattern = new RegExp(`(${terms.join('|')})`, 'gi')
  const parts = text.split(pattern)

  return parts.map((part, idx) => {
    if (!part) return null
    // Con regex de captura, los índices impares son los matches
    if (idx % 2 === 1) {
      return (
        <mark
          key={idx}
          style={{
            background: 'rgba(129,140,248,0.30)',
            color: '#fff',
            padding: '1px 2px',
            borderRadius: 3,
          }}
        >
          {part}
        </mark>
      )
    }
    return <span key={idx}>{part}</span>
  })
}
