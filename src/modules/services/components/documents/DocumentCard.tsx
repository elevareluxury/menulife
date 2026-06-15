import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Archive, Trash2, MoreHorizontal, ExternalLink, AlertCircle } from 'lucide-react'
import type { ServiceDocument } from '../../documents/documentTypes'
import { getFileIcon, formatFileSize } from '../../documents/documentTypes'

interface DocumentCardProps {
  doc:        ServiceDocument
  index?:     number
  onOpen:     (doc: ServiceDocument) => void
  onArchive?: (doc: ServiceDocument) => void
  onDelete?:  (doc: ServiceDocument) => void
}

const EASE = [0.4, 0, 0.2, 1] as const

export function DocumentCard({ doc, index = 0, onOpen, onArchive, onDelete }: DocumentCardProps) {
  const [showActions, setShowActions] = useState(false)

  const isExpired = doc.expiration_date
    ? new Date(doc.expiration_date) < new Date()
    : false

  const isExpiringSoon = !isExpired && doc.expiration_date
    ? (new Date(doc.expiration_date).getTime() - Date.now()) < 7 * 24 * 60 * 60 * 1000
    : false

  const expirationLabel = doc.expiration_date
    ? new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
        .format(new Date(doc.expiration_date))
    : null

  const expirationColor = isExpired ? '#EF4444' : isExpiringSoon ? '#F59E0B' : 'rgba(255,255,255,0.25)'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.04, ease: EASE }}
      whileHover={{ scale: 1.005, transition: { duration: 0.15 } }}
      className="relative flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border:     '1px solid rgba(255,255,255,0.05)',
        opacity:    doc.status === 'archived' ? 0.6 : 1,
      }}
    >
      {/* File icon */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => onOpen(doc)}
        className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg select-none"
        style={{ background: doc.category?.color ? `${doc.category.color}18` : 'rgba(255,255,255,0.06)' }}
      >
        {getFileIcon(doc.file_extension)}
      </motion.button>

      {/* Info */}
      <button className="flex-1 min-w-0 text-left" onClick={() => onOpen(doc)}>
        <div className="flex items-center gap-1.5 mb-0.5">
          <p className="text-sm font-semibold text-white truncate">{doc.title}</p>
          {doc.version_number > 1 && (
            <span
              className="text-[10px] font-bold px-1 py-0.5 rounded flex-shrink-0"
              style={{ background: 'rgba(139,92,246,0.12)', color: '#8B5CF6' }}
            >
              v{doc.version_number}
            </span>
          )}
          {doc.status === 'archived' && (
            <span
              className="text-[10px] font-bold px-1 py-0.5 rounded flex-shrink-0"
              style={{ background: 'rgba(107,114,128,0.12)', color: '#6B7280' }}
            >
              Archivado
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {doc.category && (
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ background: `${doc.category.color}18`, color: doc.category.color }}
            >
              {doc.category.name}
            </span>
          )}
          <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' })
              .format(new Date(doc.created_at))}
            {doc.file_size ? ` · ${formatFileSize(doc.file_size)}` : ''}
          </span>
        </div>

        {expirationLabel && (
          <div className="flex items-center gap-1 mt-1">
            <AlertCircle className="w-3 h-3 flex-shrink-0" style={{ color: expirationColor }} />
            <span className="text-[10px]" style={{ color: expirationColor }}>
              {isExpired ? 'Vencido' : 'Vence'} {expirationLabel}
            </span>
          </div>
        )}
      </button>

      {/* Actions trigger */}
      <div className="flex-shrink-0 relative">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowActions(v => !v)}
          className="w-7 h-7 flex items-center justify-center rounded-lg"
          style={{ color: 'rgba(255,255,255,0.25)' }}
        >
          <MoreHorizontal className="w-4 h-4" />
        </motion.button>

        <AnimatePresence>
          {showActions && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowActions(false)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: -4 }}
                animate={{ opacity: 1, scale: 1,    y: 0   }}
                exit={{    opacity: 0, scale: 0.92, y: -4  }}
                transition={{ duration: 0.15, ease: EASE }}
                className="absolute right-0 top-8 z-20 rounded-xl py-1 min-w-[148px]"
                style={{
                  background:  '#1A1D24',
                  border:      '1px solid rgba(255,255,255,0.1)',
                  boxShadow:   '0 8px 24px rgba(0,0,0,0.5)',
                }}
              >
                <button
                  onClick={() => { setShowActions(false); onOpen(doc) }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-white hover:bg-white/5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" style={{ color: '#3B82F6' }} />
                  Abrir
                </button>

                {onArchive && doc.status !== 'archived' && (
                  <button
                    onClick={() => { setShowActions(false); onArchive(doc) }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-white hover:bg-white/5 transition-colors"
                  >
                    <Archive className="w-3.5 h-3.5" style={{ color: '#F59E0B' }} />
                    Archivar
                  </button>
                )}

                {onDelete && (
                  <button
                    onClick={() => { setShowActions(false); onDelete(doc) }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-white/5 transition-colors"
                    style={{ color: '#EF4444' }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Eliminar
                  </button>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
