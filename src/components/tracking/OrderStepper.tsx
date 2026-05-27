import { motion } from 'framer-motion'

const STEPS = [
  { status: 'pending',   emoji: '⏳', label: 'Recibido' },
  { status: 'cooking',   emoji: '👨‍🍳', label: 'En cocina' },
  { status: 'ready',     emoji: '🔔', label: 'Listo' },
  { status: 'delivered', emoji: '🎉', label: 'Entregado' },
]

const STATUS_STEP: Record<string, number> = {
  pending: 0,
  cooking: 1,
  ready: 2,
  delivered: 3,
}

interface Props {
  status: string
}

export function OrderStepper({ status }: Props) {
  const currentStep = STATUS_STEP[status] ?? 0

  return (
    <div className="px-2">
      {/* Circles + lines row */}
      <div className="flex items-center">
        {STEPS.map((step, i) => {
          const stepState =
            i < currentStep ? 'completed' : i === currentStep ? 'active' : 'inactive'

          return (
            <div key={step.status} className="contents">
              {/* Step circle */}
              <div className="flex flex-col items-center relative z-10">
                <motion.div
                  animate={{
                    backgroundColor:
                      stepState === 'inactive' ? '#374151' : '#FF6B7A',
                    scale: stepState === 'active' ? [1, 1.2, 1] : 1,
                  }}
                  transition={
                    stepState === 'active'
                      ? {
                          scale: { repeat: Infinity, duration: 1.5, ease: 'easeInOut' },
                          backgroundColor: { duration: 0.3 },
                        }
                      : { duration: 0.3 }
                  }
                  className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                >
                  {stepState === 'completed' ? (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      className="text-white font-bold text-sm"
                    >
                      ✓
                    </motion.span>
                  ) : (
                    <span>{step.emoji}</span>
                  )}
                </motion.div>
              </div>

              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-0.5 mx-1 bg-[#374151] relative overflow-hidden">
                  <motion.div
                    className="absolute inset-0 bg-[#FF6B7A] origin-left"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: currentStep > i ? 1 : 0 }}
                    transition={{ duration: 0.8, ease: 'easeInOut', delay: 0.1 }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Labels row */}
      <div className="flex mt-2">
        {STEPS.map((step, i) => (
          <div key={step.status} className="contents">
            <div className="flex justify-center" style={{ width: '40px' }}>
              <span
                className="text-[10px] text-center leading-tight"
                style={{
                  color:
                    STATUS_STEP[status] >= i
                      ? '#F5F5F5'
                      : '#888888',
                }}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && <div className="flex-1" />}
          </div>
        ))}
      </div>
    </div>
  )
}
