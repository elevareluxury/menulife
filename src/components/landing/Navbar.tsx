import { useState } from 'react'
import { Link } from 'react-router-dom'

const navLinks = [
  { label: 'Producto', href: '#experiences' },
  { label: 'Cómo funciona', href: '#flow' },
  { label: 'Onboarding', href: '#whatsapp' },
  { label: 'Precios', href: '#pricing' },
]

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-cream/90 backdrop-blur-lg border-b border-brown/10">
      <div className="px-4 lg:px-16 h-[68px] flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 font-display font-bold text-2xl tracking-tight">
          <div className="w-8 h-8 bg-gradient-to-br from-orange to-orange-light rounded-lg flex items-center justify-center text-white text-base">
            M
          </div>
          MenuLife
        </Link>

        {/* Desktop links */}
        <div className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-[13px] font-medium text-muted hover:text-brown transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Desktop actions */}
        <div className="hidden lg:flex items-center gap-3">
          <Link to="/login">
            <button className="px-5 py-2 border border-brown/20 rounded-full text-[13px] font-medium text-brown-100 hover:border-orange hover:text-orange transition-all">
              Iniciar sesión
            </button>
          </Link>
          <Link to="/register">
            <button className="px-6 py-2.5 bg-orange text-white rounded-full text-[13px] font-semibold shadow-md shadow-orange/30 hover:bg-orange-light hover:shadow-lg hover:shadow-orange/40 transition-all">
              Empezar gratis
            </button>
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="lg:hidden p-2"
          aria-label="Menú"
        >
          {isMenuOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="lg:hidden bg-white border-t border-brown/10 px-4 py-4 space-y-3">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="block text-muted hover:text-brown py-1"
              onClick={() => setIsMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <Link to="/login" className="block" onClick={() => setIsMenuOpen(false)}>
            <button className="w-full px-5 py-2 border border-brown/20 rounded-full text-[13px] font-medium">
              Iniciar sesión
            </button>
          </Link>
          <Link to="/register" className="block" onClick={() => setIsMenuOpen(false)}>
            <button className="w-full px-6 py-2.5 bg-orange text-white rounded-full text-[13px] font-semibold">
              Empezar gratis
            </button>
          </Link>
        </div>
      )}
    </nav>
  )
}
