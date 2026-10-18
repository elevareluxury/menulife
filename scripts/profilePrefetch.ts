import { readFileSync } from 'fs'
import path from 'path'
import type { Plugin, Rollup } from 'vite'
import { RESERVED_USERNAMES } from '../src/lib/reservedUsernames'

// Perfil público más rápido (LCP). Lo más compartido de Mycen es `/{username}`; antes, en un celular con 4G lento, los
// datos salían recién cuando habían bajado React, la página y ProfileView (~6 s), y cada pieza (la página, la
// estructura, los módulos con chunk propio, las imágenes) se pedía cuando la anterior ya estaba andando. Desde
// index.html, apenas llega el HTML y en paralelo con el JS de la app:
// - se piden los datos (`get_public_profile`); la página los toma con `takePrefetchedProfile`
//   (src/modules/profile/lib/profilePrefetch.ts) si son del mismo handle; si no hay o falló, hace el pedido de siempre.
//   Sólo sin sesión guardada (con sesión, la RPC distingue al dueño y va con su token: pedido normal);
// - en el build, se precargan el JS y el CSS de ProfilePublicPage y la fuente del nombre (Unbounded 700), y cuando
//   llegan los datos, la estructura, los módulos con chunk propio y las imágenes de la primera pantalla (las mismas
//   que `firstScreenImages`).
// Las rutas de la app tienen el nombre reservado (`RESERVED_USERNAMES`), así que no disparan nada.

const PROFILE_DIR = /[\\/]src[\\/]modules[\\/]profile[\\/]/
const PROFILE_PAGE = /[\\/]pages[\\/]ProfilePublicPage\.tsx$/
const LAYOUT_FILE = /[\\/]layouts[\\/](\w+)\.tsx$/
const MODULE_FILE = /[\\/]components[\\/](\w+Module)\.tsx$/
const TITLE_FONT = /unbounded-latin-700-normal-[\w-]+\.woff2$/

/** [rel, href, as] de un `<link>` */
type Link = [string, string, string]
interface ProfileAssets { page: Link[]; layouts: Record<string, Link[]>; types: Record<string, Link[]> }

/**
 * Tipo de módulo → componente con chunk propio, leído del registro público (`View: MediaModule` cuyo
 * `MediaModule = preloadable(() => import('./MediaModule'))`). Si el registro cambia de forma, no se precarga nada.
 */
function lazyModuleTypes(root: string): Record<string, string> {
  const src = readFileSync(path.join(root, 'src/modules/profile/components/moduleRegistry.ts'), 'utf8')
  const files = Object.fromEntries([...src.matchAll(/const (\w+) = preloadable<\w+>\(\(\) => import\('\.\/(\w+)'\)/g)].map(m => [m[1], m[2]]))
  return Object.fromEntries([...src.matchAll(/^\s+(\w+):\s*\{\s*View: (\w+)/gm)].filter(m => files[m[2]]).map(m => [m[1], files[m[2]]]))
}

function profileAssets(bundle: Rollup.OutputBundle, root: string): ProfileAssets {
  const chunks = Object.values(bundle).filter((c): c is Rollup.OutputChunk => c.type === 'chunk')
  const graph = (file: string, seen: Set<string>) => {
    if (seen.has(file)) return seen
    seen.add(file)
    const chunk = bundle[file]
    if (chunk?.type === 'chunk') chunk.imports.forEach(f => graph(f, seen))
    return seen
  }
  // Lo de la entrada ya lo precarga Vite; lo de la página no se repite en la estructura ni en los módulos
  const known = new Set<string>()
  chunks.filter(c => c.isEntry).forEach(c => graph(c.fileName, known))
  const links = (chunk: Rollup.OutputChunk): Link[] => {
    const js = [...graph(chunk.fileName, new Set())].filter(f => !known.has(f))
    const css = [...new Set(js.flatMap(f => [...((bundle[f] as Rollup.OutputChunk).viteMetadata?.importedCss ?? [])]))]
    return [...js.map((f): Link => ['modulepreload', `/${f}`, '']), ...css.map((f): Link => ['preload', `/${f}`, 'style'])]
  }
  const profileChunk = (re: RegExp) => chunks.filter(c => c.facadeModuleId && PROFILE_DIR.test(c.facadeModuleId) && re.test(c.facadeModuleId))

  const pageChunk = profileChunk(PROFILE_PAGE)[0]
  if (!pageChunk) return { page: [], layouts: {}, types: {} }
  const page = links(pageChunk)
  page.forEach(l => known.add(l[1].slice(1)))
  page.push(...Object.keys(bundle).filter(f => TITLE_FONT.test(f)).map((f): Link => ['preload', `/${f}`, 'font']))

  const layouts = Object.fromEntries(profileChunk(LAYOUT_FILE).map(c => [LAYOUT_FILE.exec(c.facadeModuleId!)![1].toLowerCase(), links(c)]))
  // Un módulo puede quedar en un chunk compartido (sin facade): se busca el chunk que lo contiene
  const byComponent: Record<string, Link[]> = {}
  for (const c of chunks) {
    for (const id of c.moduleIds) {
      const name = PROFILE_DIR.test(id) ? MODULE_FILE.exec(id)?.[1] : undefined
      if (name) byComponent[name] = links(c)
    }
  }
  const types = Object.fromEntries(Object.entries(lazyModuleTypes(root)).filter(([, f]) => byComponent[f]).map(([t, f]) => [t, byComponent[f]]))
  return { page, layouts, types }
}

// Los datos (Supabase, archivos del build, nombres reservados) van aparte, en un bloque JSON que no se ejecuta: así el
// script es siempre el mismo y su hash en la CSP de vercel.json (script-src) no cambia con cada build ni con cada
// entorno (lo verifica scripts/check-csp.mjs al compilar)
const DATA_ID = 'mycen-profile-prefetch'

export const PROFILE_PREFETCH_SCRIPT = `(function(){try{` +
    `var m=location.pathname.match(/^\\/([^/.]+)(?:\\/([^/.]+))?\\/?$/);if(!m)return;` +
    `var D=JSON.parse(document.getElementById('${DATA_ID}').textContent);` +
    `var s=decodeURIComponent(m[1]),sp=m[2]&&decodeURIComponent(m[2]);` +
    `if(D.reserved.indexOf(s.trim().toLowerCase())>=0)return;` +
    `var A=D.assets;` +
    `var add=function(a){var l=document.createElement('link');l.rel=a[0];l.href=a[1];if(a[2])l.as=a[2];` +
    `if(a[2]==='image')l.fetchPriority='high';else l.crossOrigin='';document.head.appendChild(l)};` +
    `A.page.forEach(add);` +
    `var u=D.url,k=D.key;` +
    `if(localStorage.getItem('sb-'+new URL(u).hostname.split('.')[0]+'-auth-token'))return;` +
    `var h=sp?s+'/'+sp:s;` +
    `var d=fetch(u+'/rest/v1/rpc/get_public_profile',{method:'POST',headers:{apikey:k,Authorization:'Bearer '+k,'Content-Type':'application/json'},` +
    `body:JSON.stringify({p_username:h})}).then(function(r){if(!r.ok)throw new Error(String(r.status));return r.text()})` +
    `.then(function(t){return t?JSON.parse(t):null});` +
    // Con los datos: estructura, módulos con chunk propio e imágenes de la primera pantalla
    `d.then(function(p){if(!p||!p.modules)return;var t=p.theme||{},L=A.layouts[t.layout]||A.layouts.clasica,mods=p.modules,seen={};` +
    `(L||[]).forEach(add);mods.forEach(function(x){if(!seen[x.type]){seen[x.type]=1;(A.types[x.type]||[]).forEach(add)}});` +
    `var img=[p.avatar_url,t.layout==='portada'?p.cover_url:null];` +
    `mods.slice(0,3).forEach(function(x){var c=x.content||{};img.push(x.type==='media'?c.cover_url:x.type==='image'?c.url:` +
    `x.type==='cards'&&c.items&&c.items[0]?c.items[0].image_url:null)});` +
    `img.forEach(function(i){if(typeof i==='string'&&/^https:\\/\\//.test(i))add(['preload',i,'image'])})}).catch(function(){});` +
    `window.__mycenProfile={handle:h,data:d}}catch(e){}})()`

function data(url: string, key: string, assets: ProfileAssets): string {
  // "<" escapado: nada del bloque puede cerrar la etiqueta
  return JSON.stringify({ url, key, reserved: [...RESERVED_USERNAMES], assets }).replace(/</g, '\\u003c')
}

export function profilePrefetchPlugin(): Plugin {
  let env: Record<string, string> = {}
  let root = process.cwd()
  return {
    name: 'mycen-profile-prefetch',
    configResolved(config) { env = config.env; root = config.root },
    transformIndexHtml(_html, ctx) {
      const url = env.VITE_SUPABASE_URL, key = env.VITE_SUPABASE_ANON_KEY
      if (!url || !key) return []
      const assets = ctx.bundle ? profileAssets(ctx.bundle, root) : { page: [], layouts: {}, types: {} }
      // Primero los datos y después el script que los lee
      return [
        { tag: 'script', attrs: { type: 'application/json', id: DATA_ID }, children: data(url, key, assets), injectTo: 'head-prepend' },
        { tag: 'script', children: PROFILE_PREFETCH_SCRIPT, injectTo: 'head-prepend' },
      ]
    },
  }
}
