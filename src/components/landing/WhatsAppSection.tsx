import { RevealOnScroll } from './RevealOnScroll'

const benefits = [
  {
    icon: '💬',
    title: 'Interfaz familiar',
    desc: 'Tu equipo ya usa WhatsApp. Cero curva de aprendizaje.',
  },
  {
    icon: '🎬',
    title: 'Tutoriales cortos en video',
    desc: 'Guías de 2 minutos para cada función. Lo ven una vez y ya saben.',
  },
  {
    icon: '🔗',
    title: 'Configuración con un link',
    desc: 'Compartís un solo enlace y tu equipo está listo en minutos.',
  },
]

const messages = [
  { type: 'received', text: '👋 ¡Bienvenido a MenuLife! Te configuro el restaurante en minutos.', time: '14:03' },
  { type: 'bot', text: '✅ Paso 1: ¡Tu menú está en vivo!\nAcá está tu link de onboarding:', link: '🔗 menulife.app/setup/onboard', time: '14:03' },
  { type: 'sent', text: 'Genial. ¿Cómo acceden mis mozos?', time: '14:04' },
  { type: 'bot', text: '🎬 Mandales este video de 2 min:', link: '▶ Ver: Inicio rápido para mozos', extra: '¡Estarán tomando pedidos en minutos!', time: '14:04' },
  { type: 'received', text: '📊 ¡Llegó tu primera orden! Mesa 4 · $32.00', time: '14:11' },
]

export function WhatsAppSection() {
  return (
    <section className="py-28 px-4 lg:px-16 bg-cream">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
        {/* Left content */}
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] uppercase text-orange mb-3">
            Onboarding
          </p>

          <RevealOnScroll>
            <h2 className="font-display text-4xl lg:text-5xl font-semibold mb-4 tracking-tight leading-tight">
              Capacitación<br />sin <em className="italic text-orange">capacitación.</em>
            </h2>
          </RevealOnScroll>

          <RevealOnScroll>
            <p className="text-muted leading-relaxed mb-9">
              Activamos el onboarding instantáneo por WhatsApp para dueños, encargados y mozos. Cero resistencia, adopción máxima.
            </p>
          </RevealOnScroll>

          <div className="space-y-5">
            {benefits.map((benefit, index) => (
              <RevealOnScroll key={index} delay={index * 100}>
                <div className="flex gap-4">
                  <div className="w-10 h-10 flex-shrink-0 bg-orange-dim border border-orange/15 rounded-xl flex items-center justify-center text-lg">
                    {benefit.icon}
                  </div>
                  <div>
                    <h4 className="font-display text-lg font-bold mb-0.5">{benefit.title}</h4>
                    <p className="text-[13px] text-muted leading-relaxed">{benefit.desc}</p>
                  </div>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>

        {/* Right - WhatsApp mockup */}
        <RevealOnScroll>
          <div className="bg-brown rounded-[20px] overflow-hidden shadow-2xl border border-white/5">
            {/* Header */}
            <div className="bg-[#0a1628] px-5 py-3.5 flex items-center gap-3 border-b border-white/5">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center text-base">
                🤖
              </div>
              <div>
                <div className="font-semibold text-white text-sm">MenuLife Asistente</div>
                <div className="text-[11px] text-[#25D366]">● En línea</div>
              </div>
            </div>

            {/* Messages */}
            <div className="bg-[#0d1117] p-4 space-y-2.5 min-h-[400px]">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`max-w-[85%] ${msg.type === 'sent' ? 'ml-auto' : ''}`}
                >
                  <div
                    className={`px-3.5 py-2.5 rounded-xl text-[13px] leading-relaxed ${
                      msg.type === 'received'
                        ? 'bg-[#1e2d20] rounded-bl-sm text-gray-200'
                        : msg.type === 'sent'
                        ? 'bg-[#2d4a2d] rounded-br-sm text-gray-200'
                        : 'bg-orange/10 border border-orange/20 rounded-bl-sm text-gray-200'
                    }`}
                  >
                    <div className="whitespace-pre-line">{msg.text}</div>
                    {msg.link && (
                      <div className="mt-1.5 inline-block bg-orange/20 border border-orange/35 text-orange-light px-3 py-1.5 rounded-lg text-xs font-semibold">
                        {msg.link}
                      </div>
                    )}
                    {msg.extra && <div className="mt-2">{msg.extra}</div>}
                    <div className="text-[9px] text-white/30 mt-1">{msg.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  )
}
