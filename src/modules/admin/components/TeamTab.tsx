import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Shield, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const db = supabase as any

const DEFAULT_ROLES = [
  { name: 'owner',    display_name: 'Dueño',         is_system: true },
  { name: 'admin',    display_name: 'Administrador',  is_system: true },
  { name: 'manager',  display_name: 'Encargado',      is_system: true },
  { name: 'cashier',  display_name: 'Cajero',         is_system: true },
  { name: 'waiter',   display_name: 'Mozo',           is_system: true },
  { name: 'kitchen',  display_name: 'Cocina',         is_system: true },
  { name: 'delivery', display_name: 'Repartidor',     is_system: true },
  { name: 'viewer',   display_name: 'Solo lectura',   is_system: true },
]

const CATEGORY_ORDER = ['POS', 'OPERACIONES', 'MENÚ', 'FINANZAS', 'ADMIN']

interface Permission {
  id: string
  name: string
  display_name: string
  category: string
}

interface Role {
  id: string
  name: string
  display_name: string
  is_system: boolean
  permissions: Set<string>
}

interface StaffMember {
  id: string
  display_name: string
  role_type: 'waiter' | 'delivery'
  assigned_role_id: string | null
  user_role_id: string | null
}

interface TeamTabProps {
  restaurantId: string
  userName: string
}

export function TeamTab({ restaurantId, userName }: TeamTabProps) {
  const [roles, setRoles]           = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [staff, setStaff]           = useState<StaffMember[]>([])
  const [loading, setLoading]       = useState(true)
  const [expandedRole, setExpandedRole] = useState<string | null>(null)
  const [savingPerm, setSavingPerm] = useState<string | null>(null)

  useEffect(() => { init() }, [restaurantId])

  async function init() {
    setLoading(true)
    try {
      // Seed default roles (ON CONFLICT DO NOTHING)
      await db.from('roles').upsert(
        DEFAULT_ROLES.map(r => ({ ...r, restaurant_id: restaurantId })),
        { onConflict: 'restaurant_id,name', ignoreDuplicates: true }
      )

      const [rolesRes, permsRes] = await Promise.all([
        db.from('roles')
          .select('id, name, display_name, is_system')
          .eq('restaurant_id', restaurantId)
          .order('name'),
        db.from('permissions')
          .select('id, name, display_name, category')
          .order('category, display_name'),
      ])

      const rolesData: any[] = rolesRes.data ?? []
      const permsData: Permission[] = permsRes.data ?? []

      const roleIds = rolesData.map((r: any) => r.id)
      const { data: rpData } = roleIds.length
        ? await db.from('role_permissions').select('role_id, permission_id').in('role_id', roleIds)
        : { data: [] }

      const rpMap: Record<string, Set<string>> = {}
      for (const rp of rpData ?? []) {
        if (!rpMap[rp.role_id]) rpMap[rp.role_id] = new Set()
        rpMap[rp.role_id].add(rp.permission_id)
      }

      setRoles(rolesData.map((r: any) => ({ ...r, permissions: rpMap[r.id] ?? new Set() })))
      setPermissions(permsData)

      // Fetch staff
      const [waitersRes, driversRes] = await Promise.all([
        db.from('waiters')
          .select('id, first_name, last_name')
          .eq('restaurant_id', restaurantId)
          .eq('is_active', true),
        db.from('delivery_drivers')
          .select('id, first_name, last_name')
          .eq('restaurant_id', restaurantId),
      ])

      const staffList: Array<{ id: string; display_name: string; role_type: 'waiter' | 'delivery' }> = [
        ...(waitersRes.data ?? []).map((w: any) => ({
          id: w.id,
          display_name: `${w.first_name} ${w.last_name}`.trim(),
          role_type: 'waiter' as const,
        })),
        ...(driversRes.data ?? []).map((d: any) => ({
          id: d.id,
          display_name: `${d.first_name} ${d.last_name}`.trim(),
          role_type: 'delivery' as const,
        })),
      ]

      const { data: urData } = staffList.length
        ? await db.from('user_roles').select('id, user_id, role_id').in('user_id', staffList.map(s => s.id))
        : { data: [] }

      const urMap: Record<string, { role_id: string; ur_id: string }> = {}
      for (const ur of urData ?? []) {
        urMap[ur.user_id] = { role_id: ur.role_id, ur_id: ur.id }
      }

      setStaff(staffList.map(s => ({
        ...s,
        assigned_role_id: urMap[s.id]?.role_id ?? null,
        user_role_id: urMap[s.id]?.ur_id ?? null,
      })))
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar el equipo')
    } finally {
      setLoading(false)
    }
  }

  async function togglePermission(role: Role, permId: string) {
    const has = role.permissions.has(permId)
    const key = role.id + permId
    setSavingPerm(key)
    try {
      if (has) {
        await db.from('role_permissions')
          .delete()
          .eq('role_id', role.id)
          .eq('permission_id', permId)
      } else {
        await db.from('role_permissions').insert({ role_id: role.id, permission_id: permId })
      }
      await db.from('audit_logs').insert({
        restaurant_id: restaurantId,
        action: has ? 'permission_removed' : 'permission_granted',
        entity_type: 'role',
        entity_id: role.id,
        details: { role_name: role.name, permission_id: permId },
        user_name: userName,
        created_at: new Date().toISOString(),
      })
      setRoles(prev => prev.map(r => {
        if (r.id !== role.id) return r
        const next = new Set(r.permissions)
        has ? next.delete(permId) : next.add(permId)
        return { ...r, permissions: next }
      }))
    } catch {
      toast.error('Error al actualizar permiso')
    } finally {
      setSavingPerm(null)
    }
  }

  async function assignRole(member: StaffMember, roleId: string | null) {
    try {
      if (!roleId) {
        if (member.user_role_id) {
          await db.from('user_roles').delete().eq('id', member.user_role_id)
          setStaff(prev => prev.map(s =>
            s.id === member.id ? { ...s, assigned_role_id: null, user_role_id: null } : s
          ))
        }
        return
      }
      const { data } = await db
        .from('user_roles')
        .upsert(
          { user_id: member.id, role_id: roleId, restaurant_id: restaurantId },
          { onConflict: 'user_id,restaurant_id' }
        )
        .select('id')
        .single()

      await db.from('audit_logs').insert({
        restaurant_id: restaurantId,
        action: 'role_assigned',
        entity_type: 'user_role',
        entity_id: member.id,
        details: { member_name: member.display_name, role_id: roleId },
        user_name: userName,
        created_at: new Date().toISOString(),
      })
      setStaff(prev => prev.map(s =>
        s.id === member.id
          ? { ...s, assigned_role_id: roleId, user_role_id: data?.id ?? s.user_role_id }
          : s
      ))
      toast.success('Rol actualizado')
    } catch {
      toast.error('Error al asignar rol')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const grouped = CATEGORY_ORDER.map(cat => ({
    category: cat,
    items: permissions.filter(p => p.category?.toUpperCase() === cat),
  })).filter(g => g.items.length > 0)

  return (
    <div className="space-y-6">

      {/* ── Roles y permisos ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-ink-3" strokeWidth={2} />
          <h3 className="text-sm font-semibold text-ink-1">Roles y permisos</h3>
        </div>

        <div className="space-y-2">
          {roles.map(role => (
            <div
              key={role.id}
              className="rounded-xl overflow-hidden"
              style={{ background: '#1A1D24', border: '1px solid var(--border-subtle)' }}
            >
              <button
                onClick={() => setExpandedRole(expandedRole === role.id ? null : role.id)}
                className="w-full flex items-center justify-between px-4 py-3.5 text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-sm font-medium text-ink-1">{role.display_name}</span>
                  <span className="text-[11px] font-mono text-ink-4">{role.name}</span>
                  {role.is_system && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded font-medium text-ink-4"
                      style={{ background: 'rgba(255,255,255,0.05)' }}
                    >
                      Sistema
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-ink-4">{role.permissions.size} perm.</span>
                  {expandedRole === role.id
                    ? <ChevronUp className="w-4 h-4 text-ink-4" />
                    : <ChevronDown className="w-4 h-4 text-ink-4" />
                  }
                </div>
              </button>

              {expandedRole === role.id && (
                <div
                  className="px-4 pb-4 pt-3"
                  style={{ borderTop: '1px solid var(--border-subtle)' }}
                >
                  {grouped.length === 0 ? (
                    <p className="text-xs text-ink-4 py-2">
                      No hay permisos en la base de datos.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {grouped.map(group => (
                        <div key={group.category}>
                          <p className="text-[10px] font-semibold text-ink-4 uppercase tracking-widest mb-2">
                            {group.category}
                          </p>
                          <div className="space-y-1">
                            {group.items.map(perm => {
                              const checked = role.permissions.has(perm.id)
                              const isSaving = savingPerm === role.id + perm.id
                              return (
                                <label
                                  key={perm.id}
                                  className={cn(
                                    'flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer select-none transition-colors',
                                    checked ? 'bg-brand/5' : 'hover:bg-surface-3',
                                    isSaving && 'pointer-events-none opacity-60'
                                  )}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={isSaving}
                                    onChange={() => togglePermission(role, perm.id)}
                                    className="w-4 h-4 rounded accent-brand flex-shrink-0"
                                  />
                                  <span className={cn('text-sm flex-1', checked ? 'text-ink-1' : 'text-ink-3')}>
                                    {perm.display_name}
                                  </span>
                                  {isSaving && (
                                    <div className="w-3.5 h-3.5 border border-brand border-t-transparent rounded-full animate-spin" />
                                  )}
                                </label>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Asignar roles al equipo ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-ink-3" strokeWidth={2} />
          <h3 className="text-sm font-semibold text-ink-1">Asignar roles al equipo</h3>
        </div>

        {staff.length === 0 ? (
          <div
            className="rounded-xl px-5 py-8 text-center"
            style={{ background: '#1A1D24', border: '1px solid var(--border-subtle)' }}
          >
            <Users className="w-8 h-8 text-ink-4 mx-auto mb-2" />
            <p className="text-sm text-ink-3">No hay mozos ni repartidores configurados.</p>
            <p className="text-xs text-ink-4 mt-1">Agregá tu equipo en Mozos y Repartidores.</p>
          </div>
        ) : (
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: '#1A1D24', border: '1px solid var(--border-subtle)' }}
          >
            {staff.map((member, idx) => (
              <div
                key={member.id}
                className={cn(
                  'flex items-center justify-between gap-3 px-4 py-3',
                  idx < staff.length - 1 && 'border-b border-border-subtle'
                )}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-1 truncate">{member.display_name}</p>
                  <p className="text-xs text-ink-4">
                    {member.role_type === 'waiter' ? 'Mozo' : 'Repartidor'}
                  </p>
                </div>
                <select
                  value={member.assigned_role_id ?? ''}
                  onChange={e => assignRole(member, e.target.value || null)}
                  className="text-sm rounded-lg px-3 py-1.5 bg-surface-3 text-ink-2 border border-border-subtle focus:outline-none focus:border-brand flex-shrink-0"
                  style={{ minWidth: 140 }}
                >
                  <option value="">Sin rol</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.display_name}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
