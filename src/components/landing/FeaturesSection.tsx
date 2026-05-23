import { RevealOnScroll } from './RevealOnScroll'

const features = [
  {
    tag: 'Para el cliente',
    headline: 'Ordenar nunca fue tan fácil.',
    body: 'Escanean el QR, exploran el menú en su idioma, agregan items al carrito y confirman el pedido — todo desde el celular, sin descargar ninguna app.',
    bullets: [
      'Menú bilingüe ES / EN',
      'Filtros vegano, vegetariano, sin TACC',
      'Carrito con notas por item',
      'Pedido directo desde la mesa',
    ],
    accent: 'bg-orange/10',
    tagStyle: 'bg-orange/15 text-orange',
  },
  {
    tag: 'Para el mozo',
    headline: 'Todo el salón en la palma de tu mano.',
    body: 'Dashboard en tiempo real: estado de mesas, alertas de pedidos listos y gestión de llamadas — todo desde el celular con un PIN.',
    bullets: [
      'Login seguro con PIN de 6 dígitos',
      'Vista de mesas y pedidos asignados',
      'Alertas push instantáneas',
      'Sistema de cuentas y propinas',
    ],
    accent: 'bg-cream-200',
    tagStyle: 'bg-brown/10 text-brown',
  },
  {
    tag: 'Para el dueño',
    headline: 'Control total del negocio.',
    body: 'KDS de cocina, analytics de ventas, gestión de mozos y mesas — todo centralizado en un panel diseñado para escalar.',
    bullets: [
      'KDS profesional con 4 columnas',
      'Estadísticas y ticket promedio',
      'Gestión de staff con turnos',
      'Configuración drag & drop de mesas',
    ],
    accent: 'bg-brown/5',
    tagStyle: 'bg-brown/10 text-brown',
  },
]

export function FeaturesSection() {
  return (
    <section className="py-32 bg-cream-50">
      <div className="container mx-auto px-6 lg:px-12">
        <RevealOnScroll>
          <div className="text-center mb-20">
            <p className="text-orange text-xs font-bold tracking-[0.2em] uppercase mb-4">
              Plataforma completa
            </p>
            <h2 className="font-display text-5xl lg:text-6xl text-brown-900 mb-5">
              Tres experiencias.{' '}
              <span className="italic text-orange">Una plataforma.</span>
            </h2>
            <p className="text-muted text-lg max-w-xl mx-auto">
              Diseñado para cada actor del negocio — cliente, mozo y dueño.
            </p>
          </div>
        </RevealOnScroll>

        <div className="grid lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <RevealOnScroll key={f.tag} delay={i * 120}>
              <div className={`${f.accent} rounded-2xl p-8 h-full flex flex-col`}>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mb-6 ${f.tagStyle}`}>
                  {f.tag}
                </span>
                <h3 className="font-display text-2xl text-brown-900 mb-4 leading-snug">
                  {f.headline}
                </h3>
                <p className="text-muted text-sm leading-relaxed mb-7 flex-1">
                  {f.body}
                </p>
                <ul className="space-y-2.5">
                  {f.bullets.map(b => (
                    <li key={b} className="flex items-start gap-2 text-sm text-brown">
                      <span className="text-orange font-bold mt-0.5 shrink-0">✓</span>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <RevealOnScroll delay={200}>
        <div className="container mx-auto px-6 lg:px-12 mt-20">
          <div className="bg-brown-900 rounded-2xl px-8 py-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { value: '500+', label: 'Negocios activos' },
              { value: '99.9%', label: 'Uptime garantizado' },
              { value: '<2s', label: 'Tiempo de carga' },
              { value: '4.9★', label: 'Satisfacción promedio' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="font-display text-4xl font-semibold text-cream mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-cream/50">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </RevealOnScroll>
    </section>
  )
}
