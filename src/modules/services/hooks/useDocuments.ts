import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { ServiceDocument, DocumentStatus } from '../documents/documentTypes'
import {
  createStorageProvider,
  buildStoragePath,
} from '../storage/DocumentStorageProvider'
import { TimelineService } from '../timeline/TimelineService'
import toast from 'react-hot-toast'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

const SELECT = '*, category:service_document_categories(id, name, color, icon)'

export interface UploadDocumentInput {
  file:           File
  title:          string
  description?:   string
  categoryId?:    string | null
  customerId?:    string | null
  expirationDate?: string | null
}

export function useDocuments(restaurantId: string | undefined) {
  const [documents, setDocuments] = useState<ServiceDocument[]>([])
  const [loading,   setLoading]   = useState(false)
  const [uploading, setUploading] = useState(false)

  const fetchByCustomer = useCallback(async (customerId: string) => {
    if (!restaurantId) return
    setLoading(true)
    try {
      // Get document IDs linked to this customer
      const { data: links, error: linkErr } = await db
        .from('service_document_links')
        .select('document_id')
        .eq('restaurant_id', restaurantId)
        .eq('entity_type', 'customer')
        .eq('entity_id', customerId)
      if (linkErr) throw linkErr
      if (!links || links.length === 0) { setDocuments([]); return }

      const ids = links.map((l: { document_id: string }) => l.document_id)
      const { data, error } = await db
        .from('service_documents')
        .select(SELECT)
        .in('id', ids)
        .not('status', 'eq', 'deleted')
        .order('created_at', { ascending: false })
      if (error) throw error
      setDocuments(data ?? [])
    } finally {
      setLoading(false)
    }
  }, [restaurantId])

  const fetchByRestaurant = useCallback(async () => {
    if (!restaurantId) return
    setLoading(true)
    try {
      const { data, error } = await db
        .from('service_documents')
        .select(SELECT)
        .eq('restaurant_id', restaurantId)
        .not('status', 'eq', 'deleted')
        .order('created_at', { ascending: false })
      if (error) throw error
      setDocuments(data ?? [])
    } finally {
      setLoading(false)
    }
  }, [restaurantId])

  const upload = useCallback(async (input: UploadDocumentInput): Promise<ServiceDocument | null> => {
    if (!restaurantId) return null
    setUploading(true)
    const ext      = input.file.name.split('.').pop()?.toLowerCase() ?? ''
    const docId    = crypto.randomUUID()
    const path     = buildStoragePath(restaurantId, docId, input.file.name)
    const provider = createStorageProvider('supabase')
    let storedInBucket = false

    try {
      await provider.upload(input.file, path)
      storedInBucket = true

      const { data: doc, error: docErr } = await db
        .from('service_documents')
        .insert({
          id:                  docId,
          restaurant_id:       restaurantId,
          title:               input.title,
          description:         input.description ?? null,
          file_name:           input.file.name,
          file_extension:      ext,
          file_size:           input.file.size,
          mime_type:           input.file.type || null,
          storage_path:        path,
          storage_provider:    'supabase',
          category_id:         input.categoryId ?? null,
          expiration_date:     input.expirationDate ?? null,
          document_source:     'manual',
          document_visibility: 'staff',
          version_number:      1,
        })
        .select(SELECT)
        .single()
      if (docErr) throw docErr

      if (input.customerId) {
        await db.from('service_document_links').insert({
          restaurant_id: restaurantId,
          document_id:   docId,
          entity_type:   'customer',
          entity_id:     input.customerId,
        })
        TimelineService.track({
          restaurantId,
          customerId:  input.customerId,
          eventType:   'document_uploaded',
          title:       'Documento agregado',
          description: input.title,
          metadata:    { document_id: docId, file_name: input.file.name, category_id: input.categoryId ?? null },
        })
      }

      setDocuments(prev => [doc, ...prev])
      toast.success('Documento subido correctamente')
      return doc
    } catch (err) {
      // Si el archivo ya llegó a Storage pero el insert falló, limpiarlo para evitar huérfanos
      if (storedInBucket) {
        provider.remove(path).catch((rollbackErr: unknown) => {
          console.warn('[useDocuments] rollback Storage failed for orphan file:', path, rollbackErr)
        })
      }
      const msg = err instanceof Error ? err.message : 'Error al subir el documento'
      toast.error(msg)
      return null
    } finally {
      setUploading(false)
    }
  }, [restaurantId])

  const archive = useCallback(async (doc: ServiceDocument, customerId?: string) => {
    if (!restaurantId) return
    try {
      const { error } = await db
        .from('service_documents')
        .update({ status: 'archived' as DocumentStatus })
        .eq('id', doc.id)
      if (error) throw error
      setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, status: 'archived' as DocumentStatus } : d))
      if (customerId) {
        TimelineService.track({
          restaurantId,
          customerId,
          eventType:   'document_archived',
          title:       'Documento archivado',
          description: doc.title,
          metadata:    { document_id: doc.id },
        })
      }
      toast.success('Documento archivado')
    } catch {
      toast.error('Error al archivar el documento')
    }
  }, [restaurantId])

  // Soft delete — nunca borra el archivo físico
  const softDelete = useCallback(async (doc: ServiceDocument, customerId?: string) => {
    if (!restaurantId) return
    try {
      const { error } = await db
        .from('service_documents')
        .update({ status: 'deleted' as DocumentStatus, deleted_at: new Date().toISOString() })
        .eq('id', doc.id)
      if (error) throw error
      setDocuments(prev => prev.filter(d => d.id !== doc.id))
      if (customerId) {
        TimelineService.track({
          restaurantId,
          customerId,
          eventType:   'document_deleted',
          title:       'Documento eliminado',
          description: doc.title,
          metadata:    { document_id: doc.id },
        })
      }
      toast.success('Documento eliminado')
    } catch {
      toast.error('Error al eliminar el documento')
    }
  }, [restaurantId])

  const getSignedUrl = useCallback(async (storagePath: string): Promise<string | null> => {
    try {
      const provider = createStorageProvider('supabase')
      return await provider.getSignedUrl(storagePath, 3600)
    } catch {
      toast.error('No se pudo obtener el enlace del documento')
      return null
    }
  }, [])

  return {
    documents, loading, uploading,
    fetchByCustomer, fetchByRestaurant,
    upload, archive, softDelete, getSignedUrl,
  }
}
