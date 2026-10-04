// Librerías de animación de la landing (Lanzamiento L1). Antes se cargaban desde un CDN en index.html, en TODAS
// las páginas (también en los perfiles públicos); ahora viajan sólo en el bloque de la landing.
// Las secciones las usan como globales (`declare const gsap`), así que se exponen en window al importar este archivo.
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Splitting from 'splitting'
import 'splitting/dist/splitting.css'

gsap.registerPlugin(ScrollTrigger)
Object.assign(window as unknown as Record<string, unknown>, { gsap, ScrollTrigger, Splitting })
