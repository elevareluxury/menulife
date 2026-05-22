import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { X, Image as ImageIcon } from 'lucide-react'
import { Button } from './Button'
import { cn } from '@/lib/utils'
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_SIZE } from '@/lib/constants'

interface ImageUploadProps {
  value?: string
  onChange: (file: File) => void
  onRemove: () => void
  disabled?: boolean
}

export function ImageUpload({ value, onChange, onRemove, disabled }: ImageUploadProps) {
  const onDrop = useCallback((files: File[]) => {
    if (files[0]) onChange(files[0])
  }, [onChange])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_IMAGE_TYPES,
    maxSize: MAX_IMAGE_SIZE,
    multiple: false,
    disabled,
  })

  if (value) {
    return (
      <div className="relative group">
        <img src={value} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
          <Button variant="danger" size="sm" onClick={onRemove} disabled={disabled}>
            <X className="w-4 h-4 mr-2" />
            Eliminar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
        isDragActive ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 hover:border-emerald-400',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <input {...getInputProps()} />
      <ImageIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
      <p className="text-sm text-gray-600 mb-1">
        {isDragActive ? 'Suelta la imagen aquí' : 'Arrastrá una imagen o hacé clic'}
      </p>
      <p className="text-xs text-gray-500">JPG, PNG o WebP (máx. 5MB)</p>
    </div>
  )
}
