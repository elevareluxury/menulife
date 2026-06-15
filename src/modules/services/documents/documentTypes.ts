export type DocumentStatus     = 'active' | 'archived' | 'deleted' | 'pending'
export type DocumentSource     = 'manual' | 'form' | 'quote' | 'portal' | 'system' | 'future'
export type DocumentVisibility = 'private' | 'staff' | 'customer' | 'public'
export type StorageProviderName = 'supabase' | 's3' | 'cloudflare_r2' | 'future'
export type DocumentEntityType = 'customer' | 'booking' | 'membership' | 'package' | 'quote' | 'form_submission' | 'future'

export interface DocumentCategory {
  id:            string
  restaurant_id: string
  name:          string
  color:         string
  icon:          string
  sort_order:    number
  created_at:    string
  updated_at:    string
}

export interface ServiceDocument {
  id:                  string
  restaurant_id:       string
  title:               string
  description:         string | null
  file_name:           string
  file_extension:      string | null
  file_size:           number | null
  mime_type:           string | null
  storage_path:        string | null
  storage_provider:    StorageProviderName
  category_id:         string | null
  category?:           DocumentCategory | null
  uploaded_by:         string | null
  status:              DocumentStatus
  document_source:     DocumentSource
  document_visibility: DocumentVisibility
  version_number:      number
  parent_document_id:  string | null
  expiration_date:     string | null
  metadata:            Record<string, unknown>
  deleted_at:          string | null
  deleted_by:          string | null
  created_at:          string
  updated_at:          string
}

export interface DocumentLink {
  id:            string
  restaurant_id: string
  document_id:   string
  document?:     ServiceDocument
  entity_type:   DocumentEntityType
  entity_id:     string
  created_at:    string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const EXT_ICONS: Record<string, string> = {
  pdf: '📄', jpg: '🖼️', jpeg: '🖼️', png: '🖼️', webp: '🖼️',
  docx: '📝', xlsx: '📊', csv: '📊', txt: '📃', zip: '🗜️',
}

export const MIME_PREVIEWABLE = new Set([
  'application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain',
])

export function formatFileSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1_048_576)   return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1_048_576).toFixed(1)} MB`
}

export function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() ?? ''
}

export function getFileIcon(ext: string | null | undefined): string {
  return EXT_ICONS[ext ?? ''] ?? '📁'
}

export const DEFAULT_CATEGORY_SEEDS = [
  { name: 'Contrato',       color: '#3B82F6', icon: 'FileText',   sort_order: 0 },
  { name: 'Consentimiento', color: '#22C55E', icon: 'FileCheck',  sort_order: 1 },
  { name: 'Ficha',          color: '#F59E0B', icon: 'ClipboardList', sort_order: 2 },
  { name: 'Presupuesto',    color: '#8B5CF6', icon: 'Calculator', sort_order: 3 },
  { name: 'Otro',           color: '#6B7280', icon: 'File',       sort_order: 4 },
] as const
