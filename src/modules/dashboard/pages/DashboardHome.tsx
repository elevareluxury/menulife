import { motion } from 'framer-motion'
import { Header } from '@/components/dashboard/Header'
import { SummaryCards, type SummaryData } from '@/components/dashboard/SummaryCards'
import { ToolsGrid } from '@/components/dashboard/ToolsGrid'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { useRestaurant } from '@/modules/menu/hooks/useRestaurant'
import { useOrderStats } from '@/modules/dashboard/hooks/useOrderStats'
import { staggerSection, fadeUp } from '@/lib/animations'

const MOCK = {
  sales:        { amount: 45_230, comparison: 12 },
  activeOrders: { count: 12, new: 3 },
  activeTables: { current: 8, total: 15 },
  avgTime:      { minutes: 14 },
  tools:        { menuProducts: 48, qrGenerated: 15 },
}

export function DashboardHome() {
  const { restaurant } = useRestaurant()
  const { stats } = useOrderStats(restaurant?.id)

  const realOrderCount = stats.today.pending + stats.today.cooking + stats.today.ready

  const summaryData: SummaryData = {
    sales: {
      amount:     stats.today.total > 0 ? stats.today.total : MOCK.sales.amount,
      comparison: MOCK.sales.comparison,
    },
    activeOrders: {
      count: realOrderCount > 0 ? realOrderCount : MOCK.activeOrders.count,
      new:   stats.today.pending > 0 ? stats.today.pending : MOCK.activeOrders.new,
    },
    activeTables: MOCK.activeTables,
    avgTime:      MOCK.avgTime,
  }

  const operationalStatus =
    summaryData.activeOrders.new > 5 ? 'critical'
    : summaryData.activeOrders.new > 0 ? 'warning'
    : 'ok'

  return (
    <motion.div
      variants={staggerSection}
      initial="hidden"
      animate="show"
      className="space-y-5 pb-4 dashboard-body"
    >
      <motion.div variants={fadeUp}>
        <Header
          businessName={restaurant?.name ?? 'Mi Local'}
          notificationCount={summaryData.activeOrders.new}
          operationalStatus={operationalStatus}
        />
      </motion.div>

      <motion.div variants={fadeUp}>
        <SummaryCards data={summaryData} />
      </motion.div>

      <motion.div variants={fadeUp}>
        <ToolsGrid
          ordersActive={summaryData.activeOrders.count}
          menuProducts={MOCK.tools.menuProducts}
          tablesActive={summaryData.activeTables.current}
          tablesTotal={summaryData.activeTables.total}
          qrGenerated={MOCK.tools.qrGenerated}
        />
      </motion.div>

      <motion.div variants={fadeUp}>
        <QuickActions restaurantSlug={restaurant?.slug} />
      </motion.div>
    </motion.div>
  )
}
