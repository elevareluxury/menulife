// Framer Motion variants for Life OS — imported by all screens.
// All durations 150-280ms; spring for interactive elements.
import type { Variants, Transition } from 'framer-motion'

// BezierDefinition requires readonly tuple — as const is mandatory
const easeOut = [0.16, 1, 0.3, 1] as const

export const transitionFast: Transition   = { duration: 0.15, ease: easeOut }
export const transitionNormal: Transition = { duration: 0.22, ease: easeOut }
export const transitionSlow: Transition   = { duration: 0.35, ease: easeOut }
export const transitionSpring: Transition = { type: 'spring', stiffness: 220, damping: 24, mass: 0.8 }

export const fadeInUp: Variants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: easeOut } },
}

export const fadeIn: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.22, ease: easeOut } },
}

export const scaleIn: Variants = {
  hidden:  { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.2, ease: easeOut } },
}

export const slideRight: Variants = {
  hidden:  { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.22, ease: easeOut } },
}

/** Parent container — children inherit initial/animate and stagger */
export const stagger: Variants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.08 } },
}

/** Used on the score ring SVG fade-in */
export const scoreArc: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6, ease: easeOut, delay: 0.2 } },
}
