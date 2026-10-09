import {
  AlignLeft, Clock, FolderOpen, GalleryHorizontal, Image, Images, LayoutGrid, Link2, List, MapPin, MessageSquareQuote,
  Phone, PlayCircle, ShoppingBag, Sparkles, UserPlus, Users,
} from 'lucide-react'
import type { ModuleType } from '@/modules/profile/lib/profileTypes'
import { moduleSchedule, scheduleState } from '@/modules/profile/lib/moduleSchedule'
import type { StudioModule } from './studioTypes'
import { useStudioT } from '@/i18n/app/studio'
import { useAppLang } from '@/i18n/app/store'
import { langLocale } from '@/i18n/app/languages'

// Lo que comparten las listas de módulos (Módulos y el editor de escritorio).

export const MODULE_ICONS: Record<ModuleType, typeof Link2> = {
  link: Link2, social: Users, contact: Phone, location: MapPin, image: Image, text: AlignLeft,
  featured_action: Sparkles, contact_card: UserPlus, gallery: Images, product: ShoppingBag,
  testimonials: MessageSquareQuote, hours: Clock, cards: GalleryHorizontal, project: FolderOpen, portfolio: LayoutGrid, link_group: List,
  media: PlayCircle,
}

/** Tipos que se editan en Studio (contact_card se maneja desde Compartir) */
export const EDITABLE_MODULES: ModuleType[] = ['link', 'social', 'contact', 'location', 'image', 'text', 'featured_action', 'product', 'hours', 'gallery', 'cards', 'testimonials', 'project', 'portfolio', 'link_group', 'media']

/** "Desde 12 oct 18:00" · "Hasta 20 oct 10:00" · "Terminó" — o null si no está programado */
export function useScheduleBadge() {
  const mt = useStudioT().modules
  const locale = langLocale(useAppLang(st => st.lang))
  const fmt = (d: Date) => d.toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  return (m: StudioModule): string | null => {
    const state = scheduleState(m.config)
    const { from, until } = moduleSchedule(m.config)
    if (state === 'upcoming' && from) return mt.scheduledFrom(fmt(from))
    if (state === 'ended') return mt.scheduleEnded
    if (state === 'live' && until) return mt.scheduledUntil(fmt(until))
    return null
  }
}
