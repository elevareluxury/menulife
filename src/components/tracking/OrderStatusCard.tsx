import { motion, AnimatePresence } from 'framer-motion'

const STATUS_CONFIG: Record<string, {
  emoji: string
  title: string
  subtitle: string
  color: string
  estimatedTime: string | null
}> = {
  pending: {
    emoji: '⏳',
    title: 'Pedido recibido',
    subtitle: 'Enviando a cocina...',
    color: '#F59E0B',
    estimatedTime: null,
  },
  cooking: {
    emoji: '👨‍🍳',
    title: 'En preparación',
    subtitle: 'Estamos preparando tu pedido con cariño',
    color: '#FF6B7A',
    estimatedTime: '~15 min',
  },
  ready: {
    emoji: '🔔',
    title: '¡Tu pedido está listo!',
    subtitle: 'El mozo lo lleva a tu mesa ahora',
    color: '#10B981',
    estimatedTime: null,
  },
  delivered: {
    emoji: '🎉',
    title: '¡Buen provecho!',
    subtitle: '¿Todo bien? Podés pedir más cuando quieras',
    color: '#10B981',
    estimatedTime: null,
  },
  cancelled: {
    emoji: '❌',
    title: 'Pedido cancelado',
    subtitle: 'Hablá con el mozo para más información',
    color: '#EF4444',
    estimatedTime: null,
  },
}

interface Props {
  status: string
}

export function OrderStatusCard({ status }: Props) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3 }}
        className="rounded-2xl p-5"
        style={{
          backgroundColor: '#111111',
          border: `1px solid ${config.color}33`,
          boxShadow: `0 0 24px ${config.color}18`,
        }}
      >
        <div className="flex items-start gap-4">
          <motion.div
            animate={
              status === 'pending'
                ? { rotate: [0, -10, 10, -10, 0] }
                : status === 'ready'
                ? { scale: [1, 1.15, 1] }
                : {}
            }
            transition={
              status === 'pending'
                ? { repeat: Infinity, duration: 2, repeatDelay: 1 }
                : status === 'ready'
                ? { repeat: Infinity, duration: 0.8 }
                : {}
            }
            className="text-4xl flex-shrink-0"
          >
            {config.emoji}
          </motion.div>

          <div className="flex-1 min-w-0">
            <p className="font-bold text-base" style={{ color: config.color }}>
              {config.title}
            </p>
            <p className="text-sm mt-0.5" style={{ color: '#888888' }}>
              {config.subtitle}
            </p>
            {config.estimatedTime && (
              <div
                className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: `${config.color}18`,
                  color: config.color,
                }}
              >
                <span>⏱️</span>
                <span>Tiempo estimado: {config.estimatedTime}</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
