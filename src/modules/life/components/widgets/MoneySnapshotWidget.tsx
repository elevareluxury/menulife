import { useNavigate } from 'react-router-dom'
import { Wallet, TrendingUp, TrendingDown } from 'lucide-react'
import { LifeCard, LifeSectionHeader, LifeEmptyState, colors, font, radius, shadow } from '../../design-system'
import { useCountUp } from '../../hooks/useCountUp'

interface MoneySnapshotWidgetProps {
  monthIncome: number
  monthExpense: number
}

function formatK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`
  return Math.round(n).toLocaleString('es')
}

export function MoneySnapshotWidget({ monthIncome, monthExpense }: MoneySnapshotWidgetProps) {
  const navigate = useNavigate()
  const hasData = monthIncome > 0 || monthExpense > 0
  const balance = monthIncome - monthExpense
  const isPositive = balance >= 0

  const animIncome  = useCountUp(Math.round(monthIncome),  900)
  const animExpense = useCountUp(Math.round(monthExpense), 900)
  const animBalance = useCountUp(Math.abs(Math.round(balance)), 1000)

  return (
    <LifeCard>
      <LifeSectionHeader
        title="Dinero del mes"
        action={hasData ? { label: 'Ver detalle', to: '/life/money' } : undefined}
      />

      {!hasData ? (
        <LifeEmptyState
          icon={Wallet}
          iconColor={colors.area.money}
          title="Sin movimientos"
          subtitle="Registrá ingresos y gastos para visualizar tu balance"
          action={{ label: 'Agregar movimiento', onClick: () => navigate('/life/money') }}
        />
      ) : (
        <>
          {/* Balance highlight */}
          <div style={{
            padding: '14px 16px', borderRadius: radius.lg, marginBottom: '14px',
            background: isPositive
              ? 'color-mix(in srgb, #22C55E 8%, transparent)'
              : 'color-mix(in srgb, #EF4444 8%, transparent)',
            border: `1px solid ${isPositive ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)'}`,
            boxShadow: shadow.innerTop,
          }}>
            <p style={{ fontFamily: font, fontSize: '11px', fontWeight: 700, color: colors.text.tertiary, marginBottom: '4px', letterSpacing: '0.06em' }}>
              BALANCE NETO
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span style={{ fontFamily: font, fontSize: '12px', fontWeight: 700, color: isPositive ? colors.semantic.success : colors.semantic.error }}>
                {isPositive ? '+' : '-'}$
              </span>
              <span style={{ fontFamily: font, fontSize: '32px', fontWeight: 800, color: isPositive ? colors.semantic.success : colors.semantic.error, letterSpacing: '-0.02em' }}>
                {formatK(animBalance)}
              </span>
            </div>
          </div>

          {/* Income / Expense row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              onClick={() => navigate('/life/money')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '10px', borderRadius: radius.md, textAlign: 'left', transition: 'background 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = colors.surface.elevated }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <TrendingUp size={13} style={{ color: colors.semantic.success }} />
                <span style={{ fontFamily: font, fontSize: '10px', fontWeight: 700, color: colors.text.tertiary, letterSpacing: '0.06em' }}>INGRESOS</span>
              </div>
              <p style={{ fontFamily: font, fontSize: '18px', fontWeight: 800, color: colors.semantic.success, margin: 0 }}>
                ${formatK(animIncome)}
              </p>
            </button>

            <button
              onClick={() => navigate('/life/money')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '10px', borderRadius: radius.md, textAlign: 'left', transition: 'background 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = colors.surface.elevated }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <TrendingDown size={13} style={{ color: colors.semantic.error }} />
                <span style={{ fontFamily: font, fontSize: '10px', fontWeight: 700, color: colors.text.tertiary, letterSpacing: '0.06em' }}>GASTOS</span>
              </div>
              <p style={{ fontFamily: font, fontSize: '18px', fontWeight: 800, color: colors.semantic.error, margin: 0 }}>
                ${formatK(animExpense)}
              </p>
            </button>
          </div>
        </>
      )}
    </LifeCard>
  )
}
