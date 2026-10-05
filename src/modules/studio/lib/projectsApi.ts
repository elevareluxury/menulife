import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { ProjectPatch, ProjectPublishState, StudioBlock, StudioProject } from './studioTypes'

// Proyectos (Identity Fase 5): content_objects (type='project') + content_blocks.
// Studio escribe la versión de trabajo; publish_project() congela lo que ven los visitantes.

const db = supabase as unknown as SupabaseClient

const PROJECT_COLUMNS = 'id, identity_id, title, slug, summary, cover_url, data, translations, status, visibility, published_snapshot, published_at, updated_at'

export async function listProjects(identityId: string): Promise<StudioProject[]> {
  const { data, error } = await db.from('content_objects').select(PROJECT_COLUMNS)
    .eq('identity_id', identityId).eq('type', 'project').order('updated_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as StudioProject[]
}

export async function createProject(identityId: string, title: string, slug: string): Promise<StudioProject> {
  const { data, error } = await db.from('content_objects')
    .insert({ identity_id: identityId, type: 'project', title, slug })
    .select(PROJECT_COLUMNS).single()
  if (error) throw error
  return data as StudioProject
}

export async function updateProject(id: string, patch: ProjectPatch): Promise<StudioProject> {
  const { data, error } = await db.from('content_objects').update(patch).eq('id', id).select(PROJECT_COLUMNS).single()
  if (error) throw error
  return data as StudioProject
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await db.from('content_objects').delete().eq('id', id)
  if (error) throw error
}

export async function loadBlocks(projectId: string): Promise<StudioBlock[]> {
  const { data, error } = await db.from('content_blocks').select('id, type, data')
    .eq('content_object_id', projectId).order('position', { ascending: true })
  if (error) throw error
  return (data ?? []) as StudioBlock[]
}

/** Deja en la base exactamente estos bloques, en este orden. */
export async function saveBlocks(projectId: string, blocks: StudioBlock[], previousIds: string[]): Promise<void> {
  if (blocks.length) {
    const { error } = await db.from('content_blocks').upsert(
      blocks.map((b, i) => ({ id: b.id, content_object_id: projectId, type: b.type, data: b.data, position: (i + 1) * 10 })),
      { onConflict: 'id' })
    if (error) throw error
  }
  const keep = new Set(blocks.map(b => b.id))
  const removed = previousIds.filter(id => !keep.has(id))
  if (removed.length) {
    const { error } = await db.from('content_blocks').delete().in('id', removed)
    if (error) throw error
  }
}

export async function publishProject(id: string): Promise<{ status: string; published_at: string }> {
  const { data, error } = await db.rpc('publish_project', { p_id: id })
  if (error) throw error
  return data as { status: string; published_at: string }
}

export async function loadProjectState(id: string): Promise<ProjectPublishState> {
  const { data, error } = await db.rpc('project_publish_state', { p_id: id })
  if (error) throw error
  return data as ProjectPublishState
}

export async function loadProject(id: string): Promise<StudioProject | null> {
  const { data, error } = await db.from('content_objects').select(PROJECT_COLUMNS).eq('id', id).maybeSingle()
  if (error) throw error
  return (data as StudioProject | null) ?? null
}
