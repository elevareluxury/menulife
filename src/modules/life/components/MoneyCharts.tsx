// Gráficos de Dinero: la curva del saldo del mes y "Últimos meses". Colores sólo del tema (tokens), sin rojo: el
// saldo a favor va en el verde calmo de los ingresos y el negativo en el gris del texto (el signo lo dice). Escalas
// desde 0, textos en HTML (no se estiran ni se pisan a 320 px) y una alternativa en texto para lectores de pantalla.
import { useId, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { LifeCard, colors, font, radius, tint } from '../design-system'
import { useLifeT } from '@/i18n/app/life'
import { formatMoney } from '@/lib/currencies'
import { lifeNow } from '../lib/zonedTime'
import { curveScale, curveSummary, nearestIndex, type MonthHistory, type MonthTotals } from '../lib/moneyCharts'

const dayDate = (month: string, day: number) => {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1, day)
}

// ── Curva del saldo del mes ──────────────────────────────────────────────────
const W = 300, H = 88, PAD = 6

/**
 * Saldo acumulado día por día (de `monthCurve`). Se recorre con el dedo, el mouse o las flechas (es un slider con
 * el día y el saldo como texto); debajo, el primer y el último día. La línea del cero sólo aparece si la curva la cruza.
 */
export function BalanceChart({ curve, month, currency, locale }: { curve: number[]; month: string; currency: string; locale: string }) {
  const t = useLifeT()
  const id = useId().replace(/:/g, '')
  const [active, setActive] = useState<number | null>(null)
  const summary = curveSummary(curve)
  if (curve.length < 2 || !summary) return null

  const n = curve.length
  const { lo, hi } = curveScale(curve)
  const x = (i: number) => (i / (n - 1)) * W
  const y = (v: number) => PAD + ((hi - v) / (hi - lo)) * (H - PAD * 2)
  const y0 = y(0)
  const line = curve.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const area = `${line} L${W},${y0.toFixed(1)} L0,${y0.toFixed(1)} Z`
  const crossesZero = lo < 0 && hi > 0
  const money = (v: number) => formatMoney(v, currency, locale)
  const dayLabel = (day: number) => dayDate(month, day).toLocaleDateString(locale, { day: 'numeric', month: 'short' })
  const shown = active ?? n - 1
  const valueText = `${dayLabel(shown + 1)}: ${money(curve[shown])}`

  const pick = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    if (!r.width) return
    // En árabe la página va de derecha a izquierda, pero el tiempo del gráfico sigue de izquierda a derecha (dir="ltr")
    setActive(nearestIndex((e.clientX - r.left) / r.width, n))
  }
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step: Record<string, number> = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }
    if (e.key in step) setActive(Math.min(n - 1, Math.max(0, shown + step[e.key])))
    else if (e.key === 'Home') setActive(0)
    else if (e.key === 'End') setActive(n - 1)
    else return
    e.preventDefault()
  }

  const above = colors.money.income
  const below = colors.money.expenseMark
  return (
    <div style={{ marginTop: 14 }}>
      <p className="sr-only">
        {t.money.curveSummary(money(summary.last), money(summary.min), dayLabel(summary.minDay))}
      </p>
      <p aria-hidden="true" style={{ display: 'flex', alignItems: 'flex-end', gap: 6, minHeight: 34, lineHeight: 1.4, margin: '0 0 6px', fontFamily: font, fontSize: 12 }}>
        {active === null
          ? <span style={{ color: colors.text.tertiary }}>{t.money.curveHint}</span>
          : <>
              <span style={{ color: colors.text.secondary, fontWeight: 600 }}>{dayLabel(active + 1)}</span>
              <strong dir="ltr" style={{ color: curve[active] >= 0 ? colors.money.income : colors.money.expense }}>{money(curve[active])}</strong>
            </>}
      </p>
      <div dir="ltr" role="slider" tabIndex={0} aria-label={t.money.curveLabel}
        aria-valuemin={1} aria-valuemax={n} aria-valuenow={shown + 1} aria-valuetext={valueText}
        onPointerDown={pick} onPointerMove={pick} onPointerLeave={e => { if (e.pointerType === 'mouse') setActive(null) }}
        onKeyDown={onKey} onBlur={() => setActive(null)}
        style={{ position: 'relative', height: H, touchAction: 'pan-y', cursor: 'crosshair', borderRadius: radius.sm, outlineOffset: 4 }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true" focusable="false"
          style={{ width: '100%', height: H, display: 'block', overflow: 'visible' }}>
          <defs>
            {/* Arriba del cero el verde calmo; abajo, el gris del texto */}
            <clipPath id={`${id}-up`}><rect x={-4} y={-4} width={W + 8} height={y0 + 4} /></clipPath>
            <clipPath id={`${id}-down`}><rect x={-4} y={y0} width={W + 8} height={H - y0 + 4} /></clipPath>
          </defs>
          <g clipPath={`url(#${id}-up)`}>
            <path d={area} fill={above} fillOpacity={0.16} />
            <path d={line} fill="none" stroke={above} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </g>
          <g clipPath={`url(#${id}-down)`}>
            <path d={area} fill={below} fillOpacity={0.14} />
            <path d={line} fill="none" stroke={below} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </g>
          {crossesZero && (
            <line x1={0} x2={W} y1={y0} y2={y0} stroke={colors.border.medium} strokeWidth={1} strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
          )}
          {active !== null && (
            <line x1={x(active)} x2={x(active)} y1={0} y2={H} stroke={colors.border.medium} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          )}
        </svg>
        {active !== null && (
          // El punto en HTML: dentro del SVG estirado quedaría ovalado
          <span aria-hidden="true" style={{
            position: 'absolute', left: `${(active / (n - 1)) * 100}%`, top: y(curve[active]), width: 10, height: 10,
            marginLeft: -5, marginTop: -5, borderRadius: radius.full, pointerEvents: 'none',
            background: curve[active] >= 0 ? above : below, boxShadow: `0 0 0 2px ${colors.surface.elevated}`,
          }} />
        )}
      </div>
      <div dir="ltr" aria-hidden="true" style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 6, fontFamily: font, fontSize: 11, color: colors.text.tertiary }}>
        <span>{dayLabel(1)}</span>
        <span>{dayLabel(n)}</span>
      </div>
    </div>
  )
}

// ── Últimos meses ────────────────────────────────────────────────────────────
const BAR_AREA = 88

function monthName(month: string, locale: string, style: 'long' | 'short') {
  const d = dayDate(month, 1)
  const thisYear = lifeNow().getFullYear()
  return d.toLocaleDateString(locale, { month: style, ...(style === 'long' && d.getFullYear() !== thisYear ? { year: 'numeric' as const } : {}) })
}

/**
 * Ingresos y gastos de los últimos meses en la moneda principal (las otras, aparte y sin sumar). Cada mes es un botón:
 * tocarlo lleva el selector ‹ mes › a ese mes. Un mes sin movimientos queda vacío (sin un "0" que culpe).
 */
export function MonthsHistoryCard({ history, currency, locale, selected, onPick }: {
  history: MonthHistory; currency: string; locale: string; selected: string; onPick: (month: string) => void
}) {
  const t = useLifeT()
  const [hover, setHover] = useState<string | null>(null)
  const money = (v: number) => formatMoney(v, currency, locale)
  const focus = history.months.find(m => m.month === (hover ?? selected)) ?? null
  const scale = history.max || 1
  const barH = (v: number) => (v > 0 ? Math.max(3, Math.round((v / scale) * BAR_AREA)) : 0)
  const label = (m: MonthTotals) => {
    const name = monthName(m.month, locale, 'long')
    return m.count ? t.money.historyMonth(name, money(m.income), money(m.expense)) : t.money.historyEmpty(name)
  }
  const swatch = (color: string) => (
    <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 3, background: color, display: 'inline-block' }} />
  )

  return (
    <LifeCard style={{ marginBottom: '12px' }}>
      <section aria-labelledby="money-history">
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', margin: '0 0 4px' }}>
          <h2 id="money-history" style={{ fontFamily: font, fontSize: '11px', fontWeight: 700, color: colors.text.tertiary, letterSpacing: '0.08em', margin: 0, textTransform: 'uppercase' }}>
            {t.money.historyTitle} · {currency}
          </h2>
          <span style={{ display: 'flex', gap: 12, fontFamily: font, fontSize: 11, color: colors.text.secondary }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>{swatch(colors.money.income)} {t.money.income}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>{swatch(colors.money.expenseMark)} {t.money.expense}</span>
          </span>
        </div>

        {/* Lo del mes elegido (o el que se señala): el dato exacto, sin tener que leer la barra */}
        <p aria-hidden="true" style={{ display: 'flex', alignItems: 'baseline', alignContent: 'flex-end', columnGap: 10, flexWrap: 'wrap', minHeight: 34, lineHeight: 1.4, margin: '0 0 10px', fontFamily: font, fontSize: 12 }}>
          {focus ? (
            <>
              <strong style={{ color: colors.text.primary, textTransform: 'capitalize' }}>{monthName(focus.month, locale, 'long')}</strong>
              {focus.count ? (
                <>
                  <b style={{ fontWeight: 400, color: colors.text.secondary }}>{t.money.income} <strong dir="ltr" style={{ color: colors.money.income }}>{money(focus.income)}</strong></b>
                  <b style={{ fontWeight: 400, color: colors.text.secondary }}>{t.money.expense} <strong dir="ltr" style={{ color: colors.money.expense }}>{money(focus.expense)}</strong></b>
                </>
              ) : <span style={{ color: colors.text.tertiary }}>{t.money.historyNone}</span>}
            </>
          ) : <span style={{ color: colors.text.tertiary }}>{t.money.historyHint}</span>}
        </p>

        <ul aria-label={t.money.historyChart} style={{
          listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 4,
          gridTemplateColumns: `repeat(${history.months.length}, minmax(0, 1fr))`,
        }}>
          {history.months.map(m => {
            const isSel = m.month === selected
            return (
              <li key={m.month} style={{ minWidth: 0 }}>
                <button type="button" onClick={() => onPick(m.month)} aria-pressed={isSel} aria-label={label(m)}
                  onPointerEnter={e => { if (e.pointerType === 'mouse') setHover(m.month) }}
                  onPointerLeave={() => setHover(null)} onFocus={() => setHover(m.month)} onBlur={() => setHover(null)}
                  style={{
                    width: '100%', minHeight: 44, padding: '8px 2px 6px', border: 'none', cursor: 'pointer',
                    borderRadius: radius.sm, background: isSel ? tint(colors.text.primary, 7) : 'transparent',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, fontFamily: font,
                  }}>
                  <span aria-hidden="true" style={{
                    height: BAR_AREA, width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 3,
                    borderBottom: `1px solid ${colors.border.medium}`,
                  }}>
                    {m.count > 0 && (
                      <>
                        <span className="life-chart-bar" style={{ width: 'min(12px, 40%)', height: barH(m.income), background: colors.money.income, borderRadius: '3px 3px 0 0' }} />
                        <span className="life-chart-bar" style={{ width: 'min(12px, 40%)', height: barH(m.expense), background: colors.money.expenseMark, borderRadius: '3px 3px 0 0' }} />
                      </>
                    )}
                  </span>
                  <span aria-hidden="true" style={{
                    fontSize: 11, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%',
                    fontWeight: isSel ? 800 : 600, color: isSel ? colors.text.primary : m.count ? colors.text.secondary : colors.text.tertiary,
                  }}>
                    {monthName(m.month, locale, 'short')}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>

        {history.others.length > 0 && (
          <p style={{ fontFamily: font, fontSize: 12, color: colors.text.tertiary, margin: '10px 0 0', lineHeight: 1.4 }}>
            {t.money.historyOthers(history.others.map(o => o.currency).join(', '))}
          </p>
        )}
      </section>
    </LifeCard>
  )
}
