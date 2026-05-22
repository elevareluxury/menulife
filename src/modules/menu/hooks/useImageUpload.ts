import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export function useImageUpload() {
  const [uploading, setUploading] = useState(false)

  const uploadImage = async (file: File, bucket: string) => {
    try {
      setUploading(true)
      const fileExt = file.name.split('.').pop()
      const fileName = `${crypto.randomUUID()}.${fileExt}`

      const { error } = await supabase.storage.from(bucket).upload(fileName, file)
      if (error) throw error

      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName)
      return { success: true as const, url: publicUrl }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al subir imagen'
      toast.error(message)
      return { success: false as const, error: message }
    } finally {
      setUploading(false)
    }
  }

  return { uploadImage, uploading }
}
