import type { HubBlock, BlockType } from '../lib/blocksConfig'
import type { HubC } from '../lib/themeConfig'
import { VideoBlock } from './blocks/VideoBlock'
import { BioBlock } from './blocks/BioBlock'
import { StatsBlock } from './blocks/StatsBlock'
import { ContactFormBlock } from './blocks/ContactFormBlock'

interface HubBlockRendererProps {
  block: HubBlock
  restaurantId: string
  C: HubC
}

/**
 * Renderiza un bloque en el Hub público.
 *
 * BLOQUES LEGACY (hero, links, gallery, etc.): su contenido sigue siendo
 * responsabilidad de HubPublicPage.tsx, que los renderiza como JSX inline.
 * Este renderer devuelve null para ellos — HubPublicPage los mostrará/ocultará
 * según block.is_active (ver isBlockActive() en HubPublicPage).
 *
 * BLOQUES NUEVOS (video, bio, stats, contact_form, ...): renderizados aquí.
 */
export function HubBlockRenderer({ block, restaurantId, C }: HubBlockRendererProps) {
  if (!block.is_active) return null

  switch (block.block_type as BlockType) {
    // Legacy — renderizados inline en HubPublicPage, no aquí
    case 'hero':
    case 'links':
    case 'gallery':
    case 'reviews':
    case 'featured':
    case 'featured_products':
    case 'stories':
      return null

    // Nuevos bloques — Fase 1-B
    case 'video':
      return <VideoBlock config={block.config} C={C} />
    case 'bio':
      return <BioBlock config={block.config} C={C} />
    case 'stats':
      return <StatsBlock config={block.config} C={C} />
    case 'contact_form':
      return <ContactFormBlock config={block.config} restaurantId={restaurantId} C={C} />

    // Pendientes para sub-prompts posteriores
    case 'schedule':
    case 'services':
    case 'map':
    case 'social_links':
      return null

    default:
      return null
  }
}
