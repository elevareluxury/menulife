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
  return {
    tables: { profiles: [], profile_modules: [], profile_stats_daily: [], ...seed },
    usernameHistory,
    rpcCalls: [],
    writes: [],
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

function publicProfile(state: MockState, username: string, isOwner: boolean): unknown {
  const u = username.trim().toLowerCase()
  const p = state.tables.profiles.find(x => x.username === u)
  if (!p) {
    const id = state.usernameHistory[u]
    const target = state.tables.profiles.find(x => x.id === id && x.status === 'published')
    return target ? { redirect: target.username } : null
  }
  if (p.status !== 'published' && !isOwner) return { status: 'unavailable' }
  const modules = state.tables.profile_modules
    .filter(m => m.profile_id === p.id && m.visibility === 'active' && m.deleted_at == null)
    .sort((a, b) => Number(a.position) - Number(b.position))
    .map(m => ({ id: m.id, type: m.type, title: m.title, content: m.content, config: m.config, translations: m.translations }))
  const card = p.contact_card as Row | null
  return {
    id: p.id, username: p.username, display_name: p.display_name, descriptor: p.descriptor, bio: p.bio,
    avatar_url: p.avatar_url, cover_url: p.cover_url, purpose: p.purpose, status: p.status, tags: p.tags,
    theme: p.theme, primary_action: p.primary_action, default_locale: p.default_locale, translations: p.translations,
    has_contact_card: !!card?.enabled, is_owner: isOwner, business: null, modules,
  }
}

function rpc(state: MockState, fn: string, args: Row, isOwner: boolean): unknown {
  state.rpcCalls.push({ fn, args })
  switch (fn) {
    case 'get_public_profile': return publicProfile(state, String(args.p_username ?? ''), isOwner)
    case 'get_profile_contact_card': {
      const p = state.tables.profiles.find(x => x.id === args.p_profile_id)
      const card = p?.contact_card as Row | undefined
      if (!p || !card?.enabled || (p.status !== 'published' && !isOwner)) return null
      const rest = { ...card }
      delete rest.enabled
      return { ...rest, username: p.username }
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
      return json(rpc(state, path.slice(4), args, isOwner))
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
      hit.forEach(r => Object.assign(r, body, { updated_at: now }))
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
