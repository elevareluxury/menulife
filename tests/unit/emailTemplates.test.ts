import { execFileSync } from 'child_process'
import { mkdtempSync, readdirSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { APP_LANGS } from '../../src/i18n/app/languages'

// Mails de Supabase Auth (Lanzamiento L3c): lo que está en supabase/templates sale del generador y cubre los 12 idiomas.

const DIR = 'supabase/templates'
const htmlFiles = readdirSync(DIR).filter(f => f.endsWith('.html'))

describe('plantillas de mail', () => {
  it('están al día con scripts/build-email-templates.mjs', () => {
    const out = mkdtempSync(join(tmpdir(), 'mails-'))
    execFileSync('node', ['scripts/build-email-templates.mjs'], { env: { ...process.env, OUT_DIR: out } })
    const generated = readdirSync(out).sort()
    expect(generated).toEqual(readdirSync(DIR).filter(f => f !== 'LEEME.md').sort())
    for (const f of generated) expect(readFileSync(join(DIR, f), 'utf8'), f).toBe(readFileSync(join(out, f), 'utf8'))
  })

  it.each(htmlFiles)('%s tiene los 12 idiomas, el árabe de derecha a izquierda y el link o el código', file => {
    const src = readFileSync(join(DIR, file), 'utf8')
    for (const lang of APP_LANGS.filter(l => l !== 'es')) expect(src).toContain(`eq $l "${lang}"`)
    expect(src).toContain('{{ else }}')                          // español: sin locale o con uno desconocido
    expect(src).toContain('{{ with .Data }}{{ with .locale }}')  // una cuenta sin metadata no rompe la plantilla
    expect(src).toContain('dir="{{ if eq $l "ar" }}rtl')
    expect(src.includes('{{ .ConfirmationURL }}') || src.includes('{{ .Token }}')).toBe(true)
    const opens = (src.match(/\{\{ (if|with) /g) ?? []).length
    const ends = (src.match(/\{\{ end \}\}/g) ?? []).length
    expect(ends).toBe(opens)
  })

  it('los asuntos entran en el límite de Supabase (255) y caen en inglés para los idiomas que no entran', () => {
    const md = readFileSync(join(DIR, 'asuntos.md'), 'utf8')
    const subjects = md.split('```').filter((_, i) => i % 2).map(b => b.trim())
    expect(subjects).toHaveLength(htmlFiles.length)
    for (const s of subjects) {
      expect(s.length).toBeLessThanOrEqual(255)
      expect(s).toContain('{{with .Data}}{{with .locale}}')
      expect(s).toContain('{{if eq $l "es"}}')
      expect(s).toMatch(/\{\{else\}\}[^{]+\{\{end\}\}$/)   // los que no entran: inglés
    }
  })
})
