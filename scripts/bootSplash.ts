import type { Plugin } from 'vite'
import { generateHuella, huellaToSvg } from '../src/lib/huella'
import { ACCENT_COLORS, SECONDARY_COLORS, THEME_BG } from '../src/design/themes'

// Pantalla de carga: la huella de Mycen (semilla "mycen", la del ícono) centrada y girando, sobre el fondo del tema del
// celular (Universo / Amanecer). Va en index.html, así se ve apenas llega el HTML, antes de que cargue la app; la app
// la saca cuando se dibuja la primera pantalla (`src/lib/bootSplash.ts`) y la vuelve a mostrar mientras baja otra
// pantalla. En "/" no se usa: la landing tiene su propio esqueleto del hero (heroShell.ts). Con "reducir movimiento"
// queda quieta. Los colores van como variables para que un solo SVG sirva en los dos temas.

const U = { bg: THEME_BG.universo, a: ACCENT_COLORS.plasma.universo.accent, b: SECONDARY_COLORS.universo }
const A = { bg: THEME_BG.amanecer, a: ACCENT_COLORS.plasma.amanecer.accent, b: SECONDARY_COLORS.amanecer }

function markSvg(): string {
  const svg = huellaToSvg(generateHuella('mycen', 'orbitas'), { colorA: 'var(--bs-a)', colorB: 'var(--bs-b)', size: 200 })
  // Como en el ícono: trazos un poco más firmes para que se lea en chico
  return svg
    .replace(/stroke-width="([\d.]+)"/g, (_, w) => `stroke-width="${(Number(w) * 1.8).toFixed(2)}"`)
    .replace(/stroke-opacity="([\d.]+)"/g, (_, o) => `stroke-opacity="${Math.min(1, Number(o) * 2.2).toFixed(2)}"`)
}

const STYLE = `#boot-splash{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;` +
  `background:${U.bg};--bs-a:${U.a};--bs-b:${U.b};transition:opacity .28s ease}` +
  `@media (prefers-color-scheme: light){#boot-splash{background:${A.bg};--bs-a:${A.a};--bs-b:${A.b}}}` +
  `#boot-splash.is-hidden{opacity:0;pointer-events:none}#boot-splash.is-gone{display:none}` +
  `#boot-splash svg{display:block;width:104px;height:104px}` +
  `@media (prefers-reduced-motion: no-preference){` +
  `#boot-splash .bs-spin{animation:bs-spin 9s linear infinite}` +
  `#boot-splash .bs-breathe{animation:bs-breathe 2.6s ease-in-out infinite}}` +
  `@keyframes bs-spin{to{transform:rotate(360deg)}}` +
  `@keyframes bs-breathe{0%,100%{transform:scale(.94);opacity:.82}50%{transform:scale(1.04);opacity:1}}`

// En "/" se saca enseguida; en el resto, por las dudas, se saca solo a los 12 s
const SCRIPT = `(function(){var s=document.getElementById('boot-splash');if(!s)return;` +
  `if(location.pathname==='/'){s.className='is-gone';return}` +
  `setTimeout(function(){if(!s.className)s.className='is-hidden'},12000)})()`

export function bootSplashPlugin(): Plugin {
  const html = `<style>${STYLE}</style>\n    ` +
    `<div id="boot-splash" aria-hidden="true"><div class="bs-breathe"><div class="bs-spin">${markSvg()}</div></div></div>\n    ` +
    `<script>${SCRIPT}</script>`
  return {
    name: 'mycen-boot-splash',
    transformIndexHtml(source) {
      return source.replace('<div id="root"></div>', `${html}\n    <div id="root"></div>`)
    },
  }
}
