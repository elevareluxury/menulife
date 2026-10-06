import {
  BarChart3, BookOpen, Briefcase, Clock, Dumbbell, FileText, Image, Link2, Mail, MapPin,
  MessageSquare, Package, Palette, Share2, ShoppingBag, Sparkles, Square, Star, Target,
  User, UtensilsCrossed, Video,
  type LucideIcon,
} from 'lucide-react'

/**
 * Íconos usados por blocksConfig y hubTemplates (por nombre).
 * Import explícito a propósito: `import * as Icons from 'lucide-react'` mete
 * los ~1.500 íconos (150 KB gzip) en el bundle de todas las páginas públicas.
 * Si agregás un ícono nuevo en blocksConfig/hubTemplates, sumalo acá.
 */
const ICONS: Record<string, LucideIcon> = {
  BarChart3, BookOpen, Briefcase, Clock, Dumbbell, FileText, Image, Link2, Mail, MapPin,
  MessageSquare, Package, Palette, Share2, ShoppingBag, Sparkles, Square, Star, Target,
  User, UtensilsCrossed, Video,
}

export function getIcon(name: string | undefined, fallback: LucideIcon = Square): LucideIcon {
  return (name && ICONS[name]) || fallback
}
