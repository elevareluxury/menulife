// Las columnas de `restaurants` que pide el menú público son exactamente las que la base le deja leer al visitante
// (migración 20261108000001_restaurants_public_columns.sql). Si difieren, el menú falla sin sesión o se abre de más.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PUBLIC_RESTAURANT_COLUMNS } from '../../src/modules/public/lib/publicRestaurant'

const sql = readFileSync(join(__dirname, '../../supabase/migrations/20261108000001_restaurants_public_columns.sql'), 'utf8')
const sqlColumns = [...(sql.match(/v_public constant text\[\] := array\[([\s\S]*?)\];/)?.[1] ?? '').matchAll(/'([a-z_]+)'/g)]
  .map(m => m[1])

describe('columnas públicas de restaurants', () => {
  it('la app y la migración usan la misma lista', () => {
    expect(sqlColumns.length).toBeGreaterThan(0)
    expect([...PUBLIC_RESTAURANT_COLUMNS].sort()).toEqual([...sqlColumns].sort())
  })

  it('no incluye datos privados del negocio', () => {
    const privadas = ['owner_id', 'email', 'phone', 'address', 'postal_code', 'plan', 'subscription_status', 'trial_ends_at',
      'plan_activated_by', 'notes', 'daily_sales_goal', 'mercadopago_access_token', 'organization_id']
    for (const c of privadas) expect(PUBLIC_RESTAURANT_COLUMNS as readonly string[]).not.toContain(c)
  })
})
