import { supabase } from '@/lib/supabase'
import type { StorageProviderName } from '../documents/documentTypes'

export const DOCUMENT_BUCKET = 'service-documents'

export interface StorageUploadResult {
  path:     string
  provider: StorageProviderName
}

// ── Interface — swap provider without touching business logic ─────────────────

export interface IDocumentStorageProvider {
  upload(file: File, path: string): Promise<StorageUploadResult>
  getSignedUrl(path: string, expiresIn?: number): Promise<string>
  remove(path: string): Promise<void>
}

// ── Supabase Storage ──────────────────────────────────────────────────────────

class SupabaseStorageProvider implements IDocumentStorageProvider {
  async upload(file: File, path: string): Promise<StorageUploadResult> {
    const { error } = await supabase.storage
      .from(DOCUMENT_BUCKET)
      .upload(path, file, { upsert: false })
    if (error) throw new Error(error.message)
    return { path, provider: 'supabase' }
  }

  async getSignedUrl(path: string, expiresIn = 3600): Promise<string> {
    const { data, error } = await supabase.storage
      .from(DOCUMENT_BUCKET)
      .createSignedUrl(path, expiresIn)
    if (error) throw new Error(error.message)
    return data.signedUrl
  }

  async remove(path: string): Promise<void> {
    const { error } = await supabase.storage
      .from(DOCUMENT_BUCKET)
      .remove([path])
    if (error) throw new Error(error.message)
  }
}

// ── Factory ───────────────────────────────────────────────────────────────────
// Add cases for 's3' | 'cloudflare_r2' | 'azure' as new providers are ready.

export function createStorageProvider(name: StorageProviderName = 'supabase'): IDocumentStorageProvider {
  switch (name) {
    case 'supabase': return new SupabaseStorageProvider()
    // case 's3':           return new S3StorageProvider()
    // case 'cloudflare_r2': return new R2StorageProvider()
    default:         return new SupabaseStorageProvider()
  }
}

export function buildStoragePath(restaurantId: string, documentId: string, fileName: string): string {
  return `${restaurantId}/${documentId}/${fileName}`
}
