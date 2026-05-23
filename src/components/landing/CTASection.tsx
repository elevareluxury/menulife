import { Link } from 'react-router-dom'
import { RevealOnScroll } from './RevealOnScroll'

export function CTASection() {
  return (
    <section className="py-32 bg-brown-900 relative overflow-hidden">
      {/* Decorative glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-orange/10 blur-3xl pointer-events-none" />

      <div className="container mx-auto px-6 lg:px-12 text-center relative z-10">
        <RevealOnScroll>
          <p className="text-orange text-xs font-bold tracking-[0.2em] uppercase mb-6">
            Empieza hoy
          </p>
          <h2 className="font-display text-5xl lg:text-6xl xl:text-7xl text-cream leading-[1.08] mb-6 max-w-3xl mx-auto">
            Tu negocio merece una experiencia de{' '}
            <span className="italic text-orange">primer nivel.</span>
          </h2>
          <p className="text-cream/50 text-lg mb-12 max-w-lg mx-auto">
            Configuración en minutos. Sin tarjeta de crédito. Sin compromisos.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/register">
              <button className="px-10 py-5 bg-orange text-cream font-semibold rounded-xl hover:bg-orange-light transition-colors text-lg shadow-xl shadow-orange/25">
                Empezar gratis →
              </button>
            </Link>
            <Link to="/login">
              <button className="px-10 py-5 border border-cream/20 text-cream font-medium rounded-xl hover:bg-cream/5 transition-colors text-lg">
                Iniciar sesión
              </button>
            </Link>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  )
}
