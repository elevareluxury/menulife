import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { MODULE_TYPES } from '@/modules/profile/lib/profileTypes'

// Los tipos de módulo de la app tienen que ser los mismos que acepta la base (`profile_modules_type_check`).
// Los registros público y de Studio son `Record<ModuleType, …>`: tsc obliga a que cubran esta lista.

const dir = join(__dirname, '..', '..', 'supabase', 'migrations')

function sqlModuleTypes(): string[] {
  let last: string[] = []
  for (const file of readdirSync(dir).filter(f => f.endsWith('.sql')).sort()) {
    const sql = readFileSync(join(dir, file), 'utf8')
    for (const m of sql.matchAll(/add constraint profile_modules_type_check check \(type in \(([^)]*)\)/gi)) {
      last = [...m[1].matchAll(/'([a-z_]+)'/g)].map(x => x[1])
    }
  }
  return last
}

describe('tipos de módulo', () => {
  it('coinciden con el check de la base (la última migración que lo define)', () => {
    const sql = sqlModuleTypes()
    expect(sql.length).toBeGreaterThan(0)
    expect([...MODULE_TYPES].sort()).toEqual([...sql].sort())
  })
})
