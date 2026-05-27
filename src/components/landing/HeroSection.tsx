import { Link } from 'react-router-dom'
import { PhoneMockup } from './PhoneMockup'
import { RevealOnScroll } from './RevealOnScroll'

export function HeroSection() {
  return (
    <section className="relative min-h-screen bg-cream flex items-center overflow-hidden pt-20">
      {/* Background decorative blobs */}
      <div className="absolute inset-y-0 right-0 w-5/12 bg-brown-900/[0.04] rounded-bl-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 w-[500px] h-[500px] rounded-full bg-orange/[0.06] blur-3xl pointer-events-none" />

      <div className="container mx-auto px-6 lg:px-12 py-20 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

        {/* Left — copy */}
        <RevealOnScroll>
          <div className="max-w-xl">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-orange/10 rounded-full mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-orange animate-pulse-dot" />
              <span className="text-[13px] font-semibold text-orange tracking-wide">
                Sistema de Hospitalidad Digital
              </span>
            </div>

            {/* Headline */}
            <h1 className="font-display text-[52px] lg:text-[64px] xl:text-[72px] text-brown-900 leading-[1.05] mb-6">
              El sistema operativo{' '}
              <span className="italic text-orange">del negocio moderno.</span>
            </h1>

            {/* Subheadline */}
            <p className="text-muted text-lg leading-relaxed mb-10 max-w-md">
              Menús, pagos, herramientas para mozos y experiencias para clientes — unificados en una sola plataforma premium.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4 mb-10">
              <Link to="/solicitar-acceso">
                <button className="px-8 py-4 bg-orange text-cream font-semibold rounded-xl hover:bg-orange-light transition-colors shadow-lg shadow-orange/25 text-base">
                  Solicitar acceso →
                </button>
              </Link>
              <button className="px-8 py-4 border border-brown/25 text-brown font-medium rounded-xl hover:bg-brown/5 transition-colors text-base">
                Reservar demo
              </button>
            </div>

            {/* Trust pills */}
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {['Sin app', 'Listo en minutos', 'Pagos móviles', 'Onboarding por WhatsApp'].map(item => (
                <div key={item} className="flex items-center gap-1.5 text-sm text-muted">
                  <span className="text-orange font-bold text-xs">✓</span>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </RevealOnScroll>

        {/* Right — phone stack */}
        <div className="relative flex justify-center items-center h-[540px] lg:h-[640px]">
          {/* Shadow glow */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 rounded-full bg-orange/10 blur-3xl" />
          </div>

          {/* Waiter phone — left, tilted back */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 rotate-[-10deg] scale-[0.74] opacity-80 z-10 animate-float-slow">
            <PhoneMockup>
              <WaiterScreen />
            </PhoneMockup>
          </div>

          {/* Customer phone — center, front */}
          <div className="relative z-20 animate-float-medium drop-shadow-2xl">
            <PhoneMockup>
              <CustomerScreen />
            </PhoneMockup>
          </div>

          {/* Owner phone — right, tilted back */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 rotate-[10deg] scale-[0.74] opacity-80 z-10 animate-float-fast">
            <PhoneMockup>
              <OwnerScreen />
            </PhoneMockup>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted/50">
        <span className="text-xs tracking-widest uppercase">Scroll</span>
        <div className="w-px h-8 bg-muted/30" />
      </div>
    </section>
  )
}

function CustomerScreen() {
  return (
    <div className="bg-cream h-full flex flex-col">
      <div className="bg-brown-900 px-3 pt-2 pb-3 text-cream shrink-0">
        <div className="font-display text-[13px] font-semibold">La Trattoria</div>
        <div className="text-[9px] text-cream/50 mt-0.5">Menú digital · Mesa 5</div>
      </div>

      <div className="flex gap-1 px-2 py-2 shrink-0">
        {['Pastas', 'Carnes', 'Postres'].map((cat, i) => (
          <span
            key={cat}
            className={`px-2 py-0.5 rounded-full text-[9px] font-semibold whitespace-nowrap ${
              i === 0 ? 'bg-orange text-cream' : 'bg-brown/10 text-muted'
            }`}
          >
            {cat}
          </span>
        ))}
      </div>

      <div className="px-2 space-y-1.5 flex-1">
        {[
          { emoji: '🍝', name: 'Pasta Carbonara', desc: 'Panceta, parmesano', price: '$18' },
          { emoji: '🍋', name: 'Risotto Limone', desc: 'Limón, albahaca', price: '$22' },
          { emoji: '🥩', name: 'Tagliata', desc: 'Rúcula, parmesano', price: '$34' },
        ].map(item => (
          <div key={item.name} className="bg-white rounded-lg p-2 flex items-center gap-2 shadow-sm">
            <span className="text-base shrink-0">{item.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-semibold text-brown-900 truncate">{item.name}</div>
              <div className="text-[9px] text-muted truncate">{item.desc}</div>
            </div>
            <div className="text-[10px] font-bold text-orange shrink-0">{item.price}</div>
          </div>
        ))}
      </div>

      <div className="px-2 pb-3 pt-2 shrink-0">
        <div className="bg-orange text-cream text-[10px] font-semibold py-2 rounded-lg text-center shadow-sm">
          Ver carrito · $40.00 →
        </div>
      </div>
    </div>
  )
}

function WaiterScreen() {
  const tables = [
    { num: '1', status: 'Ocupada', type: 'occupied' },
    { num: '2', status: 'Libre', type: 'free' },
    { num: '3', status: '¡Orden!', type: 'alert' },
    { num: '4', status: 'Libre', type: 'free' },
    { num: '5', status: 'Ocupada', type: 'occupied' },
    { num: '6', status: 'Libre', type: 'free' },
  ]

  return (
    <div className="bg-cream h-full p-2.5 flex flex-col">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <span className="font-display text-[13px] font-semibold text-brown-900">MenuLife</span>
        <span className="text-[8px] bg-orange text-cream px-1.5 py-0.5 rounded font-bold tracking-wider">
          MOZO
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1.5 shrink-0">
        {tables.map(t => (
          <div
            key={t.num}
            className={`rounded-lg p-1.5 text-center border transition-colors ${
              t.type === 'alert'
                ? 'bg-orange/20 border-orange/40 text-orange'
                : t.type === 'occupied'
                ? 'bg-brown/10 border-brown/20 text-brown'
                : 'bg-white border-transparent text-muted'
            }`}
          >
            <div className="text-[11px] font-bold">{t.num}</div>
            <div className="text-[8px] font-medium leading-tight">{t.status}</div>
          </div>
        ))}
      </div>

      <div className="mt-3 bg-orange/10 border border-orange/20 rounded-lg p-2">
        <div className="text-[9px] font-semibold text-orange">🔔 Mesa 3 llama</div>
        <div className="text-[8px] text-muted mt-0.5">hace 1 min</div>
      </div>

      <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-2">
        <div className="text-[9px] font-semibold text-green-700">✓ Mesa 1 — listo</div>
        <div className="text-[8px] text-muted mt-0.5">3 items para entregar</div>
      </div>
    </div>
  )
}

function OwnerScreen() {
  return (
    <div className="bg-cream h-full p-3 flex flex-col gap-2">
      <div className="bg-brown-900 rounded-xl p-3 text-cream text-center">
        <div className="text-[9px] text-cream/50 mb-1">Ingresos hoy</div>
        <div className="font-display text-[26px] font-semibold leading-none">$2.840</div>
        <div className="text-[9px] text-green-400 mt-1">↑ 18% vs ayer</div>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {[
          { val: '48', label: 'Órdenes' },
          { val: '$59', label: 'Ticket prom.' },
          { val: '94%', label: 'Satisfacción' },
          { val: '12', label: 'Mesas' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-lg p-2 text-center shadow-sm">
            <div className="font-display text-[16px] font-semibold text-brown-900 leading-none">{stat.val}</div>
            <div className="text-[8px] text-muted mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl p-2 flex-1 flex flex-col justify-center">
        <div className="text-[9px] font-semibold text-brown mb-1.5">Top platos hoy</div>
        {[
          { name: 'Pasta Carbonara', pct: 72 },
          { name: 'Risotto', pct: 55 },
          { name: 'Tagliata', pct: 38 },
        ].map(item => (
          <div key={item.name} className="mb-1.5">
            <div className="flex justify-between text-[8px] text-muted mb-0.5">
              <span>{item.name}</span>
              <span>{item.pct}%</span>
            </div>
            <div className="h-1 bg-brown/10 rounded-full overflow-hidden">
              <div className="h-full bg-orange rounded-full" style={{ width: `${item.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
