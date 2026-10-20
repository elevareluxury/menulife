import { beforeEach, describe, expect, it, vi } from 'vitest'

// Eventos de Life OS: los ayudantes mandan sólo etiquetas y una sola vez por guardado (src/lib/productEvents.ts)
const rpc = vi.fn<(fn: string, args: unknown) => Promise<{ data: unknown; error: null }>>(() => Promise.resolve({ data: 'ok', error: null }))
vi.mock('@/lib/publicRpc', () => ({ publicRpc: (fn: string, args: unknown) => rpc(fn, args) }))

const { trackCapture, trackGoalLink } = await import('@/lib/productEvents')

beforeEach(() => { rpc.mockClear() })

describe('trackGoalLink', () => {
  it('cuenta cuando el ítem queda con una meta nueva', () => {
    trackGoalLink('habit', 'g1')
    trackGoalLink('money', 'g2', 'g1')
    expect(rpc.mock.calls).toEqual([
      ['track_product_event', { p_event: 'item_linked_to_goal', p_props: { tipo: 'habit' } }],
      ['track_product_event', { p_event: 'item_linked_to_goal', p_props: { tipo: 'money' } }],
    ])
  })
  it('no cuenta sin meta ni al volver a guardar con la misma', () => {
    trackGoalLink('task', null)
    trackGoalLink('task', '', null)
    trackGoalLink('note', 'g1', 'g1')
    expect(rpc).not.toHaveBeenCalled()
  })
})

describe('trackCapture', () => {
  it('tipo y destino; count sólo cuando se guardaron varias', () => {
    trackCapture('quick', 'idea')
    trackCapture('dump', 'task', 1)
    trackCapture('dump', 'money', 3)
    trackCapture('dump', 'task', 900)
    expect(rpc.mock.calls.map(c => (c[1] as { p_props: unknown }).p_props)).toEqual([
      { tipo: 'quick', dest: 'idea' },
      { tipo: 'dump', dest: 'task' },
      { tipo: 'dump', dest: 'money', count: 3 },
      { tipo: 'dump', dest: 'task', count: 200 },
    ])
  })
})
