import { Link } from 'react-router-dom'
import { RevealOnScroll } from './RevealOnScroll'

const plans = [
  {
    tier: 'Inicial',
    name: 'Esencial',
    desc: 'Para restaurantes pequeños que quieren digitalizarse.',
    price: '$49',
    period: '/ mes',
    features: [
      '1 local',
      'Menú digital + QR',
      'Onboarding por WhatsApp',
      'Analytics básicos',
      'Pagos móviles',
    ],
    cta: 'Comenzar',
    featured: false,
  },
  {
    tier: 'Crecimiento',
    name: 'Profesional',
    desc: 'Para restaurantes serios que quieren la experiencia completa.',
    price: '$129',
    period: '/ mes',
    features: [
      'Hasta 3 locales',
      'Editor de menú + branding',
      'Onboarding + videos',
      'Analytics avanzados con IA',
      'División de cuenta y propinas',
      'Soporte prioritario',
    ],
    cta: 'Empezar prueba gratis',
    featured: true,
  },
  {
    tier: 'Enterprise',
    name: 'Hospitalidad',
    desc: 'Para grupos con múltiples locales y hotelería.',
    price: 'A medida',
    period: '',
    features: [
      'Locales ilimitados',
      'Integraciones personalizadas',
      'Onboarding dedicado',
      'Branding a medida',
      'SLA + soporte dedicado',
      'Opción white-label',
    ],
    cta: 'Hablar con el equipo',
    featured: false,
  },
]

export function PricingSection() {
  return (
    <section className="py-28 px-4 lg:px-16 bg-cream-200">
      <RevealOnScroll>
        <p className="text-center text-xs font-semibold tracking-[0.14em] uppercase text-orange mb-3">
          Precios
        </p>
      </RevealOnScroll>

      <RevealOnScroll>
        <h2 className="font-display text-4xl lg:text-5xl font-semibold text-center mb-16 tracking-tight">
          Simple y <em className="italic text-orange">transparente.</em>
        </h2>
      </RevealOnScroll>

      <div className="grid lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {plans.map((plan, index) => (
          <RevealOnScroll key={index} delay={index * 100}>
            <div
              className={`relative rounded-[20px] p-9 transition-all hover:-translate-y-1.5 hover:shadow-2xl ${
                plan.featured
                  ? 'bg-brown-100 border border-orange/40 shadow-2xl shadow-brown/25'
                  : 'bg-white border border-brown/10 shadow-sm shadow-brown/5'
              }`}
            >
              {plan.featured && (
                <div className="absolute -top-3 right-6 bg-orange text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  Más popular
                </div>
              )}

              <div className="text-[11px] font-bold uppercase tracking-wider mb-3 text-orange">
                {plan.tier}
              </div>

              <h3 className={`font-display text-2xl font-bold mb-2 ${plan.featured ? 'text-white' : 'text-brown'}`}>
                {plan.name}
              </h3>

              <p className={`text-[13px] mb-6 leading-relaxed ${plan.featured ? 'text-cream/55' : 'text-muted'}`}>
                {plan.desc}
              </p>

              <div className={`mb-6 pb-6 border-b ${plan.featured ? 'border-white/10' : 'border-brown/10'}`}>
                <span className={`font-display text-5xl font-bold ${plan.featured ? 'text-white' : 'text-brown'}`}>
                  {plan.price}
                </span>
                {plan.period && (
                  <span className={`text-sm ml-1 ${plan.featured ? 'text-cream/45' : 'text-muted'}`}>
                    {plan.period}
                  </span>
                )}
              </div>

              <div className="space-y-2.5 mb-7">
                {plan.features.map((feature, i) => (
                  <div key={i} className={`flex items-center gap-2 text-[13px] ${plan.featured ? 'text-cream/75' : 'text-brown-100'}`}>
                    <span className="text-orange font-bold text-xs">✓</span>
                    {feature}
                  </div>
                ))}
              </div>

              <Link to="/register">
                <button
                  className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all ${
                    plan.featured
                      ? 'bg-orange text-white shadow-lg shadow-orange/35 hover:bg-orange-light hover:shadow-xl hover:shadow-orange/45'
                      : 'border border-brown/20 hover:border-orange hover:text-orange'
                  }`}
                >
                  {plan.cta}
                </button>
              </Link>
            </div>
          </RevealOnScroll>
        ))}
      </div>

      <RevealOnScroll>
        <p className="text-center text-sm text-muted mt-12">
          ¿No sabés qué plan te conviene?{' '}
          <a href="#" className="text-orange font-semibold hover:underline">
            Reservá una llamada de estrategia
          </a>{' '}
          — encontramos la mejor opción para tu restaurante.
        </p>
      </RevealOnScroll>
    </section>
  )
}
