import { useState, useRef, useEffect } from 'react'
import { MapPin, ChevronDown, Check, Layers } from 'lucide-react'
import { useOrganization } from '../hooks/useOrganization'

export function LocationSwitcher() {
  const { organization, locations, currentLocationId, currentLocation, isMultiLocation, setCurrentLocation } =
    useOrganization()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Only render for multi-location orgs
  if (!isMultiLocation || !organization) return null

  const isAll = currentLocationId === null

  return (
    <div
      ref={ref}
      className="relative mx-3 mb-1"
    >
      {/* Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
        style={{
          background: open ? 'rgba(244,112,90,0.08)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${open ? 'rgba(244,112,90,0.2)' : 'rgba(255,255,255,0.07)'}`,
          color: 'rgba(255,255,255,0.75)',
        }}
      >
        {isAll
          ? <Layers className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#F4705A' }} />
          : <MapPin  className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }} />
        }
        <span className="flex-1 text-left truncate">
          {isAll ? 'Todas las sucursales' : (currentLocation?.name ?? 'Sucursal')}
        </span>
        <ChevronDown
          className="w-3 h-3 flex-shrink-0 transition-transform"
          style={{
            color: 'rgba(255,255,255,0.3)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden z-50 py-1"
          style={{
            background: '#1A1D25',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}
        >
          {/* Individual locations */}
          {locations.map(loc => {
            const isSelected = loc.id === currentLocationId
            return (
              <button
                key={loc.id}
                onClick={() => { setCurrentLocation(loc.id); setOpen(false) }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition-colors"
                style={{
                  background: isSelected ? 'rgba(244,112,90,0.08)' : 'transparent',
                  color: isSelected ? '#F4705A' : 'rgba(255,255,255,0.65)',
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
              >
                <MapPin className="w-3 h-3 flex-shrink-0" style={{ color: isSelected ? '#F4705A' : 'rgba(255,255,255,0.25)' }} />
                <span className="flex-1 font-medium">{loc.name}</span>
                {loc.city && (
                  <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>{loc.city}</span>
                )}
                {isSelected && <Check className="w-3 h-3 flex-shrink-0" style={{ color: '#F4705A' }} />}
              </button>
            )
          })}

          {/* Separator + All locations */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '4px 0' }} />
          <button
            onClick={() => { setCurrentLocation(null); setOpen(false) }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition-colors"
            style={{
              background: isAll ? 'rgba(244,112,90,0.08)' : 'transparent',
              color: isAll ? '#F4705A' : 'rgba(255,255,255,0.5)',
            }}
            onMouseEnter={e => { if (!isAll) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
            onMouseLeave={e => { if (!isAll) e.currentTarget.style.background = 'transparent' }}
          >
            <Layers className="w-3 h-3 flex-shrink-0" style={{ color: isAll ? '#F4705A' : 'rgba(255,255,255,0.25)' }} />
            <span className="flex-1 font-semibold">Todas las sucursales</span>
            {isAll && <Check className="w-3 h-3 flex-shrink-0" style={{ color: '#F4705A' }} />}
          </button>
        </div>
      )}
    </div>
  )
}
