import type { ComponentType } from 'react'
import { AlignLeft, Film, Heading, Image, Images, Minus, Quote, Users } from 'lucide-react'
import type { BlockType } from '@/modules/profile/lib/projectTypes'
import { BLOCK_TYPES } from '@/modules/profile/lib/projectTypes'
import {
  CreditsBlockEditor, DividerBlockEditor, GalleryBlockEditor, HeadingBlockEditor, ImageBlockEditor,
  ParagraphBlockEditor, QuoteBlockEditor, VideoBlockEditor, type BlockEditorProps,
} from '../components/blockEditors'

/**
 * Bloques de un proyecto en Studio: ícono, datos iniciales y editor. `Record<BlockType, …>` obliga a
 * cubrir todos los tipos; cómo se ven en la página está en `profile/components/ProjectBlocks.tsx`.
 */
export interface BlockDef {
  icon: typeof AlignLeft
  initial: () => Record<string, unknown>
  Editor: ComponentType<BlockEditorProps>
}

export const BLOCKS: Record<BlockType, BlockDef> = {
  heading:   { icon: Heading,   initial: () => ({ text: '' }), Editor: HeadingBlockEditor },
  paragraph: { icon: AlignLeft, initial: () => ({ text: '' }), Editor: ParagraphBlockEditor },
  image:     { icon: Image,     initial: () => ({ url: '' }), Editor: ImageBlockEditor },
  gallery:   { icon: Images,    initial: () => ({ items: [] }), Editor: GalleryBlockEditor },
  video:     { icon: Film,      initial: () => ({ url: '' }), Editor: VideoBlockEditor },
  quote:     { icon: Quote,     initial: () => ({ text: '' }), Editor: QuoteBlockEditor },
  divider:   { icon: Minus,     initial: () => ({}), Editor: DividerBlockEditor },
  credits:   { icon: Users,     initial: () => ({ items: [{}] }), Editor: CreditsBlockEditor },
}

export const ADDABLE_BLOCKS: readonly BlockType[] = BLOCK_TYPES
