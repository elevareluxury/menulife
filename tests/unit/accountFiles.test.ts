import { describe, expect, it, vi } from 'vitest'

// Borrar los archivos de una cuenta también recorre las subcarpetas (auditoría N6) y cuenta lo que se borró de verdad
const files: Record<string, string[]> = {
  'profile-media': ['u1/a.webp', 'u1/x/b.webp', 'u1/x/y/c.webp'],
  'profile-files': ['u1/doc.pdf'],
}
const removed: string[] = []

function list(bucket: string, prefix: string) {
  const names = new Map<string, boolean>()
  for (const f of files[bucket]) {
    if (!f.startsWith(`${prefix}/`)) continue
    const rest = f.slice(prefix.length + 1)
    const [head, ...tail] = rest.split('/')
    names.set(head, tail.length > 0)
  }
  return [...names].map(([name, folder]) => ({ name, id: folder ? null : `id-${name}` }))
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: (bucket: string) => ({
        list: async (prefix: string, opts: { offset?: number }) => ({ data: (opts.offset ?? 0) > 0 ? [] : list(bucket, prefix), error: null }),
        remove: async (paths: string[]) => { removed.push(...paths); return { data: paths.map(name => ({ name })), error: null } },
      }),
    },
  },
}))

describe('removeAccountFiles', () => {
  it('borra también lo que está en subcarpetas', async () => {
    const { removeAccountFiles } = await import('../../src/lib/accountFiles')
    expect(await removeAccountFiles('u1')).toBe(4)
    expect(removed.sort()).toEqual(['u1/a.webp', 'u1/doc.pdf', 'u1/x/b.webp', 'u1/x/y/c.webp'])
  })
})
