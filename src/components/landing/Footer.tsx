import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="bg-brown border-t border-white/5 py-12 px-4 lg:px-16">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-center gap-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 font-display font-bold text-xl text-cream">
          <div className="w-8 h-8 bg-gradient-to-br from-orange to-orange-light rounded-lg flex items-center justify-center text-white text-base">
            M
          </div>
          MenuLife
        </Link>

        {/* Links */}
        <div className="flex flex-wrap gap-7 justify-center text-sm">
          {['Producto', 'Precios', 'Sobre nosotros', 'Contacto', 'Privacidad'].map((link) => (
            <a
              key={link}
              href="#"
              className="text-cream/40 hover:text-cream transition-colors"
            >
              {link}
            </a>
          ))}
        </div>

        {/* Copyright */}
        <div className="text-xs text-cream/30">
          © 2025 MenuLife. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  )
}
