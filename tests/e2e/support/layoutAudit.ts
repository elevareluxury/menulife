import type { Locator, Page } from '@playwright/test'

// Auditoría de diseño en el celular: nada se sale de la pantalla ni de su recuadro, los controles no se pisan y los
// textos de botones no quedan cortados. Devuelve una lista legible de problemas (vacía = todo bien).

export async function layoutProblems(page: Page, scope?: Locator): Promise<string[]> {
  const handle = scope ? await scope.elementHandle() : null
  return page.evaluate((root) => {
    const problems: string[] = []
    const vw = window.innerWidth
    const base = (root as Element | null) ?? document.body

    const name = (el: Element) => {
      const label = el.getAttribute('aria-label') ?? (el as HTMLElement).innerText?.trim().split('\n')[0]?.slice(0, 30)
      const cls = typeof el.className === 'string' ? el.className.split(' ').filter(Boolean).slice(0, 2).join('.') : ''
      return `${el.tagName.toLowerCase()}${cls ? '.' + cls : ''}${label ? ` "${label}"` : ''}`
    }
    const shown = (el: Element) => {
      const s = getComputedStyle(el)
      if (s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) === 0) return false
      // Lo decorativo (huellas, estrellas, brillos) puede salirse a propósito
      if (el.closest('[aria-hidden="true"], [inert]')) return false
      // El contenido de un <details> cerrado no se ve (pero conserva medidas viejas)
      const det = el.closest('details:not([open])')
      if (det && !el.closest('summary')) return false
      const r = el.getBoundingClientRect()
      return r.width > 2 && r.height > 2
    }
    // Dentro de un carrusel (algo que de verdad se desplaza de costado y no es el marco de la página) se puede salir
    const inScroller = (el: Element) => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const o = getComputedStyle(p).overflowX
        if ((o === 'auto' || o === 'scroll') && !p.hasAttribute('data-scroll-root') && p.scrollWidth > p.clientWidth + 1) return true
      }
      return false
    }
    // Lo que se ve de verdad: el rectángulo recortado por los antepasados que recortan
    const visibleRect = (el: Element) => {
      const b = el.getBoundingClientRect()
      let l = b.left, r = b.right, t = b.top, bo = b.bottom
      for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
        const s = getComputedStyle(p)
        if (s.overflowX !== 'visible' && !p.hasAttribute('data-scroll-root')) { const pr = p.getBoundingClientRect(); l = Math.max(l, pr.left); r = Math.min(r, pr.right) }
        if (s.overflowY !== 'visible' && !p.hasAttribute('data-scroll-root')) { const pr = p.getBoundingClientRect(); t = Math.max(t, pr.top); bo = Math.min(bo, pr.bottom) }
      }
      return { left: l, right: r, top: t, bottom: bo, width: r - l, height: bo - t }
    }
    const paintsBox = (el: Element) => {
      const s = getComputedStyle(el)
      const bg = s.backgroundColor !== 'rgba(0, 0, 0, 0)' && s.backgroundColor !== 'transparent'
      const border = (['Top', 'Right', 'Bottom', 'Left'] as const).some(k =>
        parseFloat(s.getPropertyValue(`border-${k.toLowerCase()}-width`)) > 0 && s.getPropertyValue(`border-${k.toLowerCase()}-style`) !== 'none')
      return bg || border || s.backgroundImage !== 'none'
    }

    // El marco de la página (Life OS y Studio scrollean su marco) nunca se desplaza de costado
    for (const sr of [...document.querySelectorAll('[data-scroll-root]'), document.documentElement]) {
      const extra = sr.scrollWidth - sr.clientWidth
      if (extra > 2) problems.push(`la pantalla se desplaza ${extra} px de costado (${sr.tagName.toLowerCase()})`)
    }

    const all = [...base.querySelectorAll('*')].filter(el => !(el.closest('svg') && el.tagName !== 'svg') && shown(el))

    for (const el of all) {
      if (inScroller(el)) continue
      const s = getComputedStyle(el)
      const b = visibleRect(el)
      if (b.width <= 0 || b.height <= 0) continue
      // 1) Fuera de la pantalla, de costado (aunque algo lo recorte: entonces queda cortado)
      const real = el.getBoundingClientRect()
      // Un brillo o fondo sin texto ni controles que algo recorta (o que no recibe toques) es decoración
      const decor = !(el as HTMLElement).innerText?.trim() && !el.querySelector('button, a, input, select, textarea, img')
        && (s.pointerEvents === 'none' || (b.right <= vw + 1 && b.left >= -1))
      if (!decor && (real.right > vw + 1 || real.left < -1)) {
        problems.push(`se sale de la pantalla (${Math.round(real.left)}…${Math.round(real.right)} de ${vw}): ${name(el)}`)
        continue
      }
      // 1b) Un control o un texto recortado por su contenedor
      const hasText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent!.trim())
      if ((hasText || el.matches('button, a[href], input, select, textarea')) && s.textOverflow !== 'ellipsis'
        && (real.right > b.right + 2 || real.left < b.left - 2)) {
        problems.push(`queda cortado de costado (${Math.round(real.width - b.width)} px): ${name(el)}`)
        continue
      }
      // 2) Fuera de su recuadro (el primer antepasado que dibuja un recuadro)
      if (s.position === 'absolute' || s.position === 'fixed') continue
      for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
        if (!paintsBox(p)) continue
        const ps = getComputedStyle(p)
        if (ps.overflowX !== 'visible' || ps.overflowY !== 'visible') break
        const r = p.getBoundingClientRect()
        if (b.right > r.right + 1.5 || b.left < r.left - 1.5) problems.push(`se sale de su recuadro de costado (${Math.round(Math.max(b.right - r.right, r.left - b.left))} px): ${name(el)} en ${name(p)}`)
        else if (b.bottom > r.bottom + 1.5 && r.height > 8) problems.push(`se sale de su recuadro por abajo (${Math.round(b.bottom - r.bottom)} px): ${name(el)} en ${name(p)}`)
        break
      }
    }

    // 3) Controles que se pisan (una barra fija que tapa el contenido al scrollear es a propósito)
    const controls = all.filter(el => el.matches('button, a[href], input:not([type=hidden]), select, textarea, [role=button], [role=switch], [role=tab]'))
      .filter(el => !inScroller(el) && visibleRect(el).width > 0 && visibleRect(el).height > 0)
    const layer = (el: Element) => {
      for (let p: Element | null = el; p; p = p.parentElement) { const ps = getComputedStyle(p).position; if (ps === 'fixed' || ps === 'sticky') return p }
      return null
    }
    // Un link dentro de un texto puede partirse en dos líneas: se miran sus pedazos
    const rects = (e: Element) => getComputedStyle(e).display === 'inline' ? [...e.getClientRects()] : [visibleRect(e)]
    for (let i = 0; i < controls.length; i++) {
      for (let j = i + 1; j < controls.length; j++) {
        const a = controls[i], c = controls[j]
        if (a.contains(c) || c.contains(a) || layer(a) !== layer(c)) continue
        let hit: [number, number] | null = null
        for (const ra of rects(a)) for (const rc of rects(c)) {
          const w = Math.min(ra.right, rc.right) - Math.max(ra.left, rc.left)
          const h = Math.min(ra.bottom, rc.bottom) - Math.max(ra.top, rc.top)
          if (w > 2 && h > 2) hit = [w, h]
        }
        if (hit) problems.push(`se pisan (${Math.round(hit[0])}×${Math.round(hit[1])} px): ${name(a)} y ${name(c)}`)
      }
    }

    // 4) Texto de botones cortado (sin "…" a propósito): se mide el texto, no la decoración
    for (const el of controls) {
      if (!el.matches('button, a[href], [role=button]')) continue
      const box = visibleRect(el)
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const host = n.parentElement!
        const hs = getComputedStyle(host)
        // Texto sólo para lectores de pantalla (sr-only) o con "…" a propósito
        if (!n.textContent!.trim() || host.closest('[aria-hidden="true"]') || hs.textOverflow === 'ellipsis'
          || hs.clip !== 'auto' || hs.clipPath !== 'none' || host.getBoundingClientRect().width <= 1) continue
        const range = document.createRange(); range.selectNodeContents(n)
        const r = range.getBoundingClientRect()
        if (r.width > 0 && (r.right > box.right + 2 || r.left < box.left - 2)) { problems.push(`texto cortado: ${name(el)}`); break }
      }
    }
    return [...new Set(problems)]
  }, handle)
}
