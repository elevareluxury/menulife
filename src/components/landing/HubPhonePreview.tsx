/* Static hub preview — replicates the look of a Mycen Hub Digital page
   inside the 260×520px phone mockup. No network requests, no iframe. */
export function HubPhonePreview() {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: '#080B10',
      overflowY: 'auto',
      overflowX: 'hidden',
      fontFamily: 'var(--font-jakarta)',
      scrollbarWidth: 'none',
    }}>

      {/* Cover */}
      <div style={{
        height: '130px',
        background: 'linear-gradient(160deg, #1c0d06 0%, #2a1209 40%, #0F1115 100%)',
        position: 'relative',
        flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `
            radial-gradient(circle at 28% 55%, rgba(244,112,90,0.18) 0%, transparent 50%),
            radial-gradient(circle at 72% 25%, rgba(244,112,90,0.10) 0%, transparent 45%)
          `,
        }} />
        {/* Verified badge top-right */}
        <div style={{
          position: 'absolute', top: '10px', right: '12px',
          background: 'rgba(244,112,90,0.18)',
          border: '1px solid rgba(244,112,90,0.4)',
          borderRadius: '20px',
          padding: '3px 8px',
          fontSize: '9px', fontWeight: 700,
          color: '#F4705A',
          display: 'flex', alignItems: 'center', gap: '4px',
        }}>
          ✦ Mycen
        </div>
      </div>

      {/* Avatar */}
      <div style={{
        display: 'flex', justifyContent: 'center',
        marginTop: '-30px', position: 'relative', zIndex: 2,
        marginBottom: '10px',
      }}>
        <div style={{
          width: '60px', height: '60px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #F4705A 0%, #c4503d 100%)',
          border: '3px solid #080B10',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '22px',
          boxShadow: '0 4px 20px rgba(244,112,90,0.35)',
          flexShrink: 0,
        }}>🍽️</div>
      </div>

      {/* Name, location, status */}
      <div style={{ textAlign: 'center', padding: '0 14px 14px' }}>
        <h1 style={{
          color: '#fff', fontSize: '15px', fontWeight: 800,
          margin: '0 0 3px', fontFamily: 'var(--font-syne)',
          letterSpacing: '-0.01em',
        }}>
          Test Restaurant
        </h1>
        <p style={{
          color: 'rgba(255,255,255,0.38)', fontSize: '10px',
          margin: '0 0 10px', lineHeight: 1.4,
        }}>
          Gastronomía · Buenos Aires
        </p>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          background: 'rgba(16,185,129,0.12)',
          border: '1px solid rgba(16,185,129,0.3)',
          borderRadius: '20px', padding: '3px 9px',
          fontSize: '9px', fontWeight: 700, color: '#10B981',
        }}>
          <span style={{
            width: '5px', height: '5px', borderRadius: '50%',
            background: '#10B981', display: 'inline-block',
            boxShadow: '0 0 6px #10B981',
          }} />
          Abierto ahora
        </span>
      </div>

      {/* Smart links */}
      <div style={{ padding: '0 12px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
        {[
          { emoji: '🍽️', label: 'Ver Menú Digital',      sub: 'Sin descarga · Pedir ahora'   },
          { emoji: '📅', label: 'Reservar Mesa',          sub: 'Disponibilidad en tiempo real' },
          { emoji: '💬', label: 'Escribir por WhatsApp',  sub: 'Respuesta en minutos'           },
          { emoji: '📍', label: 'Cómo llegar',            sub: 'Av. Corrientes 1234'            },
        ].map(link => (
          <div key={link.label} style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '10px',
            padding: '9px 10px',
            display: 'flex', alignItems: 'center', gap: '8px',
            cursor: 'default',
          }}>
            <span style={{ fontSize: '14px', flexShrink: 0 }}>{link.emoji}</span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{
                color: '#fff', fontSize: '10px', fontWeight: 600,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{link.label}</div>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '9px', marginTop: '1px' }}>
                {link.sub}
              </div>
            </div>
            <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: '11px', flexShrink: 0 }}>›</span>
          </div>
        ))}
      </div>

      {/* Social icons row */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: '8px',
        padding: '14px 12px 10px',
      }}>
        {['IG', 'FB', 'TK', 'YT'].map(s => (
          <div key={s} style={{
            width: '26px', height: '26px', borderRadius: '7px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.07)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{
              fontSize: '8px', fontWeight: 700,
              color: 'rgba(255,255,255,0.35)',
              letterSpacing: '-0.02em',
            }}>{s}</span>
          </div>
        ))}
      </div>

      {/* Powered by */}
      <div style={{ textAlign: 'center', paddingBottom: '14px' }}>
        <span style={{
          fontSize: '8px', color: 'rgba(255,255,255,0.18)',
          fontWeight: 500, letterSpacing: '0.04em',
        }}>
          Powered by Mycen ✦
        </span>
      </div>

    </div>
  )
}
