import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import {
  RESERVED_SPACE_SLUGS, normalizeSpaceSlug, pickSpace, spaceHandle, spaceSlugIssue, suggestSpaceSlug, type SpaceSummary,
} from '@/modules/studio/lib/spaces'

// Mis Spaces (Identity Fase 10): direcciones /ana y /ana/estudio, y qué Space abre Studio.

const space = (over: Partial<SpaceSummary>): SpaceSummary => ({
  id: 'x', username: null, space_slug: null, display_name: '', avatar_url: null, status: 'published', visibility: 'public',
  is_primary: false, restaurant_id: null, purpose: null, suspended_at: null, updated_at: '', published_version_id: null, ...over,
})
const main = space({ id: 'main', username: 'ana', is_primary: true })
const estudio = space({ id: 'est', space_slug: 'estudio' })

describe('Spaces', () => {
  it('los slugs reservados son los mismos que en la base', () => {
    const sql = readFileSync(join(__dirname, '..', '..', 'supabase', 'migrations', '20261012000001_identity_spaces.sql'), 'utf8')
    const block = /mycen_reserved_space_slug[\s\S]*?array\[([\s\S]*?)\]/.exec(sql)?.[1] ?? ''
    expect(new Set([...block.matchAll(/'([^']+)'/g)].map(m => m[1]))).toEqual(RESERVED_SPACE_SLUGS)
  })

  it('normaliza y valida la dirección como la base', () => {
    expect(normalizeSpaceSlug('Café Luna Estudio')).toBe('cafe-luna-estudio')
    expect(normalizeSpaceSlug('Mi ')).toBe('mi-') // mientras se escribe
    expect(spaceSlugIssue('cafe-luna', [main, estudio])).toBeNull()
    expect(spaceSlugIssue('estudio', [main, estudio])).toBe('taken')
    expect(spaceSlugIssue('estudio', [main, estudio], 'est')).toBeNull()
    expect(spaceSlugIssue('projects', [])).toBe('reserved')
    expect(spaceSlugIssue('a', [])).toBe('invalid')
    expect(spaceSlugIssue('mal--slug', [])).toBe('invalid')
    expect(spaceSlugIssue('termina-', [])).toBe('invalid')
  })

  it('sugiere una dirección libre a partir del nombre', () => {
    expect(suggestSpaceSlug('Estudio', [main, estudio])).toBe('estudio-2')
    expect(suggestSpaceSlug('Projects', [])).toBe('projects-2')
    expect(suggestSpaceSlug('!!', [])).toBe('mi-space')
  })

  it('arma la dirección pública', () => {
    expect(spaceHandle(main, 'ana')).toBe('ana')
    expect(spaceHandle(estudio, 'ana')).toBe('ana/estudio')
  })

  it('abre el Space recordado si sigue activo; si no, el principal', () => {
    const archived = space({ id: 'arch', space_slug: 'viejo', status: 'archived' })
    expect(pickSpace([main, estudio, archived], 'est')?.id).toBe('est')
    expect(pickSpace([main, estudio, archived], 'arch')?.id).toBe('main')
    expect(pickSpace([main, estudio], 'otro')?.id).toBe('main')
    expect(pickSpace([], null)).toBeUndefined()
  })
})
