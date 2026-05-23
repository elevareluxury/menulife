import { Link } from 'react-router-dom'

export function FinalCTA() {
  return (
    <section className="relative py-28 px-4 lg:px-16 bg-brown-100 text-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-radial from-orange/18 via-transparent to-transparent" />

      <div className="relative z-10 max-w-4xl mx-auto">
        <div className="text-xs font-semibold tracking-[0.14em] uppercase text-orange mb-5">
          Empezá hoy
        </div>

        <h2 className="font-display text-5xl lg:text-7xl font-semibold mb-4 tracking-tight leading-tight text-cream">
          Transformá la experiencia<br />
          de tu <em className="italic text-orange-light">restaurante.</em>
        </h2>

        <p className="text-base text-cream/55 mb-10 leading-relaxed">
          Menús modernos. Servicio más rápido. Hospitalidad premium.<br />
          Más de 1.200 restaurantes ya usan MenuLife.
        </p>

        <div className="flex flex-wrap gap-4 justify-center">
          <Link to="/register">
            <button className="px-9 py-4 bg-orange text-white rounded-full font-semibold text-base shadow-lg shadow-orange/30 hover:bg-orange-light hover:shadow-xl hover:shadow-orange/40 hover:-translate-y-0.5 transition-all">
              Empezar gratis →
            </button>
          </Link>
          <button className="px-8 py-4 border border-cream/25 text-cream/80 rounded-full font-semibold text-base hover:border-orange hover:text-orange-light transition-all">
            Reservar demo
          </button>
        </div>
      </div>
    </section>
  )
}
