import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, FolderOpen } from 'lucide-react'
import { useDocuments } from '../../hooks/useDocuments'
import { DocumentCard } from './DocumentCard'
import { UploadDocumentDrawer } from './UploadDocumentDrawer'
import { DocumentPreviewModal } from './DocumentPreviewModal'
import type { ServiceDocument } from '../../documents/documentTypes'

interface CustomerDocumentsSectionProps {
  customerId:   string
  restaurantId: string
}

const EASE = [0.4, 0, 0.2, 1] as const

export function CustomerDocumentsSection({ customerId, restaurantId }: CustomerDocumentsSectionProps) {
  const docsHook    = useDocuments(restaurantId)
  const [showUpload, setShowUpload] = useState(false)
  const [preview,    setPreview]    = useState<ServiceDocument | null>(null)

  useEffect(() => {
    docsHook.fetchByCustomer(customerId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, restaurantId])

  const handleUploaded = () => {
    setShowUpload(false)
    docsHook.fetchByCustomer(customerId)
  }

  const active   = docsHook.documents.filter(d => d.status !== 'archived')
  const archived = docsHook.documents.filter(d => d.status === 'archived')

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: EASE }}
      className="rounded-2xl overflow-hidden"
      style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-white">Documentos</h2>
          <AnimatePresence>
            {docsHook.documents.length > 0 && (
              <motion.span
                key="count"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1    }}
                exit={{    opacity: 0, scale: 0.7  }}
                transition={{ duration: 0.18, ease: EASE }}
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(244,112,90,0.12)', color: '#F4705A' }}
              >
                {docsHook.documents.length}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
          style={{ background: '#F4705A', color: '#fff' }}
        >
          <Plus className="w-3.5 h-3.5" />
          Subir
        </motion.button>
      </div>

      {/* Body */}
      <div className="p-4">
        {docsHook.loading ? (
          <div className="flex justify-center py-8">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
              className="w-5 h-5 border-2 rounded-full"
              style={{ borderColor: 'rgba(255,255,255,0.08)', borderTopColor: '#F4705A' }}
            />
          </div>

        ) : docsHook.documents.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center justify-center py-10 text-center"
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
              style={{ background: 'rgba(244,112,90,0.08)' }}
            >
              <FolderOpen className="w-5 h-5" style={{ color: 'rgba(244,112,90,0.5)' }} />
            </div>
            <p className="text-xs font-medium mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Sin documentos
            </p>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setShowUpload(true)}
              className="text-xs font-semibold mt-1"
              style={{ color: '#F4705A' }}
            >
              + Subir documento
            </motion.button>
          </motion.div>

        ) : (
          <div className="space-y-2">
            {active.map((doc, i) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                index={i}
                onOpen={setPreview}
                onArchive={d => docsHook.archive(d, customerId)}
                onDelete={d => docsHook.softDelete(d, customerId)}
              />
            ))}

            {archived.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, delay: active.length * 0.04 }}
              >
                <p
                  className="text-[10px] font-semibold uppercase tracking-wider pt-3 pb-1"
                  style={{ color: 'rgba(255,255,255,0.2)' }}
                >
                  Archivados
                </p>
                <div className="space-y-2">
                  {archived.map((doc, i) => (
                    <DocumentCard
                      key={doc.id}
                      doc={doc}
                      index={active.length + i}
                      onOpen={setPreview}
                      onDelete={d => docsHook.softDelete(d, customerId)}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Upload Drawer */}
      <UploadDocumentDrawer
        open={showUpload}
        restaurantId={restaurantId}
        customerId={customerId}
        onClose={() => setShowUpload(false)}
        onUploaded={handleUploaded}
        onUpload={docsHook.upload}
        uploading={docsHook.uploading}
      />

      {/* Preview Modal */}
      <AnimatePresence>
        {preview && (
          <DocumentPreviewModal
            key={preview.id}
            doc={preview}
            onClose={() => setPreview(null)}
            getSignedUrl={docsHook.getSignedUrl}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
