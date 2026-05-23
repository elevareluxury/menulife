import { RevealOnScroll } from './RevealOnScroll'

const steps = [
  {
    number: '01',
    title: 'Escaneás el QR',
    body: 'El cliente escanea el código en la mesa desde la cámara del celular. Cero apps, cero fricción.',
    icon: '📱',
  },
  {
    number: '02',
    title: 'Pedís desde la mesa',
    body: 'Explorar el menú, filtrar por preferencias, agregar al carrito y confirmar el pedido en segundos.',
    icon: '🛒',
  },
  {
    number: '03',
    title: 'La cocina lo recibe',
    body: 'El pedido aparece al instante en el KDS de cocina, ordenado por estado y tiempo de espera.',
    icon: '👨‍🍳',
  },
  {
    number: '04',
    title: 'El mozo entrega',
    body: 'Cuando el plato está listo, el mozo recibe una notificación. La cuenta se genera automáticamente.',
    icon: '✓',
  },
]

export function HowItWorksSection() {
  return (
    <section className="py-32 bg-cream overflow-hidden">
      <div className="container mx-auto px-6 lg:px-12">
        <RevealOnScroll>
          <div className="text-center mb-20">
            <p className="text-orange text-xs font-bold tracking-[0.2em] uppercase mb-4">
              Cómo funciona
            </p>
            <h2 className="font-display text-5xl lg:text-6xl text-brown-900 mb-5">
              De cero a operativo{' '}
              <span className="italic text-orange">en minutos.</span>
            </h2>
          </div>
        </RevealOnScroll>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          {/* Connector line (desktop) */}
          <div className="hidden lg:block absolute top-10 left-[12.5%] right-[12.5%] h-px bg-brown/10 z-0" />

          {steps.map((step, i) => (
            <RevealOnScroll key={step.number} delay={i * 100}>
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-cream-200 rounded-2xl flex items-center justify-center text-3xl mb-5 shadow-sm border border-brown/10">
                  {step.icon}
                </div>
                <div className="text-xs font-bold text-orange tracking-widest mb-2">
                  {step.number}
                </div>
                <h3 className="font-display text-xl text-brown-900 mb-3">{step.title}</h3>
                <p className="text-muted text-sm leading-relaxed">{step.body}</p>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  )
}
