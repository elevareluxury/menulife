import { useState } from 'react'
import { User, Phone, Mail, LogOut, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { usePortalCtx } from '../PortalApp'
import { apiUpdateProfile } from '../portalAPI'

export function PortalProfile() {
  const { session, logout } = usePortalCtx()

  const [name,    setName]    = useState(session.customer_name)
  const [phone,   setPhone]   = useState('')
  const [email,   setEmail]   = useState(session.customer_email)
  const [saving,  setSaving]  = useState(false)
  const [dirty,   setDirty]   = useState(false)

  const initials = name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')

  const handleSave = async () => {
    if (!dirty) return
    setSaving(true)
    const result = await apiUpdateProfile(session.token, name.trim(), phone.trim(), email.trim())
    setSaving(false)
    if (result.success) {
      toast.success('Perfil actualizado')
      setDirty(false)
    } else {
      toast.error('Error al guardar')
    }
  }

  const handleLogout = () => {
    if (window.confirm('¿Cerrar sesión?')) logout()
  }

  const field = (
    icon: React.ReactNode,
    label: string,
    value: string,
    onChange: (v: string) => void,
    type = 'text',
    readOnly = false,
  ) => (
    <div className="mb-3">
      <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5"
        style={{ color: 'rgba(255,255,255,0.3)' }}>
        {label}
      </p>
      <div
        className="flex items-center gap-3 rounded-2xl px-4"
        style={{
          background: readOnly ? 'rgba(255,255,255,0.02)' : '#13161C',
          border: '1px solid rgba(255,255,255,0.08)',
          height: 52,
        }}
      >
        <span style={{ color: 'rgba(255,255,255,0.25)' }}>{icon}</span>
        <input
          type={type}
          value={value}
          readOnly={readOnly}
          onChange={e => { onChange(e.target.value); setDirty(true) }}
          className="flex-1 bg-transparent outline-none text-sm text-white"
          style={{
            opacity: readOnly ? 0.5 : 1,
            caretColor: '#F4705A',
          }}
        />
      </div>
    </div>
  )

  return (
    <div>
      {/* Avatar */}
      <div className="flex flex-col items-center mb-8">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mb-3"
          style={{ background: 'rgba(244,112,90,0.12)', border: '1px solid rgba(244,112,90,0.2)' }}
        >
          <span className="text-2xl font-bold" style={{ color: '#F4705A' }}>{initials}</span>
        </div>
        <p className="text-lg font-bold text-white">{name}</p>
        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {session.customer_email}
        </p>
      </div>

      {/* Form */}
      <div
        className="rounded-3xl p-5 mb-4"
        style={{ background: '#0D0F14', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <p className="text-[10px] font-bold uppercase tracking-widest mb-4"
          style={{ color: 'rgba(255,255,255,0.3)' }}>
          Mis datos
        </p>

        {field(<User className="w-4 h-4" />, 'Nombre completo', name, setName)}
        {field(<Phone className="w-4 h-4" />, 'Teléfono', phone, setPhone, 'tel')}
        {field(<Mail className="w-4 h-4" />, 'Email', email, setEmail, 'email')}

        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          className="w-full h-12 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 mt-2 transition-opacity"
          style={{
            background: '#F4705A',
            opacity: !dirty || saving ? 0.4 : 1,
          }}
        >
          <Save className="w-4 h-4" />
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full h-12 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2"
        style={{
          background: 'rgba(239,68,68,0.06)',
          border: '1px solid rgba(239,68,68,0.12)',
          color: '#EF4444',
        }}
      >
        <LogOut className="w-4 h-4" />
        Cerrar sesión
      </button>
    </div>
  )
}
