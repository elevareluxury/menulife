export function TrustBand() {
  const logos = [
    'La Trattoria', 'Café Roma', 'El Rancho', 'Sushi Tokyo',
    'Pizzería Del Centro', 'Bar El Cóndor', 'Resto Gourmet',
    'La Parrilla', 'Heladería Milano', 'Café del Sol',
  ]
  const track = logos.map(l => `${l} ·`).join(' ')

  return (
    <div style={{ background: 'var(--ml-dark)', paddingBottom: '0' }}>
      {/* Gradient transition dark → off-white */}
      <div style={{ height: '80px', background: 'linear-gradient(180deg, var(--ml-dark) 0%, var(--ml-off-white) 100%)' }} />

      <div style={{
        background:  'var(--ml-off-white)',
        padding:     '28px 0 36px',
        overflow:    'hidden',
      }}>
        <p style={{
          textAlign:     'center',
          fontSize:      '11px',
          fontWeight:    600,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color:         'var(--ml-gray-500)',
          fontFamily:    'var(--font-jakarta)',
          marginBottom:  '20px',
        }}>Negocios que ya digitalizaron con MenuLife</p>

        {/* Marquee track */}
        <div style={{
          position:   'relative',
          overflow:   'hidden',
          maskImage:  'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
          WebkitMaskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
        }}>
          <div style={{
            display:    'flex',
            width:      'max-content',
            animation:  'ml-marquee 28s linear infinite',
            gap:        '0',
          }}>
            {/* 3 repetitions so the loop is seamless */}
            {[0,1,2].map(rep => (
              <span key={rep} style={{
                fontFamily:    'var(--font-jakarta)',
                fontSize:      '15px',
                fontWeight:    500,
                color:         'var(--ml-gray-700)',
                whiteSpace:    'nowrap',
                padding:       '0 8px',
              }}>{track} {track}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
