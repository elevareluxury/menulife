import type { BrowserContext, Route } from '@playwright/test'
import { isModuleLive } from '../../../src/modules/profile/lib/moduleSchedule'

// Supabase simulado para los E2E: PostgREST en memoria (filtros básicos) + las RPC públicas de
// Identity con la misma lógica que la base (supabase/migrations/20261001000001… a 20261012000001…).
// Si cambia una RPC en la base, este archivo tiene que acompañarla.

type Row = Record<string, unknown>

export const OWNER_ID = '11111111-1111-4111-8111-111111111111'

export interface MockState {
  tables: Record<string, Row[]>
  /** old_username → profile_id (profile_username_history) */
  usernameHistory: Record<string, string>
  /** Llamadas a RPC, en orden */
  rpcCalls: { fn: string; args: Row }[]
  /** Respuesta de profile_traffic_sources (Fase 7) */
  trafficSources?: { source: string | null; referrer_host: string | null; visits: number; visitors: number }[]
  /** Escrituras por PostgREST, en orden */
  writes: { method: 'POST' | 'PATCH' | 'DELETE'; table: string; body: unknown }[]
}

export function profileRow(overrides: Row = {}): Row {
  const now = new Date().toISOString()
  return {
    id: 'p-ana', user_id: OWNER_ID, identity_id: 'id-ana', restaurant_id: null, username: 'ana', space_slug: null,
    display_name: 'Ana Pérez', descriptor: 'Diseñadora', bio: 'Hago marcas.',
    avatar_url: null, cover_url: null, purpose: 'professional', status: 'published', is_primary: true,
    theme: {}, primary_action: null, contact_card: { enabled: false }, default_locale: 'es', translations: {},
    tags: [], onboarding_step: 5, username_changed_at: null, published_at: now, created_at: now, updated_at: now,
    visibility: 'public', revision: 0, published_version_id: null, suspended_at: null, suspension_reason: null,
    ...overrides,
  }
}

/** Space secundario de Ana: /ana/{slug} (Fase 10) */
export function spaceRow(slug: string, overrides: Row = {}): Row {
  return profileRow({ id: `p-${slug}`, username: null, space_slug: slug, is_primary: false, display_name: `Ana ${slug}`, ...overrides })
}

export function moduleRow(overrides: Row = {}): Row {
  const now = new Date().toISOString()
  return {
    id: `m-${Math.random().toString(36).slice(2, 8)}`, profile_id: 'p-ana', type: 'link', title: 'Mi portfolio',
    content: { url: 'https://ana.design', link_type: 'website' }, config: {}, translations: {},
    position: 0, visibility: 'active', deleted_at: null, created_at: now, updated_at: now,
    ...overrides,
  }
}

export function projectRow(overrides: Row = {}): Row {
  const now = new Date().toISOString()
  return {
    id: `pr-${Math.random().toString(36).slice(2, 8)}`, identity_id: 'id-ana', type: 'project', title: 'Café Luna',
    slug: 'cafe-luna', summary: 'Identidad 2025', cover_url: null, data: {}, translations: {}, status: 'draft',
    visibility: 'public', published_snapshot: null, published_at: null, created_at: now, updated_at: now,
    ...overrides,
  }
}

/** Como publish_project: congela el proyecto (con sus bloques) en published_snapshot. */
export function publishProjectRow(state: MockState, project: Row): Row {
  project.published_snapshot = projectSnapshot(state, project)
  project.published_at = new Date().toISOString()
  project.status = 'published'
  return project
}

export function createState(seed: Partial<MockState['tables']> = {}, usernameHistory: Record<string, string> = {}): MockState {
  const state: MockState = {
    tables: {
      profiles: [], profile_modules: [], profile_stats_daily: [], profile_versions: [], content_objects: [], content_blocks: [],
      profile_reports: [], super_admins: [],
      ...seed,
    },
    usernameHistory,
    rpcCalls: [],
    writes: [],
  }
  // Como la migración de la Fase 2: cada perfil publicado arranca con su versión 1
  for (const p of state.tables.profiles) {
    if (p.status === 'published' && !p.published_version_id) insertVersion(state, p, null)
  }
  return state
}

// ── Versiones (misma lógica que supabase/migrations/20261008000001…) ─────────

/** = mycen_space_snapshot: la composición pública de la versión de trabajo. */
function snapshotOf(state: MockState, p: Row): Row {
  const modules = state.tables.profile_modules
    .filter(m => m.profile_id === p.id && m.visibility === 'active' && m.deleted_at == null)
    .sort((a, b) => Number(a.position) - Number(b.position))
    .map(m => ({ id: m.id, type: m.type, title: m.title, content: m.content, config: m.config, translations: m.translations }))
  const card = p.contact_card as Row | null
  return JSON.parse(JSON.stringify({
    id: p.id, username: p.username, display_name: p.display_name, descriptor: p.descriptor, bio: p.bio,
    avatar_url: p.avatar_url, cover_url: p.cover_url, purpose: p.purpose, tags: p.tags,
    theme: p.theme, primary_action: p.primary_action, default_locale: p.default_locale, translations: p.translations,
    has_contact_card: !!card?.enabled, contact_card: card, modules,
  }))
}

function insertVersion(state: MockState, p: Row, restoredFrom: string | null): Row {
  const versions = state.tables.profile_versions.filter(v => v.profile_id === p.id)
  const v = {
    id: `v-${Math.random().toString(36).slice(2, 8)}`, profile_id: p.id,
    version_number: versions.reduce((n, x) => Math.max(n, Number(x.version_number)), 0) + 1,
    snapshot: snapshotOf(state, p), restored_from: restoredFrom, note: null, created_at: new Date().toISOString(),
  }
  state.tables.profile_versions.push(v)
  p.published_version_id = v.id
  p.status = 'published'
  return v
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

// ── Proyectos (misma lógica que supabase/migrations/20261009000001…) ─────────

/** = mycen_project_snapshot */
function projectSnapshot(state: MockState, o: Row): Row {
  const blocks = state.tables.content_blocks
    .filter(b => b.content_object_id === o.id)
    .sort((a, b) => Number(a.position) - Number(b.position))
    .map(b => ({ id: b.id, type: b.type, data: b.data, translations: b.translations ?? {} }))
  return JSON.parse(JSON.stringify({
    id: o.id, type: o.type, title: o.title, summary: o.summary, cover_url: o.cover_url,
    data: o.data ?? {}, translations: o.translations ?? {}, blocks,
  }))
}

/** = mycen_project_cards */
function projectCards(state: MockState, identityId: unknown, username: string, ids: unknown[] | null): Row[] {
  const live = state.tables.content_objects.filter(o =>
    o.identity_id === identityId && o.type === 'project' && o.status === 'published' && o.published_snapshot)
  const chosen = ids
    ? [...new Set(ids.filter((x): x is string => typeof x === 'string'))]
      .map(id => live.find(o => o.id === id && o.visibility !== 'private')).filter((o): o is Row => !!o)
    : live.filter(o => o.visibility === 'public').sort((a, b) => String(b.published_at).localeCompare(String(a.published_at)))
  return chosen.map(o => {
    const snap = o.published_snapshot as Row
    return {
      id: o.id, slug: o.slug, path: `/${username}/projects/${o.slug}`,
      title: snap.title, summary: snap.summary ?? null, cover_url: snap.cover_url ?? null, translations: snap.translations ?? {},
    }
  })
}

/** = mycen_resolve_modules (Fase 7: sin los módulos que no están en su horario) */
function resolveModules(state: MockState, p: Row, modules: Row[]): Row[] {
  return modules.filter(m => isModuleLive(m.config as Row)).map(m => {
    const c = (m.content ?? {}) as Row
    if (m.type === 'project') return { ...m, projects: projectCards(state, p.identity_id, String(p.username), [c.project_id]) }
    if (m.type === 'portfolio') {
      const ids = Array.isArray(c.project_ids) && c.project_ids.length ? c.project_ids : null
      return { ...m, projects: projectCards(state, p.identity_id, String(p.username), ids) }
    }
    return m
  })
}

function publicProject(state: MockState, username: string, slug: string, isOwner: boolean): unknown {
  const u = username.trim().toLowerCase()
  const p = state.tables.profiles.find(x => x.username === u)
  if (!p) {
    const id = state.usernameHistory[u]
    const target = state.tables.profiles.find(x => x.id === id && x.status === 'published' && x.visibility !== 'private' && !x.suspended_at)
    return target ? { redirect: target.username } : null
  }
  if (p.suspended_at) return { status: 'unavailable' }
  if ((p.status !== 'published' || p.visibility === 'private') && !isOwner) return { status: 'unavailable' }
  const o = state.tables.content_objects.find(x => x.identity_id === p.identity_id && x.type === 'project' && x.slug === slug.trim().toLowerCase())
  if (!o) return null
  let project: Row
  if (o.status === 'published' && o.visibility !== 'private') project = o.published_snapshot as Row
  else if (isOwner && o.status !== 'archived') project = projectSnapshot(state, o)
  else return { status: 'unavailable' }
  const space = publishedSnapshot(state, p) ?? snapshotOf(state, p)
  return {
    ...project, slug: o.slug, status: o.status, visibility: o.visibility, is_owner: isOwner,
    space: {
      id: p.id, username: p.username, display_name: space.display_name, avatar_url: space.avatar_url,
      theme: space.theme ?? {}, default_locale: space.default_locale, translations: space.translations ?? {}, visibility: p.visibility,
    },
  }
}

// ── PostgREST mínimo ─────────────────────────────────────────────────────────

function matches(row: Row, key: string, raw: string): boolean {
  const [op, ...rest] = raw.split('.')
  const value = rest.join('.')
  const cell = row[key]
  const str = cell == null ? null : String(cell)
  switch (op) {
    case 'eq': return str === value
    case 'neq': return str !== value
    case 'gt': return str != null && str > value
    case 'gte': return str != null && str >= value
    case 'lt': return str != null && str < value
    case 'lte': return str != null && str <= value
    case 'is': return value === 'null' ? cell == null : String(cell) === value
    case 'in': return value.replace(/^\(|\)$/g, '').split(',').map(v => v.replace(/^"|"$/g, '')).includes(str ?? '')
    default: return true
  }
}

/** Valores por defecto de las columnas (como en la base) al insertar */
const DEFAULTS: Record<string, Row> = {
  profiles: {
    restaurant_id: null, username: null, space_slug: null, descriptor: null, bio: null, avatar_url: null, cover_url: null,
    purpose: null, status: 'draft', is_primary: true, theme: {}, primary_action: null, contact_card: { enabled: false },
    default_locale: 'es', translations: {}, tags: [], onboarding_step: 0, published_at: null, visibility: 'public',
    revision: 0, published_version_id: null, suspended_at: null, suspension_reason: null,
  },
  content_objects: { status: 'draft', visibility: 'public', summary: null, cover_url: null, data: {}, translations: {}, published_snapshot: null, published_at: null },
  content_blocks: { data: {}, translations: {}, position: 0 },
}

const NON_FILTERS = new Set(['select', 'order', 'limit', 'offset', 'on_conflict', 'columns', 'or'])

function filterRows(rows: Row[], params: URLSearchParams): Row[] {
  let out = rows.filter(r => [...params.entries()].every(([k, v]) => NON_FILTERS.has(k) || matches(r, k, v)))
  const order = params.get('order')
  if (order) {
    const keys = order.split(',').map(s => { const [col, dir] = s.split('.'); return { col, desc: dir === 'desc' } })
    out = [...out].sort((a, b) => {
      for (const { col, desc } of keys) {
        const x = String(a[col] ?? ''), y = String(b[col] ?? '')
        if (x !== y) return (x < y ? -1 : 1) * (desc ? -1 : 1)
      }
      return 0
    })
  }
  const limit = params.get('limit')
  return limit ? out.slice(0, Number(limit)) : out
}

// ── RPC (misma lógica que la base) ───────────────────────────────────────────

function publishedSnapshot(state: MockState, p: Row): Row | null {
  if (p.status !== 'published' || !p.published_version_id) return null
  return (state.tables.profile_versions.find(v => v.id === p.published_version_id)?.snapshot as Row) ?? null
}

// ── Spaces (misma lógica que supabase/migrations/20261012000001…) ───────────

const primaryOf = (state: MockState, p: Row) => state.tables.profiles.find(x => x.identity_id === p.identity_id && x.is_primary && x.username)

/** = mycen_space_handle: "ana" o "ana/estudio" */
function handleOf(state: MockState, p: Row): string {
  return p.username ? String(p.username) : `${primaryOf(state, p)?.username ?? ''}/${p.space_slug}`
}

/** = mycen_space_suspended: él o el principal que lo contiene */
const spaceSuspended = (state: MockState, p: Row) => !!p.suspended_at || (!!p.space_slug && !!primaryOf(state, p)?.suspended_at)

/** = mycen_find_space */
function findSpace(state: MockState, raw: string): { p?: Row; redirect?: string } {
  const handle = raw.trim().toLowerCase()
  if (!/^[a-z0-9][a-z0-9_-]{0,62}(\/[a-z0-9][a-z0-9-]{0,39})?$/.test(handle)) return {}
  const [user, slug] = handle.split('/')
  const root = state.tables.profiles.find(x => x.username === user)
  if (!root) {
    const r = state.tables.profiles.find(x => x.id === state.usernameHistory[user])
    if (!r || r.suspended_at) return {}
    if (!slug) return r.status === 'published' && r.visibility !== 'private' ? { redirect: String(r.username) } : {}
    const n = r.is_primary && state.tables.profiles.find(x => x.identity_id === r.identity_id && x.space_slug === slug
      && x.status === 'published' && x.visibility !== 'private' && !x.suspended_at)
    return n ? { redirect: `${r.username}/${slug}` } : {}
  }
  if (!slug) return { p: root }
  if (!root.is_primary) return {}
  return { p: state.tables.profiles.find(x => x.identity_id === root.identity_id && x.space_slug === slug) }
}

/** = mycen_space_rules (al insertar o cambiar un Space por PostgREST). Devuelve el error, si hay. */
function spaceRules(state: MockState, row: Row, old: Row | null): string | null {
  if (old && (old.space_slug == null) !== (row.space_slug == null)) return 'SPACE_ADDRESS_LOCKED'
  if (row.space_slug != null) {
    row.space_slug = String(row.space_slug).trim().toLowerCase()
    if (!old) row.is_primary = false
    const slug = String(row.space_slug)
    if (!/^[a-z0-9][a-z0-9-]{0,38}[a-z0-9]$/.test(slug) || slug.includes('--')) return 'SPACE_SLUG_INVALID'
    if (['projects', 'project', 'proyectos', 'proyecto', 'spaces', 'space', 'edit', 'editar', 'settings', 'studio', 'admin',
      'api', 'og', 'vcard', 'qr', 'p', 'about', 'contact', 'links'].includes(slug)) return 'SPACE_SLUG_RESERVED'
    if (state.tables.profiles.some(x => x !== old && x.identity_id === row.identity_id && x.space_slug === slug)) return 'SPACE_SLUG_TAKEN'
  }
  if (row.status === 'archived' && row.is_primary) return 'PRIMARY_NOT_ARCHIVABLE'
  if (!row.restaurant_id && row.status !== 'archived' && (!old || old.status === 'archived')
    && state.tables.profiles.filter(x => x !== old && x.user_id === row.user_id && x.status !== 'archived').length >= 5) {
    return 'SPACE_LIMIT_REACHED'
  }
  return null
}

function publicProfile(state: MockState, handle: string, isOwner: boolean): unknown {
  const { p, redirect } = findSpace(state, handle)
  if (redirect) return { redirect }
  if (!p) return null
  // Fase 8: suspendido (él o su principal) = no lo ve nadie
  if (spaceSuspended(state, p)) return { status: 'unavailable' }
  if ((p.status !== 'published' || p.visibility === 'private') && !isOwner) return { status: 'unavailable' }
  // El visitante ve la versión publicada; el dueño, si no publicó, su borrador
  const base = { ...(publishedSnapshot(state, p) ?? snapshotOf(state, p)) }
  delete base.contact_card
  const h = handleOf(state, p)
  const username = h.split('/')[0]
  return {
    ...base, id: p.id, username, handle: h, space_slug: p.space_slug ?? null, status: p.status, visibility: p.visibility,
    is_owner: isOwner, business: null,
    modules: resolveModules(state, { ...p, username }, base.modules as Row[]),
  }
}

function rpc(state: MockState, fn: string, args: Row, isOwner: boolean): unknown {
  state.rpcCalls.push({ fn, args })
  switch (fn) {
    case 'get_public_profile': return publicProfile(state, String(args.p_username ?? ''), isOwner)
    case 'get_profile_contact_card': {
      const p = state.tables.profiles.find(x => x.id === args.p_profile_id)
      if (!p || spaceSuspended(state, p)) return null
      const published = publishedSnapshot(state, p)
      const card = (isOwner && !published ? p.contact_card : published?.contact_card) as Row | undefined
      if (!card?.enabled) return null
      const rest = { ...card }
      delete rest.enabled
      const h = handleOf(state, p)
      return { ...rest, username: h.split('/')[0], handle: h }
    }
    case 'publish_space': {
      const p = state.tables.profiles.find(x => x.id === args.p_profile_id)
      if (!p || !isOwner) throw new Error('NOT_OWNER')
      const current = publishedSnapshot(state, p)
      if (current && same(current, snapshotOf(state, p))) {
        const v = state.tables.profile_versions.find(x => x.id === p.published_version_id)!
        return { version_id: v.id, version_number: v.version_number }
      }
      const v = insertVersion(state, p, null)
      return { version_id: v.id, version_number: v.version_number }
    }
    case 'restore_space_version': {
      const old = state.tables.profile_versions.find(x => x.id === args.p_version_id)
      const p = old && state.tables.profiles.find(x => x.id === old.profile_id)
      if (!old || !p || !isOwner) throw new Error('NOT_OWNER')
      const snap = old.snapshot as Row
      for (const k of ['display_name', 'descriptor', 'bio', 'avatar_url', 'cover_url', 'purpose', 'tags', 'theme',
        'primary_action', 'default_locale', 'translations', 'contact_card']) p[k] = snap[k]
      p.revision = Number(p.revision) + 1
      const ids = (snap.modules as Row[]).map(m => m.id)
      for (const m of state.tables.profile_modules.filter(x => x.profile_id === p.id && x.deleted_at == null)) {
        if (!ids.includes(m.id)) m.visibility = 'hidden'
      }
      ;(snap.modules as Row[]).forEach((sm, i) => {
        const m = state.tables.profile_modules.find(x => x.id === sm.id)
        if (m) Object.assign(m, { title: sm.title, content: sm.content, translations: sm.translations, position: (i + 1) * 10, visibility: 'active', deleted_at: null })
      })
      const v = insertVersion(state, p, String(old.id))
      return { version_id: v.id, version_number: v.version_number }
    }
    case 'space_publish_state': {
      const p = state.tables.profiles.find(x => x.id === args.p_profile_id)
      if (!p || !isOwner) throw new Error('NOT_OWNER')
      const v = state.tables.profile_versions.find(x => x.id === p.published_version_id)
      return {
        status: p.status, visibility: p.visibility, revision: p.revision,
        version_id: v?.id ?? null, version_number: v?.version_number ?? null, published_at: v?.created_at ?? null,
        dirty: !v || !same(v.snapshot, snapshotOf(state, p)),
      }
    }
    case 'get_public_project': return publicProject(state, String(args.p_username ?? ''), String(args.p_slug ?? ''), isOwner)
    case 'publish_project': {
      const o = state.tables.content_objects.find(x => x.id === args.p_id)
      if (!o || !isOwner) throw new Error('NOT_OWNER')
      publishProjectRow(state, o)
      return { status: o.status, published_at: o.published_at }
    }
    case 'project_publish_state': {
      const o = state.tables.content_objects.find(x => x.id === args.p_id)
      if (!o || !isOwner) throw new Error('NOT_OWNER')
      return { status: o.status, published_at: o.published_at, dirty: !o.published_snapshot || !same(o.published_snapshot, projectSnapshot(state, o)) }
    }
    case 'profile_traffic_sources': {
      const p = state.tables.profiles.find(x => x.id === args.p_profile_id)
      if (!p || !isOwner) throw new Error('NOT_OWNER')
      return state.trafficSources ?? []
    }
    // ── Moderación (Fase 8) ──
    case 'report_profile': {
      const reasons = ['spam', 'scam', 'impersonation', 'hate', 'violence', 'sexual', 'illegal', 'other']
      if (!reasons.includes(String(args.p_reason))) return 'invalid'
      const { p } = findSpace(state, String(args.p_username ?? ''))
      if (!p || p.status !== 'published' || p.visibility === 'private' || spaceSuspended(state, p)) return 'not_found'
      if (isOwner) return 'own_profile'
      // En el mock todos los visitantes son "la misma persona" (mismo hash del día)
      if (state.tables.profile_reports.some(r => r.profile_id === p.id && r.reporter_hash === 'mock-visitor')) return 'duplicate'
      state.tables.profile_reports.push({
        id: `rep-${Math.random().toString(36).slice(2, 8)}`, profile_id: p.id, content_object_id: null,
        reason: args.p_reason, details: args.p_details ?? null, reporter_hash: 'mock-visitor', status: 'open',
        resolution_note: null, resolved_at: null, created_at: new Date().toISOString(),
      })
      return 'ok'
    }
    case 'admin_list_reports': {
      if (!isOwner || !state.tables.super_admins.some(a => a.user_id === OWNER_ID)) throw new Error('NOT_ADMIN')
      const open = args.p_status !== 'resolved'
      return state.tables.profile_reports.filter(r => (r.status === 'open') === open).map(r => {
        const p = state.tables.profiles.find(x => x.id === r.profile_id)!
        return {
          ...r, project: null,
          profile: {
            id: p.id, username: handleOf(state, p).split('/')[0], handle: handleOf(state, p), display_name: p.display_name, status: p.status,
            suspended_at: p.suspended_at, suspension_reason: p.suspension_reason,
            open_reports: state.tables.profile_reports.filter(x => x.profile_id === p.id && x.status === 'open').length,
          },
        }
      })
    }
    case 'admin_list_suspended': {
      if (!isOwner || !state.tables.super_admins.some(a => a.user_id === OWNER_ID)) throw new Error('NOT_ADMIN')
      return state.tables.profiles.filter(p => p.suspended_at)
        .map(p => ({ id: p.id, username: handleOf(state, p).split('/')[0], handle: handleOf(state, p), display_name: p.display_name, suspended_at: p.suspended_at, suspension_reason: p.suspension_reason }))
    }
    case 'admin_set_suspension': {
      if (!isOwner || !state.tables.super_admins.some(a => a.user_id === OWNER_ID)) throw new Error('NOT_ADMIN')
      const p = state.tables.profiles.find(x => x.id === args.p_profile_id)
      if (!p) throw new Error('NOT_FOUND')
      p.suspended_at = args.p_suspended ? (p.suspended_at ?? new Date().toISOString()) : null
      p.suspension_reason = args.p_suspended ? (args.p_reason ?? null) : null
      return null
    }
    case 'admin_resolve_report': {
      if (!isOwner || !state.tables.super_admins.some(a => a.user_id === OWNER_ID)) throw new Error('NOT_ADMIN')
      const r = state.tables.profile_reports.find(x => x.id === args.p_report_id)
      if (!r) throw new Error('NOT_FOUND')
      const now = new Date().toISOString()
      if (args.p_action === 'dismiss') Object.assign(r, { status: 'dismissed', resolution_note: args.p_note ?? null, resolved_at: now })
      else {
        const p = state.tables.profiles.find(x => x.id === r.profile_id)!
        p.suspended_at = p.suspended_at ?? now
        p.suspension_reason = args.p_note ?? r.reason
        state.tables.profile_reports.filter(x => x.profile_id === r.profile_id && x.status === 'open')
          .forEach(x => Object.assign(x, { status: 'actioned', resolution_note: args.p_note ?? null, resolved_at: now }))
      }
      return null
    }
    // ── Spaces (Fase 10) ──
    case 'duplicate_space': {
      const src = state.tables.profiles.find(x => x.id === args.p_profile_id)
      if (!src || !isOwner) throw new Error('NOT_OWNER')
      const now = new Date().toISOString()
      const row: Row = {
        ...JSON.parse(JSON.stringify(src)), id: `p-${Math.random().toString(36).slice(2, 8)}`, username: null,
        space_slug: args.p_slug, is_primary: false, restaurant_id: null, status: 'draft', published_version_id: null,
        published_at: null, revision: 0, onboarding_step: 5, suspended_at: null, suspension_reason: null,
        display_name: String(args.p_display_name ?? '').trim() || src.display_name, created_at: now, updated_at: now,
      }
      const err = spaceRules(state, row, null)
      if (err) throw new Error(err)
      state.tables.profiles.push(row)
      for (const m of state.tables.profile_modules.filter(x => x.profile_id === src.id && x.deleted_at == null)) {
        state.tables.profile_modules.push({ ...JSON.parse(JSON.stringify(m)), id: `m-${Math.random().toString(36).slice(2, 8)}`, profile_id: row.id })
      }
      return row.id
    }
    case 'check_username': {
      const u = String(args.p_username ?? '')
      if (!/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(u)) return 'invalid'
      return state.tables.profiles.some(x => x.username === u) ? 'taken' : 'available'
    }
    default: return null
  }
}

// ── Instalación en el contexto del navegador ────────────────────────────────

export async function installSupabaseMock(context: BrowserContext, state: MockState, opts: { signedIn?: boolean } = {}) {
  if (opts.signedIn) {
    const session = {
      access_token: 'mock-access-token', refresh_token: 'mock-refresh', token_type: 'bearer', expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 86_400,
      user: { id: OWNER_ID, email: 'ana@example.com', aud: 'authenticated', role: 'authenticated', user_metadata: { name: 'Ana Pérez' } },
    }
    // supabase-js guarda la sesión en sb-<ref>-auth-token (ref = primer segmento del host)
    await context.addInitScript(s => localStorage.setItem('sb-mock-auth-token', s), JSON.stringify(session))
  }

  await context.route('https://mock.supabase.co/**', async (route: Route) => {
    const req = route.request()
    const url = new URL(req.url())
    const method = req.method()
    const headers = req.headers()
    const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
      route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', ...extra }, body: JSON.stringify(body) })

    if (method === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } })
    }
    if (url.pathname.startsWith('/auth/v1/user')) {
      return opts.signedIn ? json({ id: OWNER_ID, email: 'ana@example.com', aud: 'authenticated', role: 'authenticated' }) : json({}, 401)
    }
    if (url.pathname.startsWith('/auth/') || url.pathname.startsWith('/storage/')) return json({})

    const isOwner = !!opts.signedIn
    const path = url.pathname.replace(/^\/rest\/v1\//, '')
    if (path.startsWith('rpc/')) {
      const args = (req.postDataJSON() ?? {}) as Row
      try {
        return json(rpc(state, path.slice(4), args, isOwner))
      } catch (e) {
        return json({ code: '42501', message: (e as Error).message }, 403)
      }
    }

    const table = path
    const rows = (state.tables[table] ??= [])
    const single = (headers['accept'] ?? '').includes('vnd.pgrst.object')
    const params = url.searchParams

    if (method === 'HEAD') {
      const n = filterRows(rows, params).length
      return route.fulfill({ status: 200, headers: { 'content-range': `0-${Math.max(n - 1, 0)}/${n}`, 'access-control-expose-headers': 'content-range', 'access-control-allow-origin': '*' }, body: '' })
    }
    if (method === 'GET') {
      const out = filterRows(rows, params)
      return single ? json(out[0] ?? null) : json(out)
    }
    if (method === 'POST') {
      const body = req.postDataJSON()
      const list = (Array.isArray(body) ? body : [body]) as Row[]
      const now = new Date().toISOString()
      // upsert (Prefer: resolution=merge-duplicates): actualiza la fila con el mismo id en vez de duplicarla
      const merge = (headers['prefer'] ?? '').includes('merge-duplicates')
      const created = list.map(r => {
        const existing = merge && r.id != null ? rows.find(x => x.id === r.id) : undefined
        if (existing) return Object.assign(existing, r, { updated_at: now })
        const row: Row = { id: `${table}-${Math.random().toString(36).slice(2, 8)}`, created_at: now, updated_at: now, ...DEFAULTS[table], ...r }
        if (table === 'profiles') {
          // Como el trigger profiles_identity: la identidad de la cuenta
          row.identity_id ??= rows.find(x => x.user_id === row.user_id)?.identity_id ?? `id-${row.user_id}`
          const err = spaceRules(state, row, null)
          if (err) return err
        }
        rows.push(row)
        return row
      })
      const failed = created.find((c): c is string => typeof c === 'string')
      if (failed) return json({ code: '22023', message: failed }, 400)
      state.writes.push({ method: 'POST', table, body })
      return json(single ? created[0] : created, 201)
    }
    if (method === 'PATCH') {
      const body = req.postDataJSON() as Row
      const hit = filterRows(rows, params)
      const now = new Date().toISOString()
      // Como el trigger profiles_revision: sólo los cambios de contenido suben la revisión
      const bumps = table === 'profiles' && Object.keys(body).some(k => !['status', 'onboarding_step', 'published_version_id', 'published_at'].includes(k))
      if (table === 'profiles') {
        for (const r of hit) {
          const err = spaceRules(state, { ...r, ...body }, r)
          if (err) return json({ code: '22023', message: err }, 400)
        }
      }
      hit.forEach(r => Object.assign(r, body, { updated_at: now }, bumps ? { revision: Number(r.revision ?? 0) + 1 } : {}))
      state.writes.push({ method: 'PATCH', table, body })
      return json(single ? hit[0] ?? null : hit)
    }
    if (method === 'DELETE') {
      const hit = new Set(filterRows(rows, params))
      state.tables[table] = rows.filter(r => !hit.has(r))
      state.writes.push({ method: 'DELETE', table, body: null })
      return json([])
    }
    return json(null)
  })
}
