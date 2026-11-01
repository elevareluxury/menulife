import { generateHuella, huellaToSvg } from './huella/huella.ts'

/**
 * La huella de la marca (semilla "mycen", la del ícono de la app) como SVG, con trazos más firmes para que se lea en
 * chico: la usan la pantalla de carga (scripts/bootSplash.ts) y las pantallas de acceso. Sin DOM: también corre al
 * compilar.
 */
export function brandMarkSvg(colorA: string, colorB: string, idSuffix = '', size = 200): string {
  const svg = huellaToSvg(generateHuella('mycen', 'orbitas'), { colorA, colorB, size })
  // Un sufijo distinto por lugar: si dos copias comparten el id del degradé y la primera está oculta, la otra se ve vacía
  const id = /id="([^"]+)"/.exec(svg)?.[1]
  return (id && idSuffix ? svg.split(id).join(id + idSuffix) : svg)
    .replace(/stroke-width="([\d.]+)"/g, (_, w) => `stroke-width="${(Number(w) * 1.8).toFixed(2)}"`)
    .replace(/stroke-opacity="([\d.]+)"/g, (_, o) => `stroke-opacity="${Math.min(1, Number(o) * 2.2).toFixed(2)}"`)
}
