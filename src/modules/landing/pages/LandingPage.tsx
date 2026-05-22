import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Sparkles, ArrowRight, Menu, X } from 'lucide-react'

export function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50 overflow-hidden">
      {/* Floating blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-20 left-10 w-72 h-72 bg-emerald-200/40 rounded-full blur-3xl"
          style={{ transform: `translateY(${scrollY * 0.2}px)` }}
        />
        <div
          className="absolute bottom-20 right-10 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl"
          style={{ transform: `translateY(${scrollY * -0.3}px)` }}
        />
      </div>

      {/* Navbar */}
      <nav className="relative z-50 bg-white/80 backdrop-blur-md border-b sticky top-0">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-lg flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-emerald-500 to-blue-500 bg-clip-text text-transparent">
                menulife
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-4">
              <Link to="/login"><Button variant="ghost">Iniciar sesión</Button></Link>
              <Link to="/register"><Button>Probar gratis</Button></Link>
            </div>

            <button className="md:hidden p-2" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {isMenuOpen && (
            <div className="md:hidden mt-4 pb-4 space-y-2 border-t pt-4">
              <Link to="/login" className="block">
                <Button variant="secondary" className="w-full">Iniciar sesión</Button>
              </Link>
              <Link to="/register" className="block">
                <Button className="w-full">Probar gratis</Button>
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-20 pb-32 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-full mb-8">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-medium text-emerald-700">El futuro de los menús digitales</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Tu menú digital,{' '}
            <span className="bg-gradient-to-r from-emerald-500 via-blue-500 to-amber-500 bg-clip-text text-transparent">
              siempre actualizado
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-2xl mx-auto">
            El sistema más completo para restaurantes argentinos.
            Actualizá precios en segundos, gestioná pedidos, mozos y delivery.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link to="/register">
              <Button size="lg" className="group">
                Prueba gratis 14 días
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="secondary">Iniciar sesión</Button>
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
            {[
              { value: '99.9%', label: 'Uptime' },
              { value: '<2s', label: 'Actualización' },
              { value: '500+', label: 'Restaurantes' },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <div className="text-3xl font-bold text-emerald-500 mb-1">{value}</div>
                <div className="text-sm text-gray-500">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative py-20 px-4 bg-white/50">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">Todo lo que necesitás</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { emoji: '📱', title: 'Sin app necesaria', desc: 'Tus clientes escanean el QR y ven el menú al instante, sin descargas.' },
              { emoji: '⚡', title: 'Actualización instantánea', desc: 'Cambiá precios y disponibilidad en segundos desde cualquier dispositivo.' },
              { emoji: '🌍', title: 'Bilingüe ES/EN', desc: 'Menú en español e inglés para atender a turistas y clientes internacionales.' },
            ].map(({ emoji, title, desc }) => (
              <div key={title} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="text-4xl mb-4">{emoji}</div>
                <h3 className="text-xl font-semibold mb-2">{title}</h3>
                <p className="text-gray-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
