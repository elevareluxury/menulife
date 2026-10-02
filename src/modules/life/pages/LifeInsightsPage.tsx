import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Lightbulb, ShieldCheck, AlertTriangle } from 'lucide-react'
import { useLifeT } from '@/i18n/app/life'
import { LifeScreenContainer, LifeCard, LifeEmptyState, colors, font, radius, stagger, fadeInUp } from '../design-system'
import { useInsights } from '../hooks/useInsights'
import { InsightCard } from '../components/InsightCard'

export function LifeInsightsPage() {
  const t = useLifeT()
  const s = t.insights
  const navigate = useNavigate()
  const { insights, loading, error } = useInsights()

  return (
    <LifeScreenContainer>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: '24px', marginBottom: '4px' }}>
        <button type="button" onClick={() => navigate('/life')} aria-label={s.back}
          style={{ width: 40, height: 40, borderRadius: radius.full, border: `1px solid ${colors.border.subtle}`, background: 'transparent', color: colors.text.secondary, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <ArrowLeft size={18} className="flip-rtl" aria-hidden="true" />
        </button>
        <h1 style={{ fontFamily: font, fontSize: '26px', fontWeight: 800, color: colors.text.primary, margin: 0 }}>{s.title}</h1>
      </div>
      <p style={{ fontFamily: font, fontSize: '13px', color: colors.text.tertiary, margin: '0 0 16px 50px' }}>{s.subtitle}</p>

      {loading ? (
        <motion.div animate={{ opacity: [0.3, 0.55, 0.3] }} transition={{ duration: 1.8, repeat: Infinity }} role="status" aria-label={s.title}>
          {[72, 72, 72].map((h, i) => <div key={i} style={{ height: h, marginBottom: 8, borderRadius: radius.xl, background: colors.surface.base, border: `1px solid ${colors.border.subtle}` }} />)}
        </motion.div>
      ) : error ? (
        <LifeCard><LifeEmptyState icon={AlertTriangle} iconColor={colors.semantic.error} title={s.loadError} subtitle="" /></LifeCard>
      ) : insights.length === 0 ? (
        <LifeCard><LifeEmptyState icon={Lightbulb} iconColor={colors.accent.default} title={s.emptyTitle} subtitle={s.emptyText} /></LifeCard>
      ) : (
        <motion.ul variants={stagger} initial="hidden" animate="visible"
          style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {insights.map((i, n) => <motion.li key={`${i.kind}-${n}`} variants={fadeInUp}><InsightCard insight={i} /></motion.li>)}
        </motion.ul>
      )}

      <p style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontFamily: font, fontSize: '12px', color: colors.text.tertiary, margin: '18px 4px 0', lineHeight: 1.5 }}>
        <ShieldCheck size={14} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />{s.privacy}
      </p>
    </LifeScreenContainer>
  )
}
