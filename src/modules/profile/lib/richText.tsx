import type { ReactNode } from 'react'
import { isExternal, safeHref } from './safeUrl'

/**
 * Formato básico y seguro para el texto del dueño (sin HTML: todo se arma como elementos de React):
 *   **negrita** · [texto](link) · links sueltos (https://… o www.…) · listas con "- " o "• " al principio de la línea.
 * Un link que no pasa `safeHref` queda como texto.
 */
const INLINE = /\*\*([^*\n]+)\*\*|\[([^\]\n]{1,120})\]\(([^)\s]{1,400})\)|((?:https?:\/\/|www\.)[^\s<>()]+[^\s<>().,;:!?'"])/g

function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  let n = 0
  for (const m of text.matchAll(INLINE)) {
    if (m.index! > last) out.push(text.slice(last, m.index))
    if (m[1]) out.push(<strong key={`${key}-${n++}`}>{m[1]}</strong>)
    else {
      const label = m[2] ?? m[4]
      const href = safeHref(m[3] ?? m[4])
      out.push(href
        ? <a key={`${key}-${n++}`} href={href} {...(isExternal(href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{label}</a>
        : m[0])
    }
    last = m.index! + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

const BULLET = /^\s*[-•*]\s+/

/** Bloques: párrafos (respetan los saltos de línea) y listas */
export function richText(body: string): ReactNode[] {
  const blocks: ReactNode[] = []
  const lines = body.replace(/\r\n?/g, '\n').split('\n')
  let para: string[] = []
  let list: string[] = []
  const flushPara = () => {
    if (para.join('').trim()) blocks.push(<p key={`p${blocks.length}`} className="mp-text-body">{inline(para.join('\n'), `p${blocks.length}`)}</p>)
    para = []
  }
  const flushList = () => {
    if (list.length) blocks.push(<ul key={`u${blocks.length}`} className="mp-text-list">{list.map((li, i) => <li key={i}>{inline(li, `l${blocks.length}-${i}`)}</li>)}</ul>)
    list = []
  }
  for (const line of lines) {
    if (BULLET.test(line)) { flushPara(); list.push(line.replace(BULLET, '')) }
    else if (!line.trim()) { flushPara(); flushList() }
    else { flushList(); para.push(line) }
  }
  flushPara(); flushList()
  return blocks
}
