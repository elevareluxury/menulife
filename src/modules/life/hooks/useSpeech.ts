import { nativePlatform } from '@/lib/platform'
import { useCallback, useEffect, useRef, useState } from 'react'

// Dictado con el reconocimiento de voz del navegador (Chrome, Edge, Safari en iPhone/Mac, Android). En Chrome el
// audio lo procesa el servicio de voz del navegador (Google); Mycen sólo recibe el texto.

interface SpeechAlternative { transcript: string }
interface SpeechResult { isFinal: boolean; 0: SpeechAlternative; length: number }
interface SpeechEvent { resultIndex: number; results: ArrayLike<SpeechResult> }
interface Recognition {
  lang: string
  interimResults: boolean
  continuous: boolean
  maxAlternatives: number
  onresult: ((e: SpeechEvent) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}
type RecognitionCtor = new () => Recognition

function ctor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null
  // En la app (iOS y Android) no se ofrece dictar: el WebView de Android trae el objeto pero no reconoce nada, y la
  // de iOS no declara permisos de micrófono ni de voz (pedirlos sin declararlos cierra la app). Vuelve nativo en V1.1
  if (nativePlatform() !== 'web') return null
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export const speechSupported = () => ctor() != null

export type SpeechError = 'no-speech' | 'denied' | 'failed'

export function useSpeech(lang: string) {
  const [listening, setListening] = useState(false)
  const [text, setText] = useState('')
  const [final, setFinal] = useState<string | null>(null)
  const [error, setError] = useState<SpeechError | null>(null)
  const rec = useRef<Recognition | null>(null)

  const stop = useCallback(() => rec.current?.stop(), [])

  const start = useCallback(() => {
    const C = ctor()
    if (!C) { setError('failed'); return }
    rec.current?.abort()
    const r = new C()
    r.lang = lang
    r.interimResults = true
    r.continuous = false
    r.maxAlternatives = 1
    let heard = ''
    r.onresult = e => {
      let interim = ''
      let done = ''
      for (let i = 0; i < e.results.length; i++) {
        const res = e.results[i]
        if (res.isFinal) done += res[0].transcript; else interim += res[0].transcript
      }
      heard = (done + interim).trim()
      setText(heard)
    }
    r.onerror = e => setError(e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'denied' : e.error === 'no-speech' ? 'no-speech' : 'failed')
    r.onend = () => {
      setListening(false)
      if (heard) setFinal(heard)
      else setError(prev => prev ?? 'no-speech')
    }
    rec.current = r
    setText(''); setFinal(null); setError(null); setListening(true)
    try { r.start() } catch { setListening(false); setError('failed') }
  }, [lang])

  useEffect(() => () => rec.current?.abort(), [])

  return { listening, text, final, error, start, stop }
}
