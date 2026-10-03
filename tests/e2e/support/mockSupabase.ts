import type { BrowserContext, Route } from '@playwright/test'

// Supabase simulado para los E2E: PostgREST en memoria (filtros básicos) + las RPC públicas de
// Identity con la misma lógica que la base (supabase/migrations/20261001000001… y 20261002000001…).
// Si cambia una RPC en la base, este archivo tiene que acompañarla.

type Row = Record<string, unknown>

export const OWNER_ID = '11111111-1111-4111-8111-111111111111'

export interface MockState {
  tables: Record<string, Row[]>
  /** old_username → profile_id (profile_username_history) */
  usernameHistory: Record<string, string>
  /** Llamadas a RPC, en orden */
  rpcCalls: { fn: string; args: Row }[]
  /** Escrituras por PostgREST, en orden */
  writes: { method: 'POST' | 'PATCH' | 'DELETE'; table: string; body: unknown }[]
}

export function profileRow(overrides: Row = {}): Row {
  const now = new Date().toISOString()
  return {
    id: 'p-ana', user_id: OWNER_ID, restaurant_id: null, username: 'ana',
    display_name: 'Ana Pérez', descriptor: 'Diseñadora', bio: 'Hago marcas.',
    avatar_url: null, cover_url: null, purpose: 'professional', status: 'published', is_primary: true,
    theme: {}, primary_action: null, contact_card: { enabled: false }, default_locale: 'es', translations: {},
    tags: [], onboarding_step: 5, username_changed_at: null, published_at: now, created_at: now, updated_at: now,
    visibility: 'public', revision: 0, published_version_id: null,
    ...overrides,
  }
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

export function createState(seed: Partial<MockState['tables']> = {}, usernameHistory: Record<string, string> = {}): MockState {
  const state: MockState = {
    tables: { profiles: [], profile_modules: [], profile_stats_daily: [], profile_versions: [], ...seed },
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

function publicProfile(state: MockState, username: string, isOwner: boolean): unknown {
  const u = username.trim().toLowerCase()
  const p = state.tables.profiles.find(x => x.username === u)
  if (!p) {
    const id = state.usernameHistory[u]
    const target = state.tables.profiles.find(x => x.id === id && x.status === 'published' && x.visibility !== 'private')
    return target ? { redirect: target.username } : null
  }
  if ((p.status !== 'published' || p.visibility === 'private') && !isOwner) return { status: 'unavailable' }
  // El visitante ve la versión publicada; el dueño, si no publicó, su borrador
  const base = { ...(publishedSnapshot(state, p) ?? snapshotOf(state, p)) }
  delete base.contact_card
  return { ...base, id: p.id, username: p.username, status: p.status, visibility: p.visibility, is_owner: isOwner, business: null }
}

function rpc(state: MockState, fn: string, args: Row, isOwner: boolean): unknown {
  state.rpcCalls.push({ fn, args })
  switch (fn) {
    case 'get_public_profile': return publicProfile(state, String(args.p_username ?? ''), isOwner)
    case 'get_profile_contact_card': {
      const p = state.tables.profiles.find(x => x.id === args.p_profile_id)
      if (!p) return null
      const published = publishedSnapshot(state, p)
      const card = (isOwner && !published ? p.contact_card : published?.contact_card) as Row | undefined
      if (!card?.enabled) return null
      const rest = { ...card }
      delete rest.enabled
      return { ...rest, username: p.username }
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
      const created = list.map(r => ({ id: `${table}-${Math.random().toString(36).slice(2, 8)}`, created_at: now, updated_at: now, ...r }))
      rows.push(...created)
      state.writes.push({ method: 'POST', table, body })
      return json(single ? created[0] : created, 201)
    }
    if (method === 'PATCH') {
      const body = req.postDataJSON() as Row
      const hit = filterRows(rows, params)
      const now = new Date().toISOString()
      // Como el trigger profiles_revision: sólo los cambios de contenido suben la revisión
      const bumps = table === 'profiles' && Object.keys(body).some(k => !['status', 'onboarding_step', 'published_version_id', 'published_at'].includes(k))
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
