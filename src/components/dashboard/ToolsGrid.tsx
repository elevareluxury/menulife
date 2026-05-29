import { ShoppingBag, UtensilsCrossed, LayoutGrid, QrCode, ArrowRight, type LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

interface Tool {
  icon: LucideIcon
  iconColorClass: string
  iconBgClass: string
  label: string
  description: string
  status: string
  to: string
  delay: number
}

interface ToolsGridProps {
  ordersActive: number
  menuProducts: number
  tablesActive: number
  tablesTotal: number
  qrGenerated: number
}

function ToolCard({ tool }: { tool: Tool }) {
  const Icon = tool.icon
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: tool.delay, ease: [0.4, 0, 0.2, 1] }}
      whileHover={{ y: -5, transition: { duration: 0.18 } }}
      whileTap={{ scale: 0.97 }}
    >
      <NavLink to={tool.to} className="block h-full group">
        <div
          className="relative overflow-hidden bg-surface-3 rounded-2xl p-5 h-full cursor-pointer transition-colors duration-200 group-hover:bg-surface-4"
          style={{
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)',
          }}
          /* Reemplazamos el border en hover con JS para poder usar CSS vars */
          onMouseEnter={e => (e.currentTarget.style.border = '1px solid var(--border-brand)')}
          onMouseLeave={e => (e.currentTarget.style.border = '1px solid var(--border-subtle)')}
        >
          {/* Icono */}
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-transform duration-200 group-hover:scale-110 ${tool.iconBgClass}`}>
            <Icon className={`w-5 h-5 ${tool.iconColorClass}`} strokeWidth={2} />
          </div>

          {/* Texto */}
          <h3 className="text-[15px] font-semibold text-ink-1 mb-1 leading-tight">{tool.label}</h3>
          <p className="text-[12px] text-ink-3 mb-4 leading-relaxed">{tool.description}</p>

          {/* Estado */}
          <div className="flex items-center gap-1 text-[11px] font-semibold text-ink-3 group-hover:text-brand transition-colors duration-150">
            {tool.status}
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      </NavLink>
    </motion.div>
  )
}

export function ToolsGrid({ ordersActive, menuProducts, tablesActive, tablesTotal, qrGenerated }: ToolsGridProps) {
  const { t } = useTranslation()

  const tools: Tool[] = [
    {
      icon: ShoppingBag,
      iconColorClass: 'text-brand',
      iconBgClass: 'bg-brand-dim',
      label: t('dashboard.tool_orders'),
      description: t('dashboard.tool_orders_desc'),
      status: `${ordersActive} ${t('dashboard.tool_orders_active')}`,
      to: '/dashboard/orders',
      delay: 0,
    },
    {
      icon: UtensilsCrossed,
      iconColorClass: 'text-ok',
      iconBgClass: 'bg-ok-dim',
      label: t('dashboard.tool_menu'),
      description: t('dashboard.tool_menu_desc'),
      status: `${menuProducts} ${t('dashboard.tool_menu_products')}`,
      to: '/dashboard/menu',
      delay: 0.06,
    },
    {
      icon: LayoutGrid,
      iconColorClass: 'text-info',
      iconBgClass: 'bg-info-dim',
      label: t('dashboard.tool_tables'),
      description: t('dashboard.tool_tables_desc'),
      status: `${tablesActive}/${tablesTotal} ${t('dashboard.tool_tables_active')}`,
      to: '/dashboard/tables',
      delay: 0.12,
    },
    {
      icon: QrCode,
      iconColorClass: 'text-purple',
      iconBgClass: 'bg-purple-dim',
      label: t('dashboard.tool_qr'),
      description: t('dashboard.tool_qr_desc'),
      status: `${qrGenerated} ${t('dashboard.tool_qr_generated')}`,
      to: '/dashboard/qr',
      delay: 0.18,
    },
  ]

  return (
    <section>
      <p className="text-[10px] font-semibold text-ink-3 uppercase tracking-widest mb-3">
        {t('dashboard.tools_title')}
      </p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tools.map((tool) => (
          <ToolCard key={tool.label} tool={tool} />
        ))}
      </div>
    </section>
  )
}
