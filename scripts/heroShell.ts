import type { Plugin } from 'vite'
import es from '../src/i18n/app/landing/es'
import en from '../src/i18n/app/landing/en'
import pt from '../src/i18n/app/landing/pt'
import fr from '../src/i18n/app/landing/fr'
import de from '../src/i18n/app/landing/de'
import it from '../src/i18n/app/landing/it'
import zh from '../src/i18n/app/landing/zh'
import ja from '../src/i18n/app/landing/ja'
import ko from '../src/i18n/app/landing/ko'
import hi from '../src/i18n/app/landing/hi'
import ar from '../src/i18n/app/landing/ar'
import ru from '../src/i18n/app/landing/ru'

// Esqueleto del hero de la landing en index.html (V1 · etapa 13, rendimiento): en "/" el título y el texto del hero
// se ven apenas llega el HTML, sin esperar a que cargue la app. Es una capa encima con las mismas clases que el hero
// de React (CinematicHero), que la saca al montarse. Los textos salen de los diccionarios de la landing al compilar
// (nunca quedan desfasados) y el idioma se elige igual que en la app: ?lang, el guardado y el del navegador.

const DICTS = { es, en, pt, fr, de, it, zh, ja, ko, hi, ar, ru }

export function heroShellPlugin(): Plugin {
  const texts = Object.fromEntries(Object.entries(DICTS).map(([l, d]) => [l, [d.hero.line1, d.hero.line2, d.hero.subtitle]]))
  const script = `(function(){
if (location.pathname !== '/') return
var T = ${JSON.stringify(texts)}
var l = new URLSearchParams(location.search).get('lang')
if (!T[l]) { l = null; try { var s = localStorage.getItem('mycen_lang'); if (T[s]) l = s } catch (e) {} }
if (!l) { var ls = navigator.languages || [navigator.language]; for (var i = 0; i < ls.length; i++) { var b = (ls[i] || '').toLowerCase().split('-')[0]; if (T[b]) { l = b; break } } }
var t = T[l || 'es']
var el = function (tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e }
var shell = el('section', 'ch-section boot-hero'); shell.id = 'boot-hero'; shell.setAttribute('aria-hidden', 'true')
if (l === 'ar') shell.dir = 'rtl'
var sky = el('div', 'my-sky ch-sky'); sky.setAttribute('data-mycen-theme', 'universo'); sky.appendChild(el('div', 'ch-sky-fade')); shell.appendChild(sky)
var intro = el('div', 'ch-intro'), h1 = el('h1'); h1.appendChild(el('span', 'ch-line1', t[0])); h1.appendChild(el('span', 'ch-line2', t[1]))
intro.appendChild(h1); intro.appendChild(el('p', 'ch-subtitle', t[2])); shell.appendChild(intro)
document.body.insertBefore(shell, document.getElementById('root'))
setTimeout(function () { shell.remove() }, 12000)
})()`
  return {
    name: 'mycen-hero-shell',
    transformIndexHtml(html, ctx) {
      // En el build, precarga Geist (latin 300 y 700, las del hero) para que el esqueleto ya se pinte con la fuente
      // final: así el hero de React no cambia de tamaño al reemplazarlo
      const fonts = ctx.bundle
        ? Object.keys(ctx.bundle).filter(f => /geist-latin-(300|700)-normal-[\w-]+\.woff2$/.test(f))
        : []
      const preload = fonts.map(f => `<link rel="preload" href="/${f}" as="font" type="font/woff2" crossorigin />`).join('\n    ')
      return html
        .replace('</head>', preload ? `  ${preload}\n  </head>` : '</head>')
        .replace('<div id="root"></div>', `<div id="root"></div>\n    <script>${script}</script>`)
    },
  }
}
