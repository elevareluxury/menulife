import { RevealOnScroll } from './RevealOnScroll'
import { PhoneMockup } from './PhoneMockup'

const experiences = [
  {
    role: 'Experiencia del cliente',
    headline: 'Escanear.\nPedir. Listo.',
    trigger: 'Los clientes entienden MenuLife en segundos.',
    features: [
      'Sin app necesaria',
      'Acceso instantáneo por QR',
      'Fotos y categorías claras',
      'Pago en un toque',
    ],
    cta: 'Ver experiencia del cliente →',
    screen: 'customer',
  },
  {
    role: 'Experiencia del mozo',
    headline: 'Tu equipo lo\naprende en\nminutos.',
    trigger: 'Tu equipo ya sabe usar WhatsApp.',
    features: [
      'Gestión de mesas visual',
      'Órdenes en tiempo real',
      'Onboarding por WhatsApp',
      'Sin curva de aprendizaje',
    ],
    cta: 'Explorar herramientas →',
    screen: 'waiter',
  },
  {
    role: 'Experiencia del dueño',
    headline: 'Control\ntotal.',
    trigger: 'Gestioná tu negocio desde cualquier lugar.',
    features: [
      'Dashboard en tiempo real',
      'Analytics y mejores platos',
      'Branding personalizado',
      'Soporte multi-local',
    ],
    cta: 'Explorar dashboard →',
    screen: 'owner',
  },
]

export function ExperiencesSection() {
  return (
    <section className="py-28 px-4 lg:px-16 bg-cream">
      <RevealOnScroll>
        <p className="text-center text-xs font-semibold tracking-[0.14em] uppercase text-orange mb-3">
          Plataforma
        </p>
      </RevealOnScroll>

      <RevealOnScroll>
        <h2 className="font-display text-4xl lg:text-5xl font-semibold text-center mb-16 tracking-tight">
          Una plataforma. <em className="italic text-orange">Tres experiencias.</em>
        </h2>
      </RevealOnScroll>

      <div className="grid lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
        {experiences.map((exp, index) => (
          <RevealOnScroll key={index} delay={index * 60}>
            <div className="group bg-white border border-brown/10 rounded-[20px] overflow-hidden hover:border-orange/30 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-brown/10 transition-all duration-300">
              {/* Phone preview */}
              <div className="relative bg-cream-200 px-7 pt-7 pb-0 flex justify-center min-h-[260px] items-end overflow-hidden">
                <PhoneMockup className="relative z-10 shadow-2xl shadow-brown/20">
                  {exp.screen === 'customer' && <MiniCustomerScreen />}
                  {exp.screen === 'waiter' && <MiniWaiterScreen />}
                  {exp.screen === 'owner' && <MiniOwnerScreen />}
                </PhoneMockup>
              </div>

              {/* Info */}
              <div className="p-6">
                <div className="flex items-center gap-2 text-[11px] font-bold text-orange uppercase tracking-wider mb-2">
                  <div className="w-4 h-[2px] bg-orange" />
                  {exp.role}
                </div>

                <h3 className="font-display text-[26px] font-bold leading-tight mb-2 whitespace-pre-line">
                  {exp.headline}
                </h3>

                <p className="text-sm text-muted italic mb-5 leading-relaxed">
                  {exp.trigger}
                </p>

                <div className="space-y-2 mb-5">
                  {exp.features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-2 text-[13px] text-brown-100">
                      <div className="w-1 h-1 bg-orange rounded-full flex-shrink-0" />
                      {feature}
                    </div>
                  ))}
                </div>

                <button className="inline-flex items-center gap-2 text-[13px] font-semibold text-orange border border-orange/25 px-4 py-2 rounded-full bg-orange-dim hover:bg-orange/10 hover:border-orange transition-all">
                  {exp.cta}
                </button>
              </div>
            </div>
          </RevealOnScroll>
        ))}
      </div>
    </section>
  )
}

function MiniCustomerScreen() {
  return (
    <div className="min-h-[200px]">
      <div className="bg-orange px-2.5 py-2">
        <div className="font-display font-bold text-white text-[11px]">La Trattoria</div>
        <div className="text-[8px] text-white/80">Menú digital</div>
      </div>
      <div className="flex gap-1 px-2 py-1.5">
        <div className="bg-orange text-white px-2 py-0.5 rounded-full text-[8px] font-semibold">Pastas</div>
        <div className="bg-orange/10 text-orange px-2 py-0.5 rounded-full text-[8px] font-semibold">Carnes</div>
      </div>
      <div className="px-2 space-y-1">
        {['🍝 Carbonara · $18', '🍋 Risotto · $22', '🥩 Tagliata · $34'].map((item, i) => (
          <div key={i} className="flex items-center gap-1.5 py-1 border-b border-brown/5 text-[10px]">
            <span>{item}</span>
          </div>
        ))}
      </div>
      <div className="mx-2 mt-1.5 bg-orange text-white text-center py-1.5 rounded-lg text-[9px] font-bold">
        Pagar $40.00 →
      </div>
    </div>
  )
}

function MiniWaiterScreen() {
  return (
    <div className="min-h-[200px]">
      <div className="bg-brown-100 px-2.5 py-2 flex items-center gap-1.5">
        <span className="font-display font-bold text-white text-[10px]">MenuLife</span>
        <span className="ml-auto bg-orange/25 text-orange-light text-[7px] px-1.5 py-0.5 rounded font-semibold">MOZO</span>
      </div>
      <div className="grid grid-cols-3 gap-1 p-2">
        {['1 Ocupada', '2 Libre', '3 ¡Orden!', '4 Libre', '5 Ocupada', '6 Libre'].map((t, i) => (
          <div
            key={i}
            className={`rounded-md p-1 text-center text-[8px] font-semibold ${
              i === 2 ? 'bg-orange/20 text-orange' : i % 2 === 0 ? 'bg-orange/10 text-orange' : 'bg-brown/5 text-muted'
            }`}
          >
            {t}
          </div>
        ))}
      </div>
      <div className="px-2 space-y-0.5">
        <div className="text-[8px] font-bold text-brown-100 mb-1">Mesa 3 — Pedido activo</div>
        {['2x Carbonara', '1x Vino', '1x Tiramisú'].map((item, i) => (
          <div key={i} className="text-[8px] text-brown flex items-center gap-1">
            <div className="w-3 h-3 bg-orange text-white rounded text-[7px] flex items-center justify-center font-bold">
              {item[0]}
            </div>
            {item.slice(2)}
          </div>
        ))}
      </div>
    </div>
  )
}

function MiniOwnerScreen() {
  return (
    <div className="min-h-[200px]">
      <div className="bg-brown-100 px-2.5 py-2">
        <div className="text-[8px] text-white/50 uppercase">Ingresos hoy</div>
        <div className="font-display text-xl font-bold text-white">$2.840</div>
        <div className="text-[8px] text-green-400">↑ 18%</div>
      </div>
      <div className="grid grid-cols-2 gap-1 p-2">
        {[['48', 'Órdenes'], ['$59', 'Ticket'], ['94%', 'Satisf.'], ['12', 'Mesas']].map(([val, label], i) => (
          <div key={i} className="bg-brown/5 border border-brown/10 rounded-md p-1.5">
            <div className="font-display text-xs font-bold">{val}</div>
            <div className="text-[7px] text-muted">{label}</div>
          </div>
        ))}
      </div>
      <div className="px-2 pb-2">
        <div className="text-[8px] text-muted mb-1">Esta semana</div>
        <div className="flex items-end gap-0.5 h-8">
          {[35, 52, 44, 78, 65, 90, 72].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t bg-gradient-to-t from-orange/30 to-orange"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
