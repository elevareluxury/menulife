import { moduleRow, projectRow } from './mockSupabase'

// Un módulo de cada tipo con contenido realista. Sirve para fijar cómo se ven en público y que
// abrir y guardar cada uno en Studio no cambie su contenido (Fase 4: registro de módulos).
// `label` = cómo aparece en la lista de Studio ("Editar <label>").
export const MODULE_FIXTURES = [
  { label: 'Mi portfolio', row: moduleRow({ id: 'm-link', type: 'link', title: 'Mi portfolio', position: 10,
    content: { url: 'https://ana.design', link_type: 'website', subtitle: 'Trabajos 2026', style: 'button' } }) },
  { label: 'Instagram', row: moduleRow({ id: 'm-social', type: 'social', title: null, position: 20,
    content: { network: 'instagram', handle: '@ana', url: 'https://instagram.com/ana' } }) },
  { label: 'Escribime', row: moduleRow({ id: 'm-contact', type: 'contact', title: 'Escribime', position: 30,
    content: { whatsapp: '+54 9 341 555 0000', email: 'hola@ana.com' } }) },
  { label: 'Estudio', row: moduleRow({ id: 'm-location', type: 'location', title: 'Estudio', position: 40,
    content: { address: 'Córdoba 1234', city: 'Rosario', maps_url: 'https://maps.app.goo.gl/ana' } }) },
  { label: 'Sobre mí', row: moduleRow({ id: 'm-text', type: 'text', title: 'Sobre mí', position: 50,
    content: { body: 'Diseño marcas desde 2015.' } }) },
  { label: 'Imagen', row: moduleRow({ id: 'm-image', type: 'image', title: null, position: 60,
    content: { url: 'https://cdn.example.com/taller.jpg', caption: 'Mi taller', alt: 'Taller de Ana' } }) },
  { label: 'Reservá una llamada', row: moduleRow({ id: 'm-featured', type: 'featured_action', title: null, position: 70,
    content: { label: 'Reservá una llamada', url: 'https://cal.com/ana' } }) },
  { label: 'Logo express', row: moduleRow({ id: 'm-product', type: 'product', title: null, position: 80,
    content: { name: 'Logo express', description: 'Identidad en 5 días', price: 150000, tag: 'Nuevo', cta_text: 'Pedir', cta_url: 'https://wa.me/5493415550000' } }) },
  { label: 'Horarios', row: moduleRow({ id: 'm-hours', type: 'hours', title: null, position: 90,
    content: { schedule: { monday: { open: '09:00', close: '18:00', closed: false }, sunday: { open: '09:00', close: '18:00', closed: true } }, timezone: 'America/Argentina/Buenos_Aires' } }) },
  { label: 'Galería', row: moduleRow({ id: 'm-gallery', type: 'gallery', title: null, position: 100,
    content: { items: [{ url: 'https://cdn.example.com/g1.jpg', type: 'image' }, { url: 'https://cdn.example.com/g2.jpg', type: 'image' }] } }) },
  { label: 'Proyectos', row: moduleRow({ id: 'm-cards', type: 'cards', title: 'Proyectos', position: 110,
    content: { layout: 'stack', items: [{ title: 'Marca Café Luna', subtitle: 'Identidad 2025', url: 'https://ana.design/cafe' }] } }) },
  { label: 'Reseñas', row: moduleRow({ id: 'm-reviews', type: 'testimonials', title: 'Reseñas', position: 120,
    content: { items: [{ author_name: 'Juan', rating: 5, text: 'Excelente trabajo.' }], google: { rating: 4.8, count: 120, url: 'https://g.page/r/ana' } } }) },
  // Fase 5: muestran proyectos publicados (ver PROJECT_FIXTURE)
  { label: 'Proyecto destacado', row: moduleRow({ id: 'm-project', type: 'project', title: null, position: 130,
    content: { project_id: 'pr-luna' } }) },
  { label: 'Trabajos', row: moduleRow({ id: 'm-portfolio', type: 'portfolio', title: 'Trabajos', position: 140,
    content: {} }) },
]

/** Proyecto que muestran los módulos project/portfolio de arriba (hay que publicarlo con publishProjectRow) */
export const PROJECT_FIXTURE = projectRow({ id: 'pr-luna', title: 'Marca Café Luna', slug: 'cafe-luna', summary: 'Identidad 2025' })
