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
    // Módulos de bio (V1.1): la base ya acepta los 5 tipos y cada uno se suma a la app por separado.
    // Cuando estén los 5 en MODULE_TYPES, volver a la igualdad estricta.
    const pendingBio = ['support', 'subscribe', 'latest_video', 'listen_on', 'collab']
    expect(MODULE_TYPES.filter(t => !sql.includes(t))).toEqual([])
    expect(sql.filter(t => !(MODULE_TYPES as readonly string[]).includes(t) && !pendingBio.includes(t))).toEqual([])
  })
})
