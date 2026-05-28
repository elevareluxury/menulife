import { motion } from 'framer-motion'
import { InstallBanner } from '@/components/ui/InstallBanner'
import { Header } from '@/components/dashboard/Header'
import { SummaryCards, type SummaryData } from '@/components/dashboard/SummaryCards'
import { ToolsGrid } from '@/components/dashboard/ToolsGrid'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { useRestaurant } from '@/modules/menu/hooks/useRestaurant'
import { useOrderStats } from '@/modules/dashboard/hooks/useOrderStats'
import { staggerSection, fadeUp } from '@/lib/animations'

export function DashboardHome() {
  const { restaurant } = useRestaurant()
  const { stats } = useOrderStats(restaurant?.id)

  const realOrderCount = stats.today.pending + stats.today.cooking + stats.today.ready

  const summaryData: SummaryData = {
    sales: {
      amount:     stats.today.total,
      comparison: 0,
    },
    activeOrders: {
      count: realOrderCount,
      new:   stats.today.pending,
    },
    activeTables: { current: 0, total: 0 },
    avgTime:      { minutes: 0 },
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
      <InstallBanner />

      <motion.div variants={fadeUp}>
        <Header
          businessName={restaurant?.name ?? 'Mi Local'}
          notificationCount={summaryData.activeOrders.new}
          operationalStatus={operationalStatus}
          coverImageUrl={restaurant?.cover_image_url ?? undefined}
        />
      </motion.div>

      <motion.div variants={fadeUp}>
        <SummaryCards data={summaryData} />
      </motion.div>

      <motion.div variants={fadeUp}>
        <ToolsGrid
          ordersActive={summaryData.activeOrders.count}
          menuProducts={0}
          tablesActive={summaryData.activeTables.current}
          tablesTotal={summaryData.activeTables.total}
          qrGenerated={0}
        />
      </motion.div>

      <motion.div variants={fadeUp}>
        <QuickActions restaurantSlug={restaurant?.slug} />
      </motion.div>
    </motion.div>
  )
}
