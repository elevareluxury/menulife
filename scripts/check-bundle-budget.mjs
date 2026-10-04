// Presupuesto de peso (Lanzamiento L1): después de `npm run build`, calcula cuánto JS y CSS (gzip) descarga
// cada página pública al abrirse y falla si se pasa del límite. Así la página que más se abre no vuelve a engordar.
//   node scripts/check-bundle-budget.mjs
import { readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { join } from 'node:path'

const DIST = 'dist'
const manifest = JSON.parse(readFileSync(join(DIST, '.vite', 'manifest.json'), 'utf8'))

/** Páginas y su límite en KB (gzip): la entrada de la app + el bloque de la ruta, con lo que importan de forma estática */
const BUDGETS = [
  { name: 'Perfil público (/:username)', route: 'src/modules/profile/pages/ProfilePublicPage.tsx', maxKb: 240 },
  { name: 'Proyecto (/:username/projects/:slug)', route: 'src/modules/profile/pages/ProjectPublicPage.tsx', maxKb: 240 },
  { name: 'Landing (/)', route: 'src/modules/landing/pages/LandingPage.tsx', maxKb: 310 },
]

const sizes = new Map()
const gz = file => {
  if (!sizes.has(file)) sizes.set(file, gzipSync(readFileSync(join(DIST, file))).length)
  return sizes.get(file)
}

/** Archivos que el navegador necesita para un chunk: él, sus imports estáticos (recursivos) y su CSS */
function closure(key, files = new Set()) {
  const chunk = manifest[key]
  if (!chunk) throw new Error(`No está en el manifest: ${key}`)
  if (files.has(chunk.file)) return files
  files.add(chunk.file)
  for (const css of chunk.css ?? []) files.add(css)
  for (const dep of chunk.imports ?? []) closure(dep, files)
  return files
}

let failed = false
for (const b of BUDGETS) {
  const files = closure(b.route, closure('index.html'))
  const kb = [...files].reduce((sum, f) => sum + gz(f), 0) / 1024
  const ok = kb <= b.maxKb
  if (!ok) failed = true
  console.log(`${ok ? '✓' : '✗'} ${b.name}: ${kb.toFixed(0)} KB gzip (límite ${b.maxKb} KB)`)
  if (!ok) {
    for (const f of [...files].sort((a, z) => gz(z) - gz(a)).slice(0, 6)) console.log(`    ${(gz(f) / 1024).toFixed(0)} KB  ${f}`)
  }
}
process.exit(failed ? 1 : 0)
