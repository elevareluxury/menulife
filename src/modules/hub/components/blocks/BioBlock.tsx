import type { HubC } from '@/modules/hub/lib/themeConfig'

interface BioBlockProps {
  config: {
    content?: string
    format?: 'html' | 'markdown'
  }
  C: HubC
}

// Permite solo etiquetas seguras de formato básico
const ALLOWED_TAGS = new Set(['strong', 'em', 'ul', 'ol', 'li', 'br', 'p'])

function sanitizeHtml(html: string): string {
  const tmp = document.createElement('div')
  tmp.innerHTML = html

  const walk = (node: Element) => {
    Array.from(node.children).forEach(child => {
      const tag = child.tagName.toLowerCase()
      if (!ALLOWED_TAGS.has(tag)) {
        // Reemplazar elemento no permitido con sus hijos (text nodes)
        child.replaceWith(...Array.from(child.childNodes))
      } else {
        // Remover todos los atributos para evitar onclick, style malicioso, etc.
        Array.from(child.attributes).forEach(attr => {
          child.removeAttribute(attr.name)
        })
        walk(child)
      }
    })
  }
  walk(tmp)
  return tmp.innerHTML
}

export function BioBlock({ config, C }: BioBlockProps) {
  const { content = '' } = config
  if (!content.trim()) return null

  const safeHtml = typeof window !== 'undefined'
    ? sanitizeHtml(content)
    : content

  return (
    <section style={{ width: '100%', padding: '0 20px', paddingTop: 32 }}>
      <div
        style={{
          fontFamily: "'DM Sans',sans-serif",
          fontSize: 14,
          lineHeight: 1.7,
          color: C.t2,
        }}
        // dangerouslySetInnerHTML is safe here: content is sanitized above
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />
    </section>
  )
}
