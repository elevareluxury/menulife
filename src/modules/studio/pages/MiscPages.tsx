import { Link } from 'react-router-dom'
import { BarChart3, ChevronRight, LayoutGrid, LogOut, Palette, Settings, UserRound } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useStudio } from '../StudioContext'
import { PreviewSwitcher } from '../components/PreviewPane'
import { PageHeader } from '../components/ui'

export function PreviewPage() {
  const { publicUrl } = useStudio()
  return (
    <>
      <PageHeader title="Vista previa" subtitle="Así ven tu perfil. Se actualiza mientras editás."
        actions={<a className="st-btn st-btn-secondary st-btn-sm" href={publicUrl} target="_blank" rel="noopener noreferrer">Abrir</a>} />
      <PreviewSwitcher />
    </>
  )
}

export function MorePage() {
  const { business } = useStudio()
  const signOut = useAuthStore(s => s.signOut)
  const items = [
    { to: '/studio/modules', label: 'Módulos', icon: LayoutGrid },
    { to: '/studio/appearance', label: 'Apariencia', icon: Palette },
    { to: '/studio/analytics', label: 'Analítica', icon: BarChart3 },
    { to: '/studio/settings', label: 'Ajustes', icon: Settings },
  ]
  return (
    <>
      <PageHeader title="Más" />
      <nav className="st-card" style={{ padding: 6 }} aria-label="Más opciones">
        {items.map(i => (
          <Link key={i.to} to={i.to} className="st-nav-item" style={{ justifyContent: 'space-between' }}>
            <span className="st-row"><i.icon size={18} aria-hidden="true" /> {i.label}</span>
            <ChevronRight size={16} aria-hidden="true" />
          </Link>
        ))}
      </nav>
      <nav className="st-card" style={{ padding: 6 }} aria-label="Otras experiencias">
        {business && <a className="st-nav-item" href="/dashboard"><LayoutGrid size={18} aria-hidden="true" /> Mycen Business</a>}
        <a className="st-nav-item" href="/life"><UserRound size={18} aria-hidden="true" /> Life OS</a>
        <button type="button" className="st-nav-item" style={{ border: 0, background: 'none', width: '100%', cursor: 'pointer', fontFamily: 'inherit' }}
          onClick={() => { void signOut() }}>
          <LogOut size={18} aria-hidden="true" /> Cerrar sesión
        </button>
      </nav>
    </>
  )
}
