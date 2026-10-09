import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { RESERVED_USERNAMES } from '@/lib/reservedUsernames'

// La lista de usernames reservados vive en 3 lugares (docs/identity/03, R11). Este test falla si se desincronizan.

const root = join(__dirname, '..', '..')

function sqlReserved(): Set<string> {
  const out = new Set<string>()
  const dir = join(root, 'supabase', 'migrations')
  for (const file of readdirSync(dir).filter(f => f.endsWith('.sql'))) {
    const sql = readFileSync(join(dir, file), 'utf8')
    for (const block of sql.matchAll(/insert into public\.reserved_usernames[^;]*;/gi)) {
      for (const m of block[0].matchAll(/\('([a-z0-9_.-]+)'\s*,/g)) out.add(m[1])
    }
  }
  return out
}

function ogReserved(): Set<string> {
  const src = readFileSync(join(root, 'api', 'og.ts'), 'utf8')
  const block = /const RESERVED = new Set\(\[([\s\S]*?)\]\)/.exec(src)?.[1] ?? ''
  return new Set([...block.matchAll(/'([^']+)'/g)].map(m => m[1]))
}

function appTopLevelRoutes(): string[] {
  // Las rutas sólo de desarrollo (`{DevXxx && <Route …>}`, detrás de import.meta.env.DEV) no existen en producción
  const src = readFileSync(join(root, 'src', 'app', 'App.tsx'), 'utf8')
    .split('\n').filter(line => !/\{Dev\w+ && <Route/.test(line)).join('\n')
  return [...new Set([...src.matchAll(/<Route path="\/([a-z0-9-]+)/g)].map(m => m[1]))]
}

describe('usernames reservados', () => {
  it('la lista del frontend coincide con la de la base', () => {
    expect([...RESERVED_USERNAMES].sort()).toEqual([...sqlReserved()].sort())
  })

  it('api/og.ts no reserva nada que la app permita', () => {
    const extra = [...ogReserved()].filter(u => !RESERVED_USERNAMES.has(u))
    expect(extra).toEqual([])
  })

  it('cada ruta de primer nivel de la app está reservada (nadie puede tomarla como username)', () => {
    const free = appTopLevelRoutes().filter(r => !RESERVED_USERNAMES.has(r))
    expect(free).toEqual([])
  })
})
