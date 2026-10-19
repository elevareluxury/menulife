// La CSP de producción (vercel.json → Content-Security-Policy) cubre lo que trae el build. Corre al final de
// `npm run build` (también en Vercel, así una CSP desfasada frena el deploy en vez de romper la página): cada <script>
// en línea de dist/*.html tiene que tener su 'sha256-…' en script-src, cada <script src> tiene que ser propio o de un
// origen permitido, no puede haber hashes de más ni atributos on*= y script-src nunca lleva 'unsafe-inline'/'unsafe-eval'.
// `vite preview` manda la misma CSP (vite.config.ts), así el humo de producción (npm run test:e2e:prod) la aplica.
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'

const problems = []
const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'))
const csp = vercel.headers?.find(r => r.source === '/(.*)')?.headers
  ?.find(h => h.key.toLowerCase() === 'content-security-policy')?.value
if (!csp) {
  console.error('vercel.json: falta Content-Security-Policy en la regla "/(.*)"')
  process.exit(1)
}

const directives = new Map(csp.split(';').map(d => d.trim()).filter(Boolean).map(d => {
  const [name, ...tokens] = d.split(/\s+/)
  return [name.toLowerCase(), tokens]
}))
const has = (name, token) => (directives.get(name) ?? []).includes(token)

for (const name of ['default-src', 'script-src', 'connect-src', 'object-src', 'base-uri', 'frame-ancestors', 'form-action']) {
  if (!directives.has(name)) problems.push(`falta la directiva ${name}`)
}
const scriptSrc = directives.get('script-src') ?? []
for (const bad of ["'unsafe-inline'", "'unsafe-eval'", '*', 'https:', 'http:', 'data:', 'blob:']) {
  if (scriptSrc.includes(bad)) problems.push(`script-src no puede llevar ${bad}`)
}
if (!has('object-src', "'none'")) problems.push("object-src tiene que ser 'none'")
// Supabase: la API (https) y Realtime (wss)
for (const origin of ['https://*.supabase.co', 'wss://*.supabase.co']) {
  if (!has('connect-src', origin)) problems.push(`connect-src tiene que permitir ${origin}`)
}

const allowedScriptOrigins = scriptSrc.filter(t => /^https:\/\//.test(t))
const needed = new Set()
const htmlFiles = readdirSync('dist').filter(f => f.endsWith('.html'))
if (!htmlFiles.includes('index.html')) problems.push('no está dist/index.html: correr después de vite build')

for (const file of htmlFiles) {
  const html = readFileSync(`dist/${file}`, 'utf8')
  for (const [, attrs, body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const src = /\bsrc\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1]
    if (src) {
      const external = /^(https?:)?\/\//i.test(src)
      if (external && !allowedScriptOrigins.some(o => src === o || src.startsWith(o.replace(/\/?$/, '/')))) {
        problems.push(`${file}: <script src="${src}"> no está permitido por script-src`)
      }
      continue
    }
    const type = /\btype\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1]?.toLowerCase()
    // Bloques de datos: el navegador no los ejecuta y la CSP no se aplica
    if (type === 'application/json' || type === 'application/ld+json') continue
    needed.add(`'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`)
  }
  // Manejadores en línea (onload="…") no se pueden permitir con hashes sin 'unsafe-hashes'
  const handler = /<[a-z][^>]*\son[a-z]+\s*=/i.exec(html)
  if (handler) problems.push(`${file}: atributo on…= en línea (${handler[0].slice(0, 60)}…)`)
}

const listed = scriptSrc.filter(t => t.startsWith("'sha256-"))
for (const h of needed) if (!listed.includes(h)) problems.push(`script-src no tiene el hash de un script en línea: ${h}`)
for (const h of listed) if (!needed.has(h)) problems.push(`script-src tiene un hash que ya no usa ningún script: ${h}`)

if (problems.length) {
  console.error('CSP de vercel.json desfasada con el build:\n' + problems.map(p => `  - ${p}`).join('\n'))
  const rest = scriptSrc.filter(t => !t.startsWith("'sha256-"))
  console.error(`\nscript-src que corresponde a este build:\n  script-src ${[...rest, ...needed].join(' ')}`)
  process.exit(1)
}
console.log(`CSP ok: ${needed.size} script(s) en línea con hash, ${htmlFiles.length} HTML revisado(s)`)
