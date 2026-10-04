import { useMemo } from 'react'
import { useAppLang } from '@/i18n/app/store'

/** Parte un texto en palabras (también chino/japonés, que no usan espacios) con Intl.Segmenter si está disponible. */
function splitWords(text: string, lang: string): string[] {
  const Seg = (Intl as unknown as { Segmenter?: new (l: string, o: { granularity: 'word' }) => { segment: (t: string) => Iterable<{ segment: string }> } }).Segmenter
  if (Seg) {
    // Se juntan los signos con la palabra anterior para no dejar una coma sola en otra línea
    const out: string[] = []
    for (const { segment } of new Seg(lang, { granularity: 'word' }).segment(text)) {
      if (/^\s+$/.test(segment)) out.push(segment)
      else if (out.length && /^[\p{P}\p{S}]+$/u.test(segment) && !/^\s+$/.test(out[out.length - 1])) out[out.length - 1] += segment
      else out.push(segment)
    }
    return out
  }
  return text.split(/(\s+)/)
}

/**
 * Texto que entra palabra por palabra (lo anima `useLandingMotion` con `data-split` en el título que lo contiene).
 * Lo dibuja React (no Splitting), así que cambiar de idioma no rompe nada. Los lectores de pantalla leen la frase entera.
 */
export function SplitText({ text }: { text: string }) {
  const lang = useAppLang(s => s.lang)
  const parts = useMemo(() => splitWords(text, lang), [text, lang])
  return (
    <>
      <span className="ml-sr-only">{text}</span>
      <span aria-hidden="true">
        {parts.map((p, i) => /^\s+$/.test(p)
          ? <span key={i}>{p}</span>
          : <span key={i} className="ml-word"><span data-word className="ml-word-inner">{p}</span></span>)}
      </span>
    </>
  )
}
