import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer,
} from 'recharts'
import { TrendingUp, TrendingDown, Minus, BarChart2 } from 'lucide-react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

const ACC = '#F4705A'

interface Props {
  restaurantId: string
}

interface AnalyticsEvent {
  event_type: string
  link_id: string | null
  referrer: string | null
  user_agent: string | null
  device: string | null
  created_at: string
}

interface LinkLabel {
  id: string
  label: string
}

interface DayData {
  day: string
  visitas: number
}

interface TopLink {
  id: string
  label: string
  clicks: number
}

interface SourceBreakdown {
  source: string
  count: number
  percentage: number
}

interface DeviceBreakdown {
  device: string
  count: number
  percentage: number
}

const CLICK_TYPES = new Set([
  'link_click', 'whatsapp_click', 'cta_click',
  'google_reviews_click', 'google_maps_click',
])

function isClickEvent(eventType: string): boolean {
  return CLICK_TYPES.has(eventType) || eventType.startsWith('social_')
}

function classifySource(referrer: string | null): string {
  if (!referrer) return 'directo'
  const ref = referrer.toLowerCase()
  if (ref.includes('whatsapp') || ref.includes('wa.me')) return 'whatsapp'
  if (ref.includes('instagram') || ref.includes('l.instagram')) return 'instagram'
  if (ref.includes('facebook') || ref.includes('l.facebook')) return 'facebook'
  if (ref.includes('twitter') || ref.includes('t.co')) return 'twitter'
  if (ref.includes('linkedin')) return 'linkedin'
  if (ref.includes('google')) return 'google'
  if (ref.includes('tiktok')) return 'tiktok'
  return 'otros'
}

const SOURCE_LABELS: Record<string, string> = {
  directo:   'Directo',
  whatsapp:  'WhatsApp',
  instagram: 'Instagram',
  facebook:  'Facebook',
  twitter:   'Twitter',
  linkedin:  'LinkedIn',
  google:    'Google',
  tiktok:    'TikTok',
  otros:     'Otros',
}

const DEVICE_LABELS: Record<string, string> = {
  mobile:  'Mobile',
  tablet:  'Tablet',
  desktop: 'Desktop',
}

function BarRow({ label, count, pct }: { label: string; count: number; pct: number }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-white">{label}</span>
        <span className="text-xs text-gray-400">{count} ({pct}%)</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: ACC }} />
      </div>
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12,
      padding: '16px',
    }}>
      <h3 className="text-white font-semibold text-sm uppercase tracking-wide mb-4">{title}</h3>
      {children}
    </div>
  )
}

export function TabAnalytics({ restaurantId }: Props) {
  const [loading, setLoading]           = useState(true)
  const [chartData, setChartData]       = useState<DayData[]>([])
  const [totalThisWeek, setThisWeek]    = useState(0)
  const [totalLastWeek, setLastWeek]    = useState(0)
  const [totalClicks, setTotalClicks]   = useState(0)
  const [uniqueVisitors, setUnique]     = useState(0)
  const [topLinks, setTopLinks]         = useState<TopLink[]>([])
  const [sources, setSources]           = useState<SourceBreakdown[]>([])
  const [devices, setDevices]           = useState<DeviceBreakdown[]>([])

  useEffect(() => {
    async function load() {
      const now = new Date()
      const thirtyDaysAgo = new Date(now)
      thirtyDaysAgo.setDate(now.getDate() - 30)

      const [{ data: events }, { data: linkRows }] = await Promise.all([
        db.from('hub_analytics')
          .select('event_type, link_id, referrer, user_agent, device, created_at')
          .eq('restaurant_id', restaurantId)
          .gte('created_at', thirtyDaysAgo.toISOString())
          .order('created_at', { ascending: false }),
        db.from('hub_links').select('id, label').eq('restaurant_id', restaurantId),
      ])

      const evts     = (events ?? []) as AnalyticsEvent[]
      const links    = (linkRows ?? []) as LinkLabel[]
      const linkMap  = new Map(links.map(l => [l.id, l.label]))
      const pageviews = evts.filter(e => e.event_type === 'profile_view')

      // ── Weekly comparison
      const sevenAgo     = new Date(now); sevenAgo.setDate(now.getDate() - 7)
      const fourteenAgo  = new Date(now); fourteenAgo.setDate(now.getDate() - 14)
      const thisWeek     = pageviews.filter(e => new Date(e.created_at) >= sevenAgo).length
      const lastWeek     = pageviews.filter(e => {
        const d = new Date(e.created_at)
        return d >= fourteenAgo && d < sevenAgo
      }).length
      setThisWeek(thisWeek)
      setLastWeek(lastWeek)

      // ── Total clicks (all click event types)
      setTotalClicks(evts.filter(e => isClickEvent(e.event_type)).length)

      // ── Unique visitors (user_agent + date deduplicate)
      const uniqSet = new Set(
        pageviews.map(e => `${(e.user_agent ?? '').slice(0, 40)}_${e.created_at.slice(0, 10)}`)
      )
      setUnique(uniqSet.size)

      // ── Top 5 links (only link_click with link_id)
      const linkCounts = new Map<string, number>()
      evts
        .filter(e => e.event_type === 'link_click' && e.link_id)
        .forEach(e => linkCounts.set(e.link_id!, (linkCounts.get(e.link_id!) ?? 0) + 1))
      setTopLinks(
        Array.from(linkCounts.entries())
          .map(([id, clicks]) => ({ id, label: linkMap.get(id) ?? 'Link eliminado', clicks }))
          .sort((a, b) => b.clicks - a.clicks)
          .slice(0, 5)
      )

      // ── Sources (pageviews only)
      const srcCounts = new Map<string, number>()
      pageviews.forEach(e => {
        const s = classifySource(e.referrer)
        srcCounts.set(s, (srcCounts.get(s) ?? 0) + 1)
      })
      const totalPV = pageviews.length
      setSources(
        Array.from(srcCounts.entries())
          .map(([source, count]) => ({
            source,
            count,
            percentage: totalPV > 0 ? Math.round((count / totalPV) * 100) : 0,
          }))
          .sort((a, b) => b.count - a.count)
      )

      // ── Devices (pageviews with device column populated)
      const devCounts = new Map<string, number>()
      pageviews.filter(e => e.device && e.device !== 'unknown').forEach(e => {
        devCounts.set(e.device!, (devCounts.get(e.device!) ?? 0) + 1)
      })
      const totalDev = pageviews.filter(e => e.device && e.device !== 'unknown').length
      setDevices(
        Array.from(devCounts.entries())
          .map(([device, count]) => ({
            device,
            count,
            percentage: totalDev > 0 ? Math.round((count / totalDev) * 100) : 0,
          }))
          .sort((a, b) => b.count - a.count)
      )

      // ── 30-day chart
      const chart: DayData[] = []
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now)
        d.setDate(now.getDate() - i)
        const key = d.toISOString().slice(0, 10)
        chart.push({
          day: d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }),
          visitas: pageviews.filter(e => e.created_at.startsWith(key)).length,
        })
      }
      setChartData(chart)
      setLoading(false)
    }
    load()
  }, [restaurantId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-white" />
      </div>
    )
  }

  const weekChange = totalLastWeek > 0
    ? Math.round(((totalThisWeek - totalLastWeek) / totalLastWeek) * 100)
    : (totalThisWeek > 0 ? 100 : 0)

  const trendColor = weekChange > 5 ? '#22C55E' : weekChange < -5 ? '#F87171' : '#9CA3AF'
  const TrendIcon  = weekChange > 5 ? TrendingUp : weekChange < -5 ? TrendingDown : Minus

  return (
    <div className="space-y-5">

      {/* ── Esta semana vs anterior */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: '20px',
      }}>
        <p className="text-sm text-gray-400 mb-3">Esta semana</p>
        <div className="flex items-baseline gap-3">
          <span className="text-4xl font-bold text-white">{totalThisWeek.toLocaleString()}</span>
          <span className="text-sm text-gray-500">visitas</span>
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs">
          <TrendIcon size={14} style={{ color: trendColor }} />
          <span style={{ color: trendColor }} className="font-semibold">
            {weekChange > 0 ? '+' : ''}{weekChange}%
          </span>
          <span className="text-gray-500">
            vs semana anterior ({totalLastWeek} visitas)
          </span>
        </div>
      </div>

      {/* ── Grid métricas */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Clicks totales',    value: totalClicks.toLocaleString()  },
          { label: 'Visitantes únicos', value: uniqueVisitors.toLocaleString() },
        ].map(({ label, value }) => (
          <div key={label} style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12, padding: '16px',
          }}>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">{label}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* ── Gráfico 30 días */}
      <SectionCard title="Visitas últimos 30 días">
        {chartData.every(d => d.visitas === 0) ? (
          <div className="flex items-center justify-center h-40">
            <div className="text-center">
              <BarChart2 className="w-8 h-8 mx-auto mb-2" style={{ color: '#374151' }} />
              <p className="text-sm text-gray-500">Sin visitas todavía</p>
              <p className="text-xs text-gray-600 mt-1">Compartí tu URL para empezar</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 5, right: 8, bottom: 5, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="day"
                tick={{ fill: '#6B7280', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval={4}
              />
              <YAxis
                tick={{ fill: '#6B7280', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: '#1F2937',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: '#9CA3AF' }}
                itemStyle={{ color: ACC }}
                formatter={(v) => [v, 'visitas']}
              />
              <Line
                type="monotone"
                dataKey="visitas"
                stroke={ACC}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: ACC }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </SectionCard>

      {/* ── Top 5 links */}
      <SectionCard title="Top 5 links">
        {topLinks.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">Sin clicks todavía</p>
        ) : (
          <div className="space-y-2">
            {topLinks.map((link, idx) => (
              <div
                key={link.id}
                className="flex items-center gap-3 p-2 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.02)' }}
              >
                <span className="text-xs text-gray-500 w-4">{idx + 1}</span>
                <span className="flex-1 text-sm text-white truncate">{link.label}</span>
                <span className="text-sm font-semibold" style={{ color: ACC }}>{link.clicks}</span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ── Fuentes de tráfico */}
      <SectionCard title="Fuentes de tráfico">
        {sources.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">Sin datos</p>
        ) : (
          <div className="space-y-3">
            {sources.map(s => (
              <BarRow
                key={s.source}
                label={SOURCE_LABELS[s.source] ?? s.source}
                count={s.count}
                pct={s.percentage}
              />
            ))}
          </div>
        )}
      </SectionCard>

      {/* ── Dispositivos */}
      <SectionCard title="Dispositivos">
        {devices.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            Datos disponibles cuando lleguen visitas nuevas
          </p>
        ) : (
          <div className="space-y-3">
            {devices.map(d => (
              <BarRow
                key={d.device}
                label={DEVICE_LABELS[d.device] ?? d.device}
                count={d.count}
                pct={d.percentage}
              />
            ))}
          </div>
        )}
      </SectionCard>

    </div>
  )
}
