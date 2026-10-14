import { describe, expect, it } from 'vitest'
import { isStaleChunkError } from '../../src/lib/staleChunk'

describe('isStaleChunkError', () => {
  it('reconoce los mensajes de cada navegador', () => {
    for (const m of [
      'Failed to fetch dynamically imported module: https://mycen.id/assets/AnalyticsPage-abc.js',
      'error loading dynamically imported module: https://mycen.id/assets/x.js',
      'Importing a module script failed.',
      'Unable to preload CSS for /assets/AnalyticsPage-abc.css',
      "'text/html' is not a valid JavaScript MIME type.",
    ]) expect(isStaleChunkError(new TypeError(m)), m).toBe(true)
  })

  it('no confunde otros errores', () => {
    expect(isStaleChunkError(new Error('Cannot read properties of undefined'))).toBe(false)
    expect(isStaleChunkError(new Error('Failed to fetch'))).toBe(false)
    expect(isStaleChunkError(null)).toBe(false)
  })
})
