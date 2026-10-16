import { describe, expect, it } from 'vitest'
import { projectKey, RESERVE_KEY, supportKey, urlKey } from '@/modules/profile/lib/clickKeys'
import { clickItemLabel, portfolioProjectIds, rankClicks, type ClickModule, type ClickLabels } from '@/modules/studio/lib/clickStats'

const KEY_FORMAT = /^[A-Za-z0-9:_.-]{1,64}$/ // = profile_events_item_key_check

const labels: ClickLabels = {
  primary: 'Acción principal', reserve: 'Reservar', vcard: 'Guardar contacto', itemGone: 'Link que ya no está',
  moduleGone: 'Módulo eliminado', supportAlias: 'Alias, CVU o CBU', supportPix: 'Clave Pix',
}

const group: ClickModule = {
  id: 'm-group', type: 'link_group', title: 'Mis links',
  content: { items: [{ title: 'Web', url: 'https://ana.design' }, { title: 'Tienda', url: 'https://shop.ana.design' }] },
}
const support: ClickModule = {
  id: 'm-support', type: 'support', title: null,
  content: { methods: [{ kind: 'mercadopago', value: 'https://mpago.la/abc' }, { kind: 'alias', value: 'ana.mp' }, { kind: 'link', value: 'https://tip.example.com/ana' }] },
}
const listen: ClickModule = {
  id: 'm-listen', type: 'listen_on', title: 'Disco',
  content: { links: [{ platform: 'spotify', url: 'https://open.spotify.com/album/1' }] },
}
const contact: ClickModule = { id: 'm-contact', type: 'contact', title: 'Contacto', content: { whatsapp: '+5491100000000', email: 'ana@x.com' } }
const portfolio: ClickModule = { id: 'm-port', type: 'portfolio', title: 'Proyectos', content: {} }
const modules = [group, support, listen, contact, portfolio]
const moduleTitle = (m: ClickModule) => m.title ?? m.type

describe('Claves de botón', () => {
  it('son cortas, estables y con el formato que acepta la base', () => {
    const keys = [urlKey('https://ana.design'), urlKey(' https://ana.design '), supportKey({ kind: 'buymeacoffee', value: 'https://x.y/'.repeat(30) }),
      projectKey('8f14e45f-ceea-467a-9575-6e9e4a4a1a1a'), RESERVE_KEY, 'whatsapp', 'youtube_music']
    for (const k of keys) expect(k).toMatch(KEY_FORMAT)
    expect(urlKey('https://ana.design')).toBe(urlKey(' https://ana.design '))
    expect(urlKey('https://ana.design')).not.toBe(urlKey('https://shop.ana.design'))
    expect(supportKey({ kind: 'link', value: 'https://a.com' })).not.toBe(supportKey({ kind: 'link', value: 'https://b.com' }))
  })
})

describe('Nombres con el contenido actual', () => {
  it('cada botón con su nombre; si ya no está, null', () => {
    expect(clickItemLabel(group, urlKey('https://shop.ana.design'), labels)).toBe('Tienda')
    expect(clickItemLabel(group, urlKey('https://borrado.com'), labels)).toBeNull()
    expect(clickItemLabel(support, supportKey({ kind: 'mercadopago', value: 'https://mpago.la/abc' }), labels)).toBe('Mercado Pago')
    expect(clickItemLabel(support, supportKey({ kind: 'alias', value: 'ana.mp' }), labels)).toBe('Alias, CVU o CBU')
    expect(clickItemLabel(support, supportKey({ kind: 'link', value: 'https://tip.example.com/ana' }), labels)).toBe('tip.example.com')
    expect(clickItemLabel(listen, 'spotify', labels)).toBe('Spotify')
    expect(clickItemLabel(listen, 'deezer', labels)).toBeNull()
    expect(clickItemLabel(contact, 'whatsapp', labels)).toBe('WhatsApp')
    expect(clickItemLabel(contact, 'email', labels)).toBe('ana@x.com')
    expect(clickItemLabel(contact, 'phone', labels)).toBeNull()
    expect(clickItemLabel(portfolio, 'p:pr-1', labels, new Map([['pr-1', 'Marca Café']]))).toBe('Marca Café')
  })
})

describe('Ranking', () => {
  it('ordena por toques, calcula el % sobre visitas y suma por módulo', () => {
    const r = rankClicks({
      visits: 40,
      items: [
        { event_type: 'module_click', module_id: 'm-group', item_key: urlKey('https://ana.design'), taps: 10, visitors: 8 },
        { event_type: 'module_click', module_id: 'm-group', item_key: urlKey('https://viejo.com'), taps: 2, visitors: 2 },
        { event_type: 'module_click', module_id: 'm-group', item_key: urlKey('https://otro-viejo.com'), taps: 1, visitors: 1 },
        { event_type: 'module_click', module_id: 'm-listen', item_key: 'spotify', taps: 4, visitors: 4 },
        { event_type: 'module_click', module_id: 'borrado', item_key: 'x', taps: 3, visitors: 3 },
        { event_type: 'module_click', module_id: null, item_key: null, taps: 1, visitors: 1 },
        { event_type: 'primary_action_click', module_id: null, item_key: null, taps: 6, visitors: 6 },
        { event_type: 'primary_action_click', module_id: null, item_key: RESERVE_KEY, taps: 2, visitors: 2 },
        { event_type: 'vcard_download', module_id: null, item_key: null, taps: 5, visitors: 5 },
      ],
    }, modules, { labels, moduleTitle })

    expect(r.items.map(i => [i.label, i.taps])).toEqual([
      ['Web', 10], ['Acción principal', 6], ['Guardar contacto', 5], ['Módulo eliminado', 4], ['Spotify', 4],
      ['Link que ya no está', 3], ['Reservar', 2],
    ])
    expect(r.items[0]).toMatchObject({ module: 'Mis links', ctr: 0.25 })
    expect(r.items.find(i => i.label === 'Acción principal')?.module).toBeNull()
    expect(r.modules.map(m => [m.label, m.taps])).toEqual([['Mis links', 13], ['Disco', 4], ['Módulo eliminado', 4]])
  })

  it('sin visitas no inventa un porcentaje', () => {
    const r = rankClicks({ visits: 0, items: [{ event_type: 'module_click', module_id: 'm-contact', item_key: 'email', taps: 1, visitors: 1 }] },
      modules, { labels, moduleTitle })
    expect(r.items[0]).toMatchObject({ label: 'ana@x.com', ctr: null })
  })

  it('pide nombres de proyectos sólo si se tocó alguno', () => {
    expect(portfolioProjectIds({ visits: 1, items: [{ event_type: 'module_click', module_id: 'm-port', item_key: 'p:pr-1', taps: 1, visitors: 1 }] })).toEqual(['pr-1'])
    expect(portfolioProjectIds({ visits: 1, items: [] })).toEqual([])
  })
})
