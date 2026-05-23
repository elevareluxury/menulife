import { RevealOnScroll } from './RevealOnScroll'

const steps = [
  { icon: '📷', num: 1, title: 'Escanear QR', desc: 'El cliente escanea el QR de la mesa. Sin app, sin fricción.' },
  { icon: '⚡', num: 2, title: 'Abre al instante', desc: 'El menú carga en menos de un segundo, de forma impecable.' },
  { icon: '🍽️', num: 3, title: 'Navega el menú', desc: 'Fotos, categorías, precios y descripciones claras.' },
  { icon: '💳', num: 4, title: 'Paga', desc: 'Un toque. Apple Pay, Stripe o MercadoPago.' },
  { icon: '📈', num: 5, title: 'Analytics en vivo', desc: 'El restaurante recibe datos en tiempo real al instante.' },
]

export function FlowSection() {
  return (
    <section className="relative py-28 px-4 lg:px-16 bg-brown overflow-hidden">
      <div className="absolute inset-0 bg-gradient-radial from-orange/15 via-transparent to-transparent" />

      <RevealOnScroll>
        <p className="text-center text-xs font-semibold tracking-[0.14em] uppercase text-orange mb-3">
          Cómo funciona
        </p>
      </RevealOnScroll>

      <RevealOnScroll>
        <h2 className="font-display text-4xl lg:text-5xl font-semibold text-center mb-16 tracking-tight text-cream">
          Del escaneo al pago <em className="italic text-orange-light">en segundos.</em>
        </h2>
      </RevealOnScroll>

      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 max-w-6xl mx-auto">
        {steps.map((step, index) => (
          <RevealOnScroll key={index} delay={index * 100}>
            <div className="flex flex-col items-center text-center gap-4 group">
              <div className="relative w-16 h-16 rounded-2xl bg-cream/5 border border-cream/10 flex items-center justify-center text-2xl transition-all group-hover:scale-110 group-hover:border-orange/50 group-hover:bg-orange/10 group-hover:shadow-lg group-hover:shadow-orange/20">
                {step.icon}
                <div className="absolute -top-2 -right-2 w-5 h-5 bg-orange text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                  {step.num}
                </div>
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold text-cream mb-1">
                  {step.title}
                </h3>
                <p className="text-xs text-cream/50 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </div>
          </RevealOnScroll>
        ))}
      </div>
    </section>
  )
}
