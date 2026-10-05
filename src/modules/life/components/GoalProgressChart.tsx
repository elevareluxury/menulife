import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { BarChart2 } from 'lucide-react'
import { colors, font, radius } from '../design-system'
import { useGoalCheckins } from '../hooks/useGoalCheckins'

const ACCENT = '#818CF8'

function answerToScore(answer: string): number {
  if (answer === 'si') return 100
  if (answer === 'un_poco') return 50
  return 0
}

export function GoalProgressChart({ goalId }: { goalId: string }) {
  const { checkins, loading } = useGoalCheckins({ goalId, limit: 26 })

  if (loading || checkins.length === 0) {
    return (
      <div style={{
        padding: '28px 20px', textAlign: 'center',
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${colors.border.subtle}`,
        borderRadius: radius.lg,
      }}>
        <BarChart2 size={20} style={{ color: colors.text.tertiary, marginBottom: 8 }} />
        <p style={{ fontFamily: font, fontSize: 13, color: colors.text.tertiary, margin: 0 }}>
          El gráfico aparece con tu primer check-in
        </p>
      </div>
    )
  }

  // Invertir porque el hook retorna DESC (más reciente primero)
  const data = [...checkins].reverse().map(c => {
    const d = new Date(c.week_start_date + 'T00:00:00')
    return {
      week: new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit' }).format(d),
      progreso: c.progress_percentage ?? answerToScore(c.progress_answer),
    }
  })

  return (
    <div style={{
      padding: '14px 14px 8px',
      borderRadius: radius.lg,
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${colors.border.subtle}`,
    }}>
      <p style={{
        fontFamily: font, fontSize: 10, fontWeight: 700,
        color: colors.text.tertiary, letterSpacing: '0.08em',
        textTransform: 'uppercase', margin: '0 0 12px',
      }}>
        Evolución del progreso
      </p>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -28 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="week"
            tick={{ fill: colors.text.tertiary, fontSize: 10, fontFamily: font }}
            axisLine={false}
            tickLine={false}
            interval={Math.max(0, Math.floor(data.length / 6) - 1)}
          />
          <YAxis
            tick={{ fill: colors.text.tertiary, fontSize: 10, fontFamily: font }}
            axisLine={false}
            tickLine={false}
            domain={[0, 100]}
            ticks={[0, 50, 100]}
          />
          <Tooltip
            contentStyle={{
              background: '#1F2937',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 8,
              fontSize: 12,
              fontFamily: font,
            }}
            labelStyle={{ color: colors.text.tertiary }}
            itemStyle={{ color: ACCENT }}
            formatter={(value) => [`${value ?? 0}%`, 'Progreso']}
          />
          <Line
            type="monotone"
            dataKey="progreso"
            stroke={ACCENT}
            strokeWidth={2.5}
            dot={{ r: 4, fill: ACCENT, strokeWidth: 0 }}
            activeDot={{ r: 6, fill: '#fff', stroke: ACCENT, strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
