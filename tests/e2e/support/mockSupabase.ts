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
    huella_salt: null, status_text: null, available: false,
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
      profile_reports: [], super_admins: [], profile_messages: [], profile_subscribers: [],
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
    theme: p.theme, huella_salt: p.huella_salt ?? null,
    primary_action: p.primary_action, default_locale: p.default_locale, translations: p.translations,
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
  profile_modules: { config: {}, translations: {}, visibility: 'active', deleted_at: null },
  content_objects: { status: 'draft', visibility: 'public', summary: null, cover_url: null, data: {}, translations: {}, published_snapshot: null, published_at: null },
  content_blocks: { data: {}, translations: {}, position: 0 },
  // Life OS (V1 · etapas 09–10)
  life_habits: {
    is_active: true, goal_id: null, target_value: null, unit: null, anchor: null, reminder_time: null, reminder_enabled: false,
    frequency: { type: 'daily', days: [0, 1, 2, 3, 4, 5, 6] },
  },
  life_habit_logs: { value: 1 },
  // Dinero: categorías propias (20261029000001)
  life_categories: { icon: null, archived_at: null },
}

/** Índices únicos parciales (sólo valores no nulos), como en la base: el segundo insert da 23505 */
const UNIQUE: Record<string, string[]> = {
  // 20261103000002_life_task_next_once: una sola siguiente ocurrencia por tarea
  life_brain_items: ['occurrence_of'],
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
    // V1: perfil vivo (de la fila, sin volver a publicar)
    status_text: p.status_text ?? null, available: !!p.available,
    // Verificación de cuenta: en el mock se marca en la fila del perfil (en la base, identities.verified_at)
    verified: !!p.verified,
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
    // = track_profile_event: sin el dueño, sólo perfiles publicados, módulo del perfil y clave del botón con el
    // formato de la base. En el mock todos los visitantes son "la misma persona": deduplica por evento + módulo + botón.
    case 'track_profile_event': {
      if (isOwner) return null
      const p = state.tables.profiles.find(x => x.id === args.p_profile_id)
      if (!p || p.status !== 'published') return null
      const type = String(args.p_event_type ?? '')
      if (!['view', 'module_click', 'primary_action_click', 'share', 'copy_link', 'qr_download', 'vcard_download'].includes(type)) return null
      const moduleId = state.tables.profile_modules.some(m => m.id === args.p_module_id && m.profile_id === p.id) ? args.p_module_id : null
      const raw = args.p_item_key
      const itemKey = type !== 'view' && typeof raw === 'string' && /^[A-Za-z0-9:_.-]{1,64}$/.test(raw) ? raw : null
      const events = (state.tables.profile_events ??= [])
      if (events.some(e => e.profile_id === p.id && e.event_type === type && e.module_id === moduleId && e.item_key === itemKey)) return null
      events.push({ profile_id: p.id, event_type: type, module_id: moduleId, item_key: itemKey })
      // y la vista diaria que lee Analítica
      const day = new Date().toISOString().slice(0, 10)
      const daily = state.tables.profile_stats_daily
      const row = daily.find(r => r.profile_id === p.id && r.day === day && r.event_type === type && r.module_id === moduleId)
      if (row) row.events = Number(row.events) + 1
      else daily.push({ profile_id: p.id, day, event_type: type, module_id: moduleId, events: 1, visitors: 1 })
      return null
    }
    // = profile_click_stats: sólo el dueño; visitas y toques por evento + módulo + botón
    case 'profile_click_stats': {
      const p = state.tables.profiles.find(x => x.id === args.p_profile_id)
      if (!p || !isOwner) throw new Error('NOT_OWNER')
      const events = (state.tables.profile_events ?? []).filter(e => e.profile_id === p.id)
      const groups = new Map<string, Row>()
      for (const e of events) {
        if (!['module_click', 'primary_action_click', 'vcard_download'].includes(String(e.event_type))) continue
        const k = `${e.event_type}|${e.module_id}|${e.item_key}`
        const g = groups.get(k) ?? { event_type: e.event_type, module_id: e.module_id, item_key: e.item_key, taps: 0, visitors: 1 }
        g.taps = Number(g.taps) + 1
        groups.set(k, g)
      }
      return {
        visits: events.filter(e => e.event_type === 'view').length,
        items: [...groups.values()].sort((a, b) => Number(b.taps) - Number(a.taps)),
      }
    }
    case 'profile_traffic_sources': {
      const p = state.tables.profiles.find(x => x.id === args.p_profile_id)
      if (!p || !isOwner) throw new Error('NOT_OWNER')
      return state.trafficSources ?? []
    }
    // = record_referral (V1 · etapa 08): una por cuenta, sólo a perfiles publicados de otra persona
    case 'record_referral': {
      if (!isOwner) throw new Error('NOT_SIGNED_IN')
      const referrals = (state.tables.referrals ??= [])
      if (referrals.length) return 'already'
      const { p } = findSpace(state, String(args.p_ref ?? ''))
      if (!p || p.status !== 'published' || p.visibility === 'private' || spaceSuspended(state, p)) return 'not_found'
      if (p.user_id === OWNER_ID) return 'self'
      referrals.push({ user_id: OWNER_ID, referred_by: p.id, purpose: args.p_purpose ?? null })
      return 'ok'
    }
    // ── Moderación (Fase 8) ──
    // = submit_profile_message (V1 · etapa 05): mismas validaciones; en el mock todos los visitantes son "la misma persona"
    case 'submit_profile_message': {
      const { p } = findSpace(state, String(args.p_handle ?? ''))
      if (!p || p.status !== 'published' || p.visibility === 'private' || spaceSuspended(state, p)) return 'not_found'
      const snap = publishedSnapshot(state, p)
      if (!((snap?.modules as Row[] | undefined) ?? []).some(m => m.type === 'contact_form')) return 'not_found'
      const name = String(args.p_name ?? '').trim(), contact = String(args.p_contact ?? '').trim(), message = String(args.p_message ?? '').trim()
      if (name.length < 1 || name.length > 80 || contact.length < 3 || contact.length > 120 || message.length < 1 || message.length > 2000) return 'invalid'
      if ((message.match(/(https?:\/\/|www\.)/gi) ?? []).length > 3) return 'too_many_links'
      if (String(args.p_trap ?? '').trim() || Number(args.p_elapsed_ms ?? 0) < 3000) return 'ok'
      if (state.tables.profile_messages.filter(m => m.profile_id === p.id && m.sender_hash === 'mock-visitor').length >= 5) return 'rate_limited'
      state.tables.profile_messages.push({
        id: `msg-${Math.random().toString(36).slice(2, 8)}`, profile_id: p.id, kind: 'message', name, contact, message, details: null,
        sender_hash: 'mock-visitor', created_at: new Date().toISOString(), read_at: null,
      })
      return 'ok'
    }
    // = submit_profile_collab (V1.1, Colaboraciones): sólo con un módulo 'collab' publicado; el límite cuenta con los mensajes
    case 'submit_profile_collab': {
      const { p } = findSpace(state, String(args.p_handle ?? ''))
      if (!p || p.status !== 'published' || p.visibility === 'private' || spaceSuspended(state, p)) return 'not_found'
      const snap = publishedSnapshot(state, p)
      if (!((snap?.modules as Row[] | undefined) ?? []).some(m => m.type === 'collab')) return 'not_found'
      const s = (k: string) => String(args[k] ?? '').trim()
      const name = s('p_name'), email = s('p_email'), company = s('p_company'), message = s('p_message')
      const website = s('p_website'), budget = s('p_budget'), deadline = s('p_deadline'), deliverable = s('p_deliverable')
      if (name.length < 1 || name.length > 80 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120
        || company.length < 1 || company.length > 120 || message.length < 1 || message.length > 2000
        || !['post', 'video', 'story', 'event', 'ugc', 'other'].includes(deliverable)
        || (website && !/^https:\/\/[^\s/?#]+\.[^\s/?#]+([/?#]\S*)?$/i.test(website)) || website.length > 300
        || budget.length > 60 || (deadline && !/^\d{4}-\d{2}-\d{2}$/.test(deadline))) return 'invalid'
      if ((message.match(/(https?:\/\/|www\.)/gi) ?? []).length > 3) return 'too_many_links'
      if (s('p_trap') || Number(args.p_elapsed_ms ?? 0) < 3000) return 'ok'
      if (state.tables.profile_messages.filter(m => m.profile_id === p.id && m.sender_hash === 'mock-visitor').length >= 5) return 'rate_limited'
      const details: Row = { company, deliverable }
      if (website) details.website = website
      if (budget) details.budget = budget
      if (deadline) details.deadline = deadline
      state.tables.profile_messages.push({
        id: `msg-${Math.random().toString(36).slice(2, 8)}`, profile_id: p.id, kind: 'collab', name, contact: email, message,
        details, sender_hash: 'mock-visitor', created_at: new Date().toISOString(), read_at: null,
      })
      return 'ok'
    }
    // = subscribe_profile (módulos de bio, "Suscribirse"): mismas validaciones; todos los visitantes son "la misma persona"
    case 'subscribe_profile': {
      const { p } = findSpace(state, String(args.p_handle ?? ''))
      if (!p || p.status !== 'published' || p.visibility === 'private' || spaceSuspended(state, p)) return 'not_found'
      const snap = publishedSnapshot(state, p)
      const mod = ((snap?.modules as Row[] | undefined) ?? []).find(m => m.type === 'subscribe' && m.id === args.p_module_id)
      if (!mod || !isModuleLive(mod.config as Row)) return 'not_found'
      if (args.p_consent !== true) return 'consent_required'
      const email = String(args.p_email ?? '').trim().toLowerCase()
      let name: string | null = String(args.p_name ?? '').trim() || null
      if ((mod.content as Row | undefined)?.ask_name !== true) name = null
      if (email.length < 3 || email.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || (name && name.length > 80)) return 'invalid'
      if (String(args.p_hp ?? '').trim() || Number(args.p_elapsed_ms ?? 0) < 3000) return 'ok'
      const subs = (state.tables.profile_subscribers ??= [])
      if (subs.filter(s => s.profile_id === p.id && s.sender_hash === 'mock-visitor').length >= 5) return 'rate_limited'
      if (subs.some(s => s.profile_id === p.id && s.email === email)) return 'ok'
      const langs = ['es', 'en', 'pt', 'fr', 'de', 'it', 'zh', 'ja', 'ko', 'hi', 'ar', 'ru']
      const now = new Date().toISOString()
      subs.push({
        id: `sub-${Math.random().toString(36).slice(2, 8)}`, profile_id: p.id, email, name, consent_at: now,
        locale: langs.includes(String(args.p_locale)) ? args.p_locale : null, module_id: mod.id, sender_hash: 'mock-visitor', created_at: now,
      })
      return 'ok'
    }
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
    // ── Errores (Lanzamiento L5): agrupa por zona + mensaje (la huella real también usa el stack) ──
    case 'report_client_error': {
      const errors = (state.tables.app_errors ??= [])
      const message = String(args.p_message ?? '').trim().slice(0, 500)
      if (!message) return 'invalid'
      const now = new Date().toISOString()
      const area = String(args.p_area ?? 'other')
      const e = errors.find(x => x.area === area && x.message === message)
      if (e) {
        Object.assign(e, { count: Number(e.count) + 1, last_seen: now, affected: Number(e.affected) + 1 })
        if (e.status === 'resolved') Object.assign(e, { status: 'open', reopened: true, resolved_at: null })
      } else {
        errors.push({
          id: `err-${Math.random().toString(36).slice(2, 8)}`, area, message, stack: args.p_stack ?? null, path: args.p_path ?? null,
          release: args.p_release ?? null, browser: args.p_browser ?? null, count: 1, first_seen: now, last_seen: now,
          status: 'open', note: null, resolved_at: null, reopened: false, affected: 1, affected_today: 1,
        })
      }
      return 'ok'
    }
    case 'admin_list_errors': {
      if (!isOwner || !state.tables.super_admins.some(a => a.user_id === OWNER_ID)) throw new Error('NOT_ADMIN')
      const status = args.p_status ?? 'open'
      return (state.tables.app_errors ?? []).filter(e => status === 'all' || e.status === status)
    }
    case 'admin_set_error_status': {
      if (!isOwner || !state.tables.super_admins.some(a => a.user_id === OWNER_ID)) throw new Error('NOT_ADMIN')
      const e = (state.tables.app_errors ?? []).find(x => x.id === args.p_error_id)
      if (!e) throw new Error('NOT_FOUND')
      Object.assign(e, {
        status: args.p_status, note: (args.p_note as string | null)?.trim() || e.note,
        resolved_at: args.p_status === 'open' ? null : new Date().toISOString(), reopened: args.p_status === 'open' ? e.reopened : false,
      })
      return null
    }
    case 'admin_error_summary': {
      if (!isOwner || !state.tables.super_admins.some(a => a.user_id === OWNER_ID)) throw new Error('NOT_ADMIN')
      const errors = state.tables.app_errors ?? []
      return { open: errors.filter(e => e.status === 'open').length, new_today: errors.length, affected_today: errors.reduce((n, e) => n + Number(e.affected_today ?? 0), 0) }
    }
    // ── Verificación de cuenta ──
    case 'request_verification': {
      if (!isOwner) throw new Error('NOT_AUTHENTICATED')
      const list = state.tables.verification_requests ?? (state.tables.verification_requests = [])
      const message = String(args.p_message ?? '').trim()
      const link = args.p_link == null ? null : String(args.p_link)
      if (message.length < 10 || message.length > 1000 || (link && !/^https:\/\//.test(link))) return 'invalid'
      if ((state.tables.identities ?? []).some(i => i.user_id === OWNER_ID && i.verified_at)) return 'verified'
      if (list.some(r => r.user_id === OWNER_ID && r.status === 'pending')) return 'pending'
      list.push({ id: `v${list.length + 1}`, user_id: OWNER_ID, message, link, status: 'pending', admin_note: null, created_at: new Date().toISOString() })
      return 'ok'
    }
    // ── Métricas de producto (V1 · etapa 14) ──
    case 'track_product_event': {
      const events = state.tables.product_events ?? (state.tables.product_events = [])
      if (!isOwner && args.p_event !== 'signup_started') return 'invalid'
      events.push({ user_id: isOwner ? OWNER_ID : null, event: args.p_event, props: args.p_props ?? {}, created_at: new Date().toISOString() })
      return 'ok'
    }
    case 'admin_product_metrics': {
      if (!isOwner || !state.tables.super_admins.some(a => a.user_id === OWNER_ID)) throw new Error('NOT_ADMIN')
      // Un resumen armado en el test (state.tables.product_metrics[0]) o uno mínimo con los eventos guardados
      if (state.tables.product_metrics?.[0]) return state.tables.product_metrics[0]
      const events = state.tables.product_events ?? []
      const users = (e: string) => new Set(events.filter(x => x.event === e).map(x => x.user_id)).size
      return {
        days: args.p_days, events_total: events.length, signups: users('signup_completed'), published: users('profile_published'),
        publish_median_seconds: null, retention: [], week_life_users: 0, habit4_users: 0, period_life_users: 0,
        returned_users: users('life_returned'), return_median_days: null, referral_signups: 0, referrals: [],
      }
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
    case 'life_materialize_recurring': {
      // = supabase/migrations/20261027000001: carga lo vencido de cada fijo activo, sin duplicar ni volver atrás
      if (!isOwner) return 0
      const today = String(args.p_today)
      const nextMonth = (ym: string) => { const [y, m] = ym.split('-').map(Number); return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}` }
      state.tables.life_transactions ??= []
      let n = 0
      for (const r of (state.tables.life_recurring_transactions ?? []).filter(x => x.active !== false)) {
        let month = r.last_period ? nextMonth(String(r.last_period)) : String(r.starts_on).slice(0, 7)
        let last: string | null = null
        while (month <= today.slice(0, 7)) {
          const [y, m] = month.split('-').map(Number)
          const due = `${month}-${String(Math.min(Number(r.day_of_month), new Date(Date.UTC(y, m, 0)).getUTCDate())).padStart(2, '0')}`
          if (due > today) break
          if (due >= String(r.starts_on) && !state.tables.life_transactions.some(t => t.recurring_id === r.id && t.recurring_period === month)) {
            state.tables.life_transactions.push({
              id: `tx-${Math.random().toString(36).slice(2, 10)}`, user_id: r.user_id ?? OWNER_ID, type: r.type, amount: r.amount,
              category: r.category ?? null, description: r.description ?? null, currency: r.currency, goal_id: r.goal_id ?? null,
              occurred_at: `${due}T12:00:00.000Z`, recurring_id: r.id, recurring_period: month, created_at: new Date().toISOString(),
            })
            n++
          }
          last = month
          month = nextMonth(month)
        }
        if (last) r.last_period = last
      }
      return n
    }
    case 'life_materialize_installments': {
      // = supabase/migrations/20261029000002: cuotas vencidas hasta hoy (y no después de cancelar), el mismo día del mes
      // que la primera (o el último día), total / cuotas redondeado y la última ajusta; sin duplicar ni volver atrás
      if (!isOwner) return 0
      const today = String(args.p_today)
      state.tables.life_transactions ??= []
      let n = 0
      for (const p of (state.tables.life_installment_plans ?? []).filter(x => Number(x.last_no ?? 0) < Number(x.installments))) {
        const count = Number(p.installments)
        const cents = Math.round(Number(p.total_amount) * 100)
        const base = Math.round(cents / count)
        const limit = p.cancelled_at ? [today, String(p.cancelled_at).slice(0, 10)].sort()[0] : today
        const [fy, fm, fd] = String(p.first_date).split('-').map(Number)
        let no = Number(p.last_no ?? 0) + 1
        let last = Number(p.last_no ?? 0)
        while (no <= count) {
          const month = new Date(Date.UTC(fy, fm - 1 + (no - 1), 1))
          const y = month.getUTCFullYear(), m = month.getUTCMonth() + 1
          const day = Math.min(fd, new Date(Date.UTC(y, m, 0)).getUTCDate())
          const due = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          if (due > limit) break
          if (!state.tables.life_transactions.some(t => t.installment_plan_id === p.id && Number(t.installment_no) === no)) {
            state.tables.life_transactions.push({
              id: `tx-${Math.random().toString(36).slice(2, 10)}`, user_id: p.user_id ?? OWNER_ID, type: 'expense',
              amount: (no === count ? cents - base * (count - 1) : base) / 100, category: p.category ?? 'Otros',
              description: p.description ?? null, currency: p.currency, goal_id: p.goal_id ?? null,
              occurred_at: `${due}T12:00:00.000Z`, installment_plan_id: p.id, installment_no: no, created_at: new Date().toISOString(),
            })
            n++
          }
          last = no
          no++
        }
        p.last_no = last
      }
      return n
    }
    case 'life_calendar_token': {
      if (!isOwner) throw new Error('not_authenticated')
      const fresh = () => Array.from({ length: 64 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('')
      state.tables.life_calendar_feeds ??= []
      const row = state.tables.life_calendar_feeds[0]
      if (!row || args.p_rotate) state.tables.life_calendar_feeds = [{ user_id: OWNER_ID, token: fresh() }]
      return state.tables.life_calendar_feeds[0].token
    }
    case 'life_calendar_disable': {
      state.tables.life_calendar_feeds = []
      return null
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

export async function installSupabaseMock(context: BrowserContext, state: MockState,
  opts: { signedIn?: boolean; userMetadata?: Record<string, unknown>; appMetadata?: Record<string, unknown> } = {}) {
  if (opts.signedIn) {
    const session = {
      access_token: 'mock-access-token', refresh_token: 'mock-refresh', token_type: 'bearer', expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 86_400,
      user: { id: OWNER_ID, email: 'ana@example.com', aud: 'authenticated', role: 'authenticated', user_metadata: { name: 'Ana Pérez', ...opts.userMetadata },
        ...(opts.appMetadata ? { app_metadata: opts.appMetadata } : {}) },
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
        // on_conflict=a,b: la fila con las mismas columnas (por ejemplo habit_id + completed_date); si no, el id
        const conflict = params.get('on_conflict')?.split(',')
        const existing = merge
          ? (conflict ? rows.find(x => conflict.every(c => String(x[c]) === String(r[c]))) : r.id != null ? rows.find(x => x.id === r.id) : undefined)
          : undefined
        if (existing) return Object.assign(existing, r, { updated_at: now })
        const row: Row = { id: `${table}-${Math.random().toString(36).slice(2, 8)}`, created_at: now, updated_at: now, ...DEFAULTS[table], ...r }
        if (table === 'profiles') {
          // Como el trigger profiles_identity: la identidad de la cuenta
          row.identity_id ??= rows.find(x => x.user_id === row.user_id)?.identity_id ?? `id-${row.user_id}`
          const err = spaceRules(state, row, null)
          if (err) return err
        }
        const dup = (UNIQUE[table] ?? []).find(c => row[c] != null && rows.some(x => x[c] === row[c]))
        if (dup) return `UNIQUE:${dup}`
        rows.push(row)
        return row
      })
      const failed = created.find((c): c is string => typeof c === 'string')
      if (failed?.startsWith('UNIQUE:')) return json({ code: '23505', message: `duplicate key value (${failed.slice(7)})` }, 409)
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
