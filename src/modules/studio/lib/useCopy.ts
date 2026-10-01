import { useCallback, useEffect, useRef, useState } from 'react'

/** Copia al portapapeles y muestra "copiado" 2 segundos. */
export function useCopy() {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | null>(null)
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current) }, [])
  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      if (timer.current) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(false), 2000)
      return true
    } catch {
      return false
    }
  }, [])
  return { copied, copy }
}
