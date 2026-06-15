import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Download, ExternalLink, Loader2 } from 'lucide-react'
import type { ServiceDocument } from '../../documents/documentTypes'
import { MIME_PREVIEWABLE, getFileIcon, formatFileSize } from '../../documents/documentTypes'

interface DocumentPreviewModalProps {
  doc:          ServiceDocument
  onClose:      () => void
  getSignedUrl: (path: string) => Promise<string | null>
}

const EASE = [0.4, 0, 0.2, 1] as const

export function DocumentPreviewModal({ doc, onClose, getSignedUrl }: DocumentPreviewModalProps) {
  const [url,     setUrl]     = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!doc.storage_path) return
    setLoading(true)
    getSignedUrl(doc.storage_path)
      .then(u => setUrl(u))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.id])

  const canPreview = doc.mime_type ? MIME_PREVIEWABLE.has(doc.mime_type) : false
  const isImage    = doc.mime_type?.startsWith('image/') ?? false
  const isPdf      = doc.mime_type === 'application/pdf'

  return (
    <>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{    opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 bg-black/80"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        key="modal"
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{    opacity: 0, scale: 0.95, y: 8  }}
        transition={{ duration: 0.22, ease: EASE }}
        className="fixed z-50 flex flex-col rounded-2xl overflow-hidden"
        style={{
          background: '#13161C',
          border:     '1px solid rgba(255,255,255,0.08)',
          inset:      '1rem',
          // desktop override
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Responsive layout tweak via inline media — Tailwind classes handle desktop */}
        <style>{`
          @media (min-width: 1024px) {
            .doc-modal-inner {
              position: fixed !important;
              top: 50% !important; left: 50% !important;
              transform: translate(-50%, -50%) !important;
              width: 680px !important;
              height: 80vh !important;
              inset: auto !important;
            }
          }
        `}</style>

        {/* Header */}
        <div
          className="flex items-center gap-3 px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          <span className="text-xl flex-shrink-0">{getFileIcon(doc.file_extension)}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{doc.title}</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {doc.file_name}
              {doc.file_size ? ` · ${formatFileSize(doc.file_size)}` : ''}
            </p>
          </div>

          {url && (
            <motion.a
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              href={url}
              download={doc.file_name}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg mr-1 flex-shrink-0"
              style={{ background: 'rgba(59,130,246,0.12)', color: '#3B82F6' }}
            >
              <Download className="w-3.5 h-3.5" />
              Descargar
            </motion.a>
          )}

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            <X className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex items-center justify-center p-4">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{    opacity: 0 }}
              >
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'rgba(255,255,255,0.3)' }} />
              </motion.div>

            ) : !url ? (
              <motion.div
                key="no-url"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{    opacity: 0 }}
                transition={{ duration: 0.2, ease: EASE }}
                className="text-center"
              >
                <span className="text-5xl mb-4 block">{getFileIcon(doc.file_extension)}</span>
                <p className="text-sm font-semibold text-white mb-1">{doc.title}</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>No se pudo cargar el archivo</p>
              </motion.div>

            ) : canPreview && isImage ? (
              <motion.img
                key="image"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1    }}
                exit={{    opacity: 0              }}
                transition={{ duration: 0.22, ease: EASE }}
                src={url}
                alt={doc.title}
                className="max-w-full max-h-full object-contain rounded-xl"
              />

            ) : canPreview && isPdf ? (
              <motion.iframe
                key="pdf"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{    opacity: 0 }}
                transition={{ duration: 0.25 }}
                src={url}
                title={doc.title}
                className="w-full h-full rounded-xl"
                style={{ border: 'none' }}
              />

            ) : (
              <motion.div
                key="download"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{    opacity: 0       }}
                transition={{ duration: 0.2, ease: EASE }}
                className="text-center"
              >
                <span className="text-5xl mb-4 block">{getFileIcon(doc.file_extension)}</span>
                <p className="text-sm font-semibold text-white mb-3">{doc.title}</p>
                <motion.a
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  href={url}
                  download={doc.file_name}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl"
                  style={{ background: '#F4705A', color: '#fff' }}
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir archivo
                </motion.a>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  )
}
