import { useState, useEffect } from 'react'
import { X, AlertTriangle, User } from 'lucide-react'
import type { CreateCustomerInput, DuplicateCheck, ServiceCustomer } from '../../types/customer'

interface CreateCustomerDrawerProps {
  open: boolean
  onClose: () => void
  onCreated: (customer: ServiceCustomer) => void
  onCheckDuplicates: (phone?: string | null, email?: string | null) => Promise<DuplicateCheck>
  onCreate: (input: CreateCustomerInput) => Promise<ServiceCustomer | null>
}

export function CreateCustomerDrawer({
  open,
  onClose,
  onCreated,
  onCheckDuplicates,
  onCreate,
}: CreateCustomerDrawerProps) {
  const [firstName, setFirstName] = useState('')
  const [lastName,  setLastName]  = useState('')
  const [phone,     setPhone]     = useState('')
  const [email,     setEmail]     = useState('')
  const [notes,     setNotes]     = useState('')
  const [saving,    setSaving]    = useState(false)
  const [duplicates, setDuplicates] = useState<DuplicateCheck>({ byPhone: null, byEmail: null })

  useEffect(() => {
    if (open) {
      setFirstName(''); setLastName(''); setPhone(''); setEmail(''); setNotes('')
      setDuplicates({ byPhone: null, byEmail: null })
    }
  }, [open])

  // Duplicate detection debounced 600ms
  useEffect(() => {
    if (!phone && !email) { setDuplicates({ byPhone: null, byEmail: null }); return }
    const t = setTimeout(async () => {
      const result = await onCheckDuplicates(phone || null, email || null)
      setDuplicates(result)
    }, 600)
    return () => clearTimeout(t)
  }, [phone, email, onCheckDuplicates])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!firstName.trim() || saving) return
    setSaving(true)
    const customer = await onCreate({
      first_name: firstName.trim(),
      last_name:  lastName.trim() || null,
      phone:      phone.trim() || null,
      email:      email.trim() || null,
      notes:      notes.trim() || null,
    })
    setSaving(false)
    if (customer) { onCreated(customer); onClose() }
  }

  const hasDuplicate = !!duplicates.byPhone || !!duplicates.byEmail

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className="relative w-full lg:w-[480px] rounded-t-3xl lg:rounded-2xl overflow-y-auto"
        style={{
          background: '#13161C',
          border: '1px solid rgba(255,255,255,0.08)',
          maxHeight: '92vh',
        }}
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 lg:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
        </div>

        {/* Header */}
        <div
          className="flex items-center justify-between px-5 pt-4 pb-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div>
            <h2 className="text-base font-bold text-white">Nuevo cliente</h2>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Menos de 30 segundos
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl transition-colors hover:bg-white/5"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">

          {/* Duplicate warning */}
          {hasDuplicate && (
            <div
              className="flex items-start gap-2.5 rounded-xl p-3"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}
            >
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-px" style={{ color: '#F59E0B' }} />
              <div className="text-xs" style={{ color: '#F59E0B' }}>
                {duplicates.byPhone && (
                  <p>
                    Teléfono ya registrado:{' '}
                    <span className="font-semibold">{duplicates.byPhone.full_name}</span>
                  </p>
                )}
                {duplicates.byEmail && (
                  <p className={duplicates.byPhone ? 'mt-0.5' : ''}>
                    Email ya registrado:{' '}
                    <span className="font-semibold">{duplicates.byEmail.full_name}</span>
                  </p>
                )}
                <p className="mt-1" style={{ color: 'rgba(245,158,11,0.55)' }}>
                  Podés continuar de todas formas.
                </p>
              </div>
            </div>
          )}

          {/* Nombre + Apellido */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Nombre *
              </label>
              <input
                autoFocus
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder="Juan"
                required
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none placeholder:text-white/20"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Apellido
              </label>
              <input
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder="Pérez"
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none placeholder:text-white/20"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            </div>
          </div>

          {/* Teléfono */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Teléfono
            </label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+54 11 1234-5678"
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none placeholder:text-white/20"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${duplicates.byPhone ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.08)'}`,
              }}
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="juan@email.com"
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none placeholder:text-white/20"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${duplicates.byEmail ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.08)'}`,
              }}
            />
          </div>

          {/* Notas */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Notas
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Observaciones internas..."
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none resize-none placeholder:text-white/20"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            />
          </div>

          {/* Submit */}
          <div className="pt-1 pb-2">
            <button
              type="submit"
              disabled={!firstName.trim() || saving}
              className="w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
              style={{
                background: '#F4705A',
                color: '#fff',
                opacity: !firstName.trim() || saving ? 0.5 : 1,
              }}
            >
              {saving ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <User className="w-4 h-4" />
                  Crear cliente
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
