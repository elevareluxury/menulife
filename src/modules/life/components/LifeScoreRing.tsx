import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { colors, font, radius, shadow } from '../design-system/tokens'
import { fadeIn } from '../design-system/motion'
import { useCountUp } from '../hooks/useCountUp'
import { scoreDescriptor } from '../lib/lifeScoreEngine'

// SVG geometry
const SIZE = 180
const CX = 90
const CY = 90
const R = 72
const STROKE = 10
const CIRC = 2 * Math.PI * R  // ≈ 452.4

interface LifeScoreRingProps {
  score: number | null
  isNewUser: boolean
  loading: boolean
}

// --- Sub-components ---

function SkeletonRing() {
  return (
    <motion.div
      animate={{ opacity: [0.4, 0.65, 0.4] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      style={{ width: SIZE, height: SIZE, margin: '0 auto' }}
    >
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <circle cx={CX} cy={CY} r={R} fill="none"
          stroke={colors.border.subtle} strokeWidth={STROKE} />
      </svg>
    </motion.div>
  )
}

function WelcomeRing() {
  return (
    <motion.div
      variants={fadeIn} initial="hidden" animate="visible"
      style={{ width: SIZE, height: SIZE, margin: '0 auto', position: 'relative' }}
    >
      <motion.div
        animate={{ opacity: [0.35, 0.65, 0.35] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <circle cx={CX} cy={CY} r={R} fill="none"
            stroke={colors.accent.default}
            strokeWidth={STROKE}
            strokeDasharray="6 10"
            strokeLinecap="round"
            opacity={0.35}
          />
        </svg>
      </motion.div>

      {/* Center content */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '6px',
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: radius.md,
          background: colors.accent.soft,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Sparkles size={22} style={{ color: colors.accent.default }} strokeWidth={1.8} />
        </div>
      </div>
    </motion.div>
  )
}

function ScoreRing({ score }: { score: number }) {
  const arcRef = useRef<SVGCircleElement>(null)
  const displayScore = useCountUp(score, 1200)
  const descriptor = scoreDescriptor(score)

  // Animate stroke-dashoffset via CSS transition (avoids framer-motion SVG type issues)
  useEffect(() => {
    const el = arcRef.current
    if (!el) return
    el.style.strokeDashoffset = String(CIRC)
    el.style.transition = 'none'
    const raf = requestAnimationFrame(() => {
      el.style.transition = `stroke-dashoffset 1.4s cubic-bezier(0.16,1,0.3,1) 0.25s`
      el.style.strokeDashoffset = String(CIRC * (1 - score / 100))
    })
    return () => cancelAnimationFrame(raf)
  }, [score])

  return (
    <motion.div
      variants={fadeIn} initial="hidden" animate="visible"
      style={{ width: SIZE, height: SIZE, margin: '0 auto', position: 'relative' }}
    >
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {/* Glow filter */}
        <defs>
          <filter id="scoreGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {/* Track */}
        <circle cx={CX} cy={CY} r={R} fill="none"
          stroke={colors.border.subtle} strokeWidth={STROKE} />
        {/* Score arc */}
        <circle
          ref={arcRef}
          cx={CX} cy={CY} r={R}
          fill="none"
          stroke={colors.accent.default}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${CIRC} ${CIRC}`}
          transform={`rotate(-90 ${CX} ${CY})`}
          filter="url(#scoreGlow)"
        />
      </svg>

      {/* Center overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{
          fontFamily: font, fontSize: '44px', fontWeight: 800,
          color: colors.text.primary, lineHeight: 1, letterSpacing: '-0.02em',
        }}>
          {displayScore}
        </span>
        <span style={{
          fontFamily: font, fontSize: '11px', fontWeight: 600,
          color: colors.text.tertiary, marginTop: '2px',
        }}>
          / 100
        </span>
        <span style={{
          fontFamily: font, fontSize: '11px', fontWeight: 700,
          color: colors.accent.default, marginTop: '5px',
          letterSpacing: '0.04em',
        }}>
          {descriptor}
        </span>
      </div>
    </motion.div>
  )
}

// --- Main export ---

export function LifeScoreRing({ score, isNewUser, loading }: LifeScoreRingProps) {
  return (
    <div style={{
      borderRadius: radius.xl,
      padding: '24px 24px 20px',
      background: `linear-gradient(145deg, rgba(244,112,90,0.05) 0%, rgba(244,112,90,0.01) 100%)`,
      border: `1px solid rgba(244,112,90,0.09)`,
      boxShadow: shadow.innerTop,
      textAlign: 'center',
      marginBottom: '12px',
    }}>
      {/* Label */}
      <p style={{
        fontFamily: font, fontSize: '10px', fontWeight: 700,
        letterSpacing: '0.12em', textTransform: 'uppercase',
        color: colors.text.quaternary, marginBottom: '20px',
      }}>
        Life Score
      </p>

      {/* Ring state */}
      {loading    && <SkeletonRing />}
      {!loading && isNewUser  && <WelcomeRing />}
      {!loading && !isNewUser && score !== null && <ScoreRing score={score} />}

      {/* Subtitle below ring */}
      <p style={{
        fontFamily: font, fontSize: '12px', fontWeight: 500,
        color: colors.text.tertiary, marginTop: '18px', lineHeight: 1.5,
      }}>
        {loading
          ? ''
          : isNewUser
          ? 'Comenzá a registrar hábitos, metas y finanzas para calcular tu score'
          : 'Puntaje calculado desde tus hábitos, metas y dinero de hoy'}
      </p>
    </div>
  )
}
