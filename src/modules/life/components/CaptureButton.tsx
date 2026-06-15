import { useState } from 'react'
import { Plus, X, Lightbulb, StickyNote, CheckSquare } from 'lucide-react'

const QUICK_ACTIONS = [
  { icon: Lightbulb,   label: 'Idea',  color: '#8B5CF6' },
  { icon: StickyNote,  label: 'Nota',  color: '#3B82F6' },
  { icon: CheckSquare, label: 'Tarea', color: '#22C55E' },
]

export function CaptureButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 48,
            background: 'rgba(0,0,0,0.35)',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* Quick action pills */}
      {open && (
        <div style={{
          position: 'fixed',
          bottom: 'calc(152px + env(safe-area-inset-bottom))',
          right: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          zIndex: 49,
          animation: 'life-capture-in 0.18s ease-out both',
        }}>
          {QUICK_ACTIONS.map(({ icon: Icon, label, color }) => (
            <button
              key={label}
              onClick={() => setOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 16px',
                borderRadius: '999px',
                border: '1px solid rgba(255,255,255,0.08)',
                cursor: 'pointer',
                background: 'rgba(19,22,28,0.95)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                fontFamily: 'var(--font-jakarta)',
                fontSize: '13px', fontWeight: 600,
                color: '#F5F7FA',
                transition: 'transform 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = '' }}
            >
              <Icon size={16} style={{ color }} />
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Main + button */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          position: 'fixed',
          bottom: 'calc(84px + env(safe-area-inset-bottom))',
          right: '20px',
          width: '52px', height: '52px',
          borderRadius: '9999px', border: 'none', cursor: 'pointer',
          background: open
            ? 'rgba(60,62,70,0.95)'
            : 'linear-gradient(135deg, #F4705A 0%, #E05A45 100%)',
          color: '#fff',
          boxShadow: open
            ? '0 4px 16px rgba(0,0,0,0.3)'
            : '0 4px 20px rgba(244,112,90,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 49,
          transition: 'background 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = '' }}
        aria-label={open ? 'Cerrar captura' : 'Capturar'}
      >
        <div style={{ transition: 'transform 0.2s ease', transform: open ? 'rotate(45deg)' : 'rotate(0deg)' }}>
          {open ? <X size={20} strokeWidth={2.5} /> : <Plus size={22} strokeWidth={2.5} />}
        </div>
      </button>

      <style>{`
        @keyframes life-capture-in {
          from { opacity: 0; transform: translateY(8px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  )
}
