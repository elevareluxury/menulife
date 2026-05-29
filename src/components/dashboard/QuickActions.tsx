import { Eye, ChefHat, Plus, Package, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

interface QuickAction {
  icon: LucideIcon
  label: string
  to?: string
  href?: string
  external?: boolean
  delay: number
}

const baseClass =
  'flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-150 min-h-[48px] w-full cursor-pointer group'

function ActionButton({ action }: { action: QuickAction }) {
  const Icon = action.icon

  const content = (
    <>
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-surface-4 transition-colors duration-150 group-hover:bg-brand-dim"
        style={{ border: '1px solid var(--border-subtle)' }}
      >
        <Icon className="w-4 h-4 text-ink-3 group-hover:text-brand transition-colors duration-150" strokeWidth={2} />
      </div>
      <span className="text-[13px] font-medium text-ink-2 group-hover:text-ink-1 transition-colors duration-150 truncate">
        {action.label}
      </span>
    </>
  )

  const wrapper = (child: React.ReactNode) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: action.delay, ease: [0.4, 0, 0.2, 1] }}
      whileTap={{ scale: 0.97 }}
    >
      {child}
    </motion.div>
  )

  const cardStyle: React.CSSProperties = {
    background: '#171A21',
    border: '1px solid var(--border-subtle)',
  }

  if (action.href) {
    return wrapper(
      <a
        href={action.href}
        target={action.external ? '_blank' : undefined}
        rel={action.external ? 'noopener noreferrer' : undefined}
        className={baseClass}
        style={cardStyle}
      >
        {content}
      </a>
    )
  }

  if (action.to) {
    return wrapper(
      <Link to={action.to} className={baseClass} style={cardStyle}>
        {content}
      </Link>
    )
  }

  return wrapper(
    <button className={baseClass} style={cardStyle}>
      {content}
    </button>
  )
}

export function QuickActions({ restaurantSlug }: { restaurantSlug?: string }) {
  const { t } = useTranslation()

  const actions: QuickAction[] = [
    {
      icon: Eye,
      label: t('dashboard.action_view_qr'),
      href: restaurantSlug ? `/r/${restaurantSlug}` : undefined,
      external: true,
      delay: 0,
    },
    {
      icon: ChefHat,
      label: t('dashboard.action_open_kitchen'),
      href: restaurantSlug ? `/kitchen/${restaurantSlug}` : undefined,
      external: true,
      delay: 0.05,
    },
    {
      icon: Plus,
      label: t('dashboard.action_create_table'),
      to: '/dashboard/tables',
      delay: 0.1,
    },
    {
      icon: Package,
      label: t('dashboard.action_add_product'),
      to: '/dashboard/menu',
      delay: 0.15,
    },
  ]

  return (
    <section>
      <p className="text-[10px] font-semibold text-ink-3 uppercase tracking-widest mb-3">
        {t('dashboard.quick_actions')}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {actions.map((action) => (
          <ActionButton key={action.label} action={action} />
        ))}
      </div>
    </section>
  )
}
