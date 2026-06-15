import { useNavigate } from 'react-router-dom'
import { ArrowLeft, type LucideIcon } from 'lucide-react'

interface Feature {
  icon: string
  title: string
  description: string
}

interface ServicesPlaceholderPageProps {
  icon: LucideIcon
  title: string
  description: string
  features: Feature[]
  accentColor?: string
}

export function ServicesPlaceholderPage({
  icon: Icon,
  title,
  description,
  features,
  accentColor = '#F4705A',
}: ServicesPlaceholderPageProps) {
  const navigate = useNavigate()

  return (
    <div className="max-w-xl mx-auto lg:max-w-2xl pb-10">

      {/* Back + Header */}
      <div className="flex items-center gap-3 mb-6 pt-1">
        <button
          onClick={() => navigate('/dashboard')}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
          style={{ backgroundColor: '#1c1f26', border: '1px solid #2a2d35' }}
        >
          <ArrowLeft className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.6)' }} />
        </button>
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${accentColor}18`, border: `1px solid ${accentColor}30` }}
          >
            <Icon className="w-4 h-4" style={{ color: accentColor }} />
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-tight">{title}</h1>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{description}</p>
          </div>
        </div>
      </div>

      {/* Coming soon card */}
      <div
        className="rounded-2xl p-6 mb-5 text-center"
        style={{ backgroundColor: '#1c1f26', border: '1px solid #2a2d35' }}
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: `${accentColor}12`, border: `1px solid ${accentColor}25` }}
        >
          <Icon className="w-7 h-7" style={{ color: accentColor }} />
        </div>
        <div
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-3"
          style={{ backgroundColor: `${accentColor}15`, color: accentColor, border: `1px solid ${accentColor}30` }}
        >
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: accentColor }} />
          Próximamente
        </div>
        <h2 className="text-lg font-bold text-white mb-2">{title}</h2>
        <p className="text-sm mb-1" style={{ color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
          {description}
        </p>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
          Este módulo estará disponible en la próxima actualización.
        </p>
      </div>

      {/* Features preview */}
      <div
        className="rounded-2xl p-5"
        style={{ backgroundColor: '#13161C', border: '1px solid #1e2128' }}
      >
        <p
          className="text-[10px] font-bold uppercase tracking-widest mb-4"
          style={{ color: 'rgba(255,255,255,0.3)' }}
        >
          Lo que vas a poder hacer
        </p>
        <div className="space-y-3">
          {features.map(f => (
            <div key={f.title} className="flex items-start gap-3">
              <span className="text-lg flex-shrink-0 mt-0.5">{f.icon}</span>
              <div>
                <p className="text-sm font-semibold text-white">{f.title}</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{f.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
