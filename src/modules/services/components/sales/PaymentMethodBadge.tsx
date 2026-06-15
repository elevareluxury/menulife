import type { PaymentMethodType } from '../../sales/salesTypes'
import { PAYMENT_METHOD_TYPE_CONFIG } from '../../sales/salesTypes'

interface Props {
  type: PaymentMethodType
  name?: string
}

export function PaymentMethodBadge({ type, name }: Props) {
  const config = PAYMENT_METHOD_TYPE_CONFIG[type]
  return (
    <span style={{
      display:        'inline-flex',
      alignItems:     'center',
      gap:            '4px',
      padding:        '2px 8px',
      borderRadius:   '999px',
      background:     'rgba(255,255,255,0.06)',
      border:         '1px solid rgba(255,255,255,0.10)',
      fontSize:       '12px',
      color:          'rgba(255,255,255,0.75)',
      whiteSpace:     'nowrap',
    }}>
      <span>{config.emoji}</span>
      <span>{name ?? config.label}</span>
    </span>
  )
}
