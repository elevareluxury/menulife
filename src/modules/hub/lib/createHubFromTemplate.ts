import { supabase } from '@/lib/supabase'
import type { HubTemplateId } from './hubTemplates'
import { HUB_TEMPLATES, DEFAULT_BLOCK_CONFIG } from './hubTemplates'
import type { BlockType } from './blocksConfig'
import { BLOCK_DEFINITIONS } from './blocksConfig'

const db = supabase as any

interface CreateHubFromTemplateResult {
  success: boolean
  blocksCreated: number
  templateId: HubTemplateId
  error?: string
}

/**
 * Crea los 15 bloques del Hub según el template elegido.
 *
 * IDEMPOTENTE: si el restaurant ya tiene bloques en hub_blocks,
 * retorna { success: true, blocksCreated: 0 } sin tocar nada.
 *
 * Bloques del template → is_active=true, sort_order del template.
 * Bloques fuera del template → is_active=false, sort_order del BLOCK_DEFINITIONS.
 * Hero siempre activo (alwaysActive=true en su BlockDef).
 */
export async function createHubFromTemplate(
  templateId: HubTemplateId,
  restaurantId: string,
): Promise<CreateHubFromTemplateResult> {
  try {
    const template = HUB_TEMPLATES[templateId]
    if (!template) {
      return { success: false, blocksCreated: 0, templateId, error: `Template ${templateId} no existe` }
    }

    // Idempotencia: si ya tiene bloques, no hacer nada
    const { data: existing, error: checkError } = await db
      .from('hub_blocks')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .limit(1)

    if (checkError) throw checkError
    if (existing && existing.length > 0) {
      return { success: true, blocksCreated: 0, templateId }
    }

    // Construir índices del template
    const activeSet = new Set<BlockType>(template.blocks)
    const templateOrder = new Map<BlockType, number>()
    template.blocks.forEach((type, idx) => templateOrder.set(type, (idx + 1) * 10))

    // Insertar los 15 tipos de bloques
    const allBlockTypes = Object.keys(BLOCK_DEFINITIONS) as BlockType[]
    const rowsToInsert = allBlockTypes.map(blockType => {
      const def = BLOCK_DEFINITIONS[blockType]
      const isInTemplate = activeSet.has(blockType)
      const isActive = def.alwaysActive || isInTemplate

      return {
        restaurant_id: restaurantId,
        block_type: blockType,
        sort_order: isInTemplate
          ? templateOrder.get(blockType)!
          : def.defaultOrder,
        is_active: isActive,
        config: isActive ? (DEFAULT_BLOCK_CONFIG[blockType] ?? {}) : {},
      }
    })

    const { data: inserted, error: insertError } = await db
      .from('hub_blocks')
      .insert(rowsToInsert)
      .select('id')

    if (insertError) throw insertError

    // Actualizar restaurants: hub_category + onboarding_steps
    const { data: rest } = await db
      .from('restaurants')
      .select('onboarding_steps')
      .eq('id', restaurantId)
      .single()

    const currentSteps = (rest?.onboarding_steps as Record<string, any>) ?? {}
    await db
      .from('restaurants')
      .update({
        hub_category: templateId,
        onboarding_steps: {
          ...currentSteps,
          hub_template_applied: true,
          hub_template_id: templateId,
        },
      })
      .eq('id', restaurantId)

    return {
      success: true,
      blocksCreated: inserted?.length ?? 0,
      templateId,
    }
  } catch (err) {
    return {
      success: false,
      blocksCreated: 0,
      templateId,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}
