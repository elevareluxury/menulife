import { useState, useEffect, useRef, useCallback } from 'react'
import { Activity } from 'lucide-react'
import { useCustomerTimeline } from '../../hooks/useCustomerTimeline'
import { TimelineEventCard } from './TimelineEventCard'
import { CATEGORY_FILTERS } from '../../timeline/timelineEvents'
import type { TimelineCategory } from '../../timeline/timelineEvents'
import type { TimelineEvent } from '../../hooks/useCustomerTimeline'
import { getLocalDateStr } from '../../utils/timezone'

interface CustomerTimelineProps {
  customerId:   string
  restaurantId: string
  timezone:     string
}

function formatDateLabel(dateStr: string, timezone: string): string {
  const todayStr     = getLocalDateStr(new Date(), timezone)
  const yesterdayStr = getLocalDateStr(new Date(Date.now() - 86_400_000), timezone)
  if (dateStr === todayStr)     return 'Hoy'
  if (dateStr === yesterdayStr) return 'Ayer'
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  const now = new Date()
  return new Intl.DateTimeFormat('es-AR', {
    day:   'numeric',
    month: 'long',
    ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  }).format(d)
}

function groupByDate(
  events: TimelineEvent[],
  timezone: string,
): Array<{ dateStr: string; label: string; events: TimelineEvent[] }> {
  const map = new Map<string, TimelineEvent[]>()
  for (const ev of events) {
    const key = getLocalDateStr(ev.event_date, timezone)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(ev)
  }
  return Array.from(map.entries()).map(([dateStr, evs]) => ({
    dateStr,
    label: formatDateLabel(dateStr, timezone),
    events: evs,
  }))
}

export function CustomerTimeline({ customerId, restaurantId, timezone }: CustomerTimelineProps) {
  const hook           = useCustomerTimeline(restaurantId)
  const [category, setCategory] = useState<TimelineCategory>('all')
  const sentinelRef    = useRef<HTMLDivElement>(null)

  useEffect(() => {
    hook.fetchFirst(customerId, category)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, restaurantId, category])

  const onLoadMore = useCallback(() => {
    if (hook.hasMore && !hook.loadingMore) {
      hook.fetchMore(customerId, category)
    }
  }, [hook, customerId, category])

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hook.hasMore) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) onLoadMore() },
      { rootMargin: '200px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hook.hasMore, onLoadMore])

  const groups = groupByDate(hook.events, timezone)

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Header + filtros */}
      <div
        className="px-5 py-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <h2 className="text-sm font-bold text-white mb-3">Historial</h2>
        <div className="flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
          {CATEGORY_FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setCategory(f.id)}
              className="flex-shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all"
              style={{
                background: category === f.id ? '#F4705A' : 'rgba(255,255,255,0.06)',
                color:      category === f.id ? '#fff'    : 'rgba(255,255,255,0.45)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido */}
      <div className="px-5 py-4">
        {hook.loading ? (
          <div className="flex justify-center py-10">
            <div
              className="w-5 h-5 border-2 rounded-full animate-spin"
              style={{ borderColor: 'rgba(255,255,255,0.08)', borderTopColor: '#F4705A' }}
            />
          </div>
        ) : hook.events.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
              style={{ background: 'rgba(244,112,90,0.08)', border: '1px solid rgba(244,112,90,0.15)' }}
            >
              <Activity className="w-5 h-5" style={{ color: 'rgba(244,112,90,0.4)' }} />
            </div>
            <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Sin actividad aún
            </p>
            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>
              Los eventos aparecerán aquí automáticamente
            </p>
          </div>
        ) : (
          <>
            {groups.map(group => {
              const allEvents = group.events
              return (
                <div key={group.dateStr} className="mb-4 last:mb-0">
                  {/* Date header */}
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className="text-[10px] font-bold uppercase tracking-widest capitalize"
                      style={{ color: 'rgba(255,255,255,0.3)' }}
                    >
                      {group.label}
                    </span>
                    <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
                  </div>

                  {/* Events */}
                  {allEvents.map((ev, idx) => (
                    <TimelineEventCard
                      key={ev.id}
                      event={ev}
                      isLast={idx === allEvents.length - 1}
                      timezone={timezone}
                    />
                  ))}
                </div>
              )
            })}

            {/* Infinite scroll sentinel */}
            {hook.hasMore && (
              <div ref={sentinelRef} className="flex justify-center pt-2 pb-1">
                {hook.loadingMore && (
                  <div
                    className="w-4 h-4 border-2 rounded-full animate-spin"
                    style={{ borderColor: 'rgba(255,255,255,0.08)', borderTopColor: '#F4705A' }}
                  />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
