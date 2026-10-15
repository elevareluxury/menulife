// "Vaciar la cabeza": muchas cosas juntas → una lista para revisar. Todo en el dispositivo: se separa el texto en
// cosas (una por línea, o por puntos; comas sólo si es una lista larga) y cada una se interpreta con las mismas
// reglas que el dictado (lib/voiceParse.ts). Nada se guarda sin que la persona lo revise.

import type { AppLang } from '@/i18n/app/languages'
import { parseVoice, type VoiceResult } from './voiceParse'

export interface DumpItem extends VoiceResult {
  /** Id estable para la lista (y para la fila que se guarda) */
  id: string
}

/** Hasta cuántas cosas por vez (y largo máximo del texto) */
export const DUMP_MAX_ITEMS = 60
export const DUMP_MAX_CHARS = 6000

// Viñetas y números al principio de una línea: "- ", "• ", "* ", "1. ", "2) ", "[ ] ", "[x] "
const BULLET = /^\s*(?:[-–—•*·▪◦]+|\d{1,2}[.)](?=\s)|\[[ xX]?\])\s*/u
// Fin de oración seguido de espacio (no corta "3.500", "10.30" ni la "p." de "p.m.")
const SENTENCE = /(?<![\s.]\p{L})[.!?;؟؛](?=\s)|[。！？；।]/u
// Comas de una lista: con espacio después en alfabetos con espacios; las de CJK y la árabe, siempre
const COMMA = /,(?=\s)|[，、،]/u

const clean = (s: string) => s.replace(BULLET, '').replace(/\s+/g, ' ').trim()
/** Algo con letras o números (no sólo signos) */
const meaningful = (s: string) => /[\p{L}\p{N}]/u.test(s)

/** Separa el texto en cosas: una por línea; dentro de una línea, por oraciones; por comas, sólo si quedan 3 o más. */
export function splitDump(input: string): string[] {
  const out: string[] = []
  for (const line of input.slice(0, DUMP_MAX_CHARS).split(/\r?\n/)) {
    const sentences = line.replace(BULLET, '').split(new RegExp(SENTENCE.source, 'gu'))
    for (const sentence of sentences) {
      // "pan, leche y huevos" o "mañana a las 10, llamar al médico" son una sola cosa; "a, b, c" es una lista
      const parts = sentence.split(new RegExp(COMMA.source, 'gu')).map(clean)
      const pieces = parts.length >= 3 && parts.every(p => p.length >= 2) ? parts : [clean(sentence)]
      for (const p of pieces) if (meaningful(p)) out.push(p)
    }
  }
  return out.slice(0, DUMP_MAX_ITEMS)
}

let seq = 0
const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `dump-${Date.now()}-${++seq}`)

/** Cada cosa con su tipo, monto, fecha y hora (las mismas reglas que el dictado). */
export function parseDump(input: string, lang: AppLang, now = new Date()): DumpItem[] {
  return splitDump(input)
    .map(line => {
      const r = parseVoice(line, lang, now)
      // Si al sacar las palabras clave no queda nada ("gasté 500"), se usa la línea tal cual
      return { ...r, text: r.text || line.slice(0, 200), id: newId() }
    })
}
