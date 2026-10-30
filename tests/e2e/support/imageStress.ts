import { createState, moduleRow, profileRow, projectRow, publishProjectRow, type MockState } from './mockSupabase'
import { BROKEN_IMG, img } from './testImages'

// Perfil con todas las fotos posibles en proporciones extremas (muy alta, muy ancha, chiquita, con transparencia y
// una que ya no existe) y textos largos: lo que pasa de verdad cuando la gente sube lo que tiene en el celular.

const LONG = 'Supercalifragilisticoespialidoso-sin-espacios-para-ver-si-algo-se-sale-del-recuadro'

export function imageStressModules() {
  let pos = 0
  const row = (id: string, type: string, title: string | null, content: Record<string, unknown>) =>
    moduleRow({ id, type, title, position: (pos += 10), content })
  return [
    row('m-img-tall', 'image', null, { url: img(600, 2400), caption: 'Una foto muy vertical (1:4) con un epígrafe bastante largo para ver cómo corta', alt: 'Foto vertical' }),
    row('m-img-wide', 'image', null, { url: img(2400, 400), caption: 'Panorámica 6:1', alt: 'Panorámica' }),
    row('m-img-small', 'image', null, { url: img(48, 48), alt: 'Ícono chiquito' }),
    row('m-img-alpha', 'image', null, { url: img(800, 800, true), caption: 'Logo con fondo transparente', alt: 'Logo' }),
    row('m-img-broken', 'image', null, { url: BROKEN_IMG, caption: 'Esta foto ya no existe', alt: 'Foto borrada' }),
    row('m-text-img', 'text', 'Texto con foto vertical', { body: 'La foto de arriba es muy alta.', image_url: img(900, 1600) }),
    row('m-link-card', 'link', 'Link con foto vertical (tarjeta)', { url: 'https://ana.design', style: 'card', image_url: img(800, 1400), subtitle: LONG }),
    row('m-link-card-wide', 'link', 'Link con foto panorámica (tarjeta)', { url: 'https://ana.design/b', style: 'card', image_url: img(2400, 500) }),
    row('m-link-thumb', 'link', LONG, { url: 'https://ana.design/c', image_url: img(300, 900), subtitle: 'Miniatura vertical' }),
    row('m-link-thumb-broken', 'link', 'Link con miniatura rota', { url: 'https://ana.design/d', image_url: BROKEN_IMG, link_type: 'website' }),
    row('m-product', 'product', null, { name: 'Producto con un nombre larguísimo que ocupa varias líneas en el celular', description: LONG, price: 1234567, tag: 'Edición limitada', image_url: img(400, 1200), cta_text: 'Comprar', cta_url: 'https://wa.me/5493415550000' }),
    row('m-product-broken', 'product', null, { name: 'Producto con foto rota', price: 100, image_url: BROKEN_IMG }),
    row('m-gallery', 'gallery', 'Galería mezclada', { items: [
      { url: img(600, 2400), type: 'image' }, { url: img(2400, 400), type: 'image' }, { url: img(48, 48), type: 'image' },
      { url: img(800, 800, true), type: 'image' }, { url: BROKEN_IMG, type: 'image' }, { url: img(1080, 1350), type: 'image' },
      { url: img(1920, 1080), type: 'image' },
    ] }),
    row('m-cards-stack', 'cards', 'Tarjetas apiladas', { layout: 'stack', items: [
      { title: 'Foto vertical', subtitle: LONG, image_url: img(700, 2100), url: 'https://ana.design/1' },
      { title: 'Foto rota', image_url: BROKEN_IMG, url: 'https://ana.design/2' },
      { title: 'Sin foto', subtitle: 'Sólo texto' },
    ] }),
    row('m-cards-carousel', 'cards', 'Tarjetas en carrusel', { layout: 'carousel', items: [
      { title: 'Vertical', image_url: img(600, 1800) }, { title: 'Panorámica', image_url: img(2400, 400) },
      { title: 'Transparente', image_url: img(600, 600, true) }, { title: 'Rota', image_url: BROKEN_IMG },
    ] }),
    row('m-cards-flyers', 'cards', 'Flyers', { layout: 'tickets', items: [
      { title: 'Flyer horizontal (no es 9:16)', image_url: img(1920, 1080), date: '2026-12-31', subtitle: 'Club Central', url: 'https://entradas.example.com' },
      { title: 'Flyer 9:16', image_url: img(1080, 1920), date: '2026-12-01' },
      { title: 'Flyer roto', image_url: BROKEN_IMG },
    ] }),
    row('m-media-cover', 'media', 'Video con portada vertical', { url: 'https://youtu.be/dQw4w9WgXcQ', provider: 'youtube', kind: 'video', cover_url: img(900, 1600) }),
    row('m-media-cover-broken', 'media', 'Música con portada rota', { url: 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC', provider: 'spotify', kind: 'audio', cover_url: BROKEN_IMG }),
    row('m-listen-wide', 'listen_on', 'Escuchá en (portada panorámica)', { artist: 'Ana Pérez', cover_url: img(2400, 600),
      links: [{ platform: 'spotify', url: 'https://open.spotify.com/album/4uLU6hMCjMI75M1A2tKUQC' }] }),
    row('m-listen-broken', 'listen_on', 'Escuchá en (portada rota)', { artist: 'Ana Pérez', cover_url: BROKEN_IMG,
      links: [{ platform: 'spotify', url: 'https://open.spotify.com/album/4uLU6hMCjMI75M1A2tKUQC' }] }),
    row('m-project', 'project', null, { project_id: 'pr-tall' }),
    row('m-portfolio', 'portfolio', 'Trabajos', { project_ids: ['pr-tall', 'pr-broken'] }),
  ]
}

/** Perfil con foto muy vertical, portada panorámica y todos los módulos de arriba */
export function imageStressState(theme: Record<string, unknown> = {}, avatar = img(600, 1800)): MockState {
  const s = createState({ profiles: [profileRow({ avatar_url: avatar, theme: { layout: 'portada', mode: 'universo', accent: 'plasma',
    cover: { type: 'imagen', url: img(2400, 400) }, ...theme }, status_text: 'Grabando el disco nuevo en el estudio', available: true })],
  profile_modules: imageStressModules() })
  for (const p of [projectRow({ id: 'pr-tall', title: 'Proyecto con portada vertical', slug: 'vertical', cover_url: img(600, 2000) }),
    projectRow({ id: 'pr-broken', title: 'Proyecto con portada rota', slug: 'rota', cover_url: BROKEN_IMG })]) {
    s.tables.content_objects.push(p)
    publishProjectRow(s, p)
  }
  return s
}
