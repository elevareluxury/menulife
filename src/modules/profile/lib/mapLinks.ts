// Links de "Cómo llegar" (Ubicación y sucursales)

/** Apps de mapas para "Cómo llegar": la del celular primero (Apple Maps en iPhone/iPad) */
export function mapLinks(full: string, ownMaps: string | null): { key: string; label: string; href: string }[] {
  const q = encodeURIComponent(full)
  const google = ownMaps ?? `https://www.google.com/maps/search/?api=1&query=${q}`
  const links = [{ key: 'google', label: 'Google Maps', href: google }]
  if (full) {
    links.push({ key: 'apple', label: 'Apple Maps', href: `https://maps.apple.com/?q=${q}` })
    links.push({ key: 'waze', label: 'Waze', href: `https://waze.com/ul?q=${q}&navigate=yes` })
  }
  const apple = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent)
  return apple ? [...links.filter(l => l.key === 'apple'), ...links.filter(l => l.key !== 'apple')] : links
}

