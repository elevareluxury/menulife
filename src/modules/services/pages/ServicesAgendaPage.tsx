import { useState, useEffect, useMemo } from 'react'
import {
  ChevronLeft, ChevronRight, Plus, Calendar, LayoutGrid, CalendarDays,
  AlignLeft, SlidersHorizontal,
} from 'lucide-react'
import { useRestaurant } from '@/modules/menu/hooks/useRestaurant'
import { useTerminology } from '../hooks/useTerminology'
import { useServiceBookings } from '../hooks/useServiceBookings'
import { useServiceBlocks } from '../hooks/useServiceBlocks'
import { useServiceCatalog } from '../hooks/useServiceCatalog'
import { useServiceResources } from '../hooks/useServiceResources'
import { DayView } from '../components/agenda/DayView'
import { WeekView } from '../components/agenda/WeekView'
import { MonthView } from '../components/agenda/MonthView'
import { TimelineView } from '../components/agenda/TimelineView'
import { ContextualPanel } from '../components/agenda/ContextualPanel'
import { CreateBookingDrawer } from '../components/agenda/CreateBookingDrawer'
import { StatusBadge } from '../components/agenda/StatusBadge'
import type { AgendaView, ServiceBooking, BookingStatus, CreateBookingInput } from '../types/booking'
import {
  startOfWeekInTz, startOfMonthInTz, addDays,
  formatInTz, localTimeToUtc,
} from '../utils/timezone'
import { cn } from '@/lib/utils'

const VIEWS: Array<{ id: AgendaView; label: string; icon: React.ReactNode }> = [
  { id: 'day',      label: 'Día',      icon: <Calendar className="w-3.5 h-3.5" />    },
  { id: 'week',     label: 'Semana',   icon: <LayoutGrid className="w-3.5 h-3.5" />  },
  { id: 'month',    label: 'Mes',      icon: <CalendarDays className="w-3.5 h-3.5" /> },
  { id: 'timeline', label: 'Timeline', icon: <AlignLeft className="w-3.5 h-3.5" />   },
]

const STATUS_FILTERS: BookingStatus[] = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']

export function ServicesAgendaPage() {
  const { restaurant } = useRestaurant()
  const { term }       = useTerminology()
  const timezone       = restaurant?.timezone ?? 'America/Argentina/Buenos_Aires'

  const bookingsHook = useServiceBookings(restaurant?.id)
  const blocksHook   = useServiceBlocks(restaurant?.id)
  const catalogHook  = useServiceCatalog(restaurant?.id)
  const resourcesHook = useServiceResources(restaurant?.id)

  const [view, setView]               = useState<AgendaView>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selected, setSelected]       = useState<ServiceBooking | null>(null)
  const [showCreate, setShowCreate]   = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [createSlot, setCreateSlot]   = useState<{ date: Date; hour: number; minute: number } | null>(null)

  // Filters
  const [filterStatuses,   setFilterStatuses]   = useState<BookingStatus[]>([])
  const [filterResourceIds, setFilterResourceIds] = useState<string[]>([])

  // Compute visible date range for fetching
  const { rangeFrom, rangeTo } = useMemo(() => {
    let from: Date, to: Date
    if (view === 'day') {
      from = localTimeToUtc(currentDate, 0, 0, timezone)
      to   = localTimeToUtc(currentDate, 23, 59, timezone)
    } else if (view === 'week') {
      from = startOfWeekInTz(currentDate, timezone)
      to   = addDays(from, 7)
    } else if (view === 'month') {
      from = startOfMonthInTz(currentDate, timezone)
      to   = addDays(startOfMonthInTz(addDays(from, 35), timezone), 7)
    } else {
      // Timeline — same as day
      from = localTimeToUtc(currentDate, 0, 0, timezone)
      to   = localTimeToUtc(currentDate, 23, 59, timezone)
    }
    return { rangeFrom: from, rangeTo: to }
  }, [view, currentDate, timezone])

  useEffect(() => {
    bookingsHook.fetchRange(rangeFrom, rangeTo)
    blocksHook.fetchRange(rangeFrom, rangeTo)
  }, [rangeFrom, rangeTo])  // fetchRange is stable (useCallback)

  // Filtered bookings
  const displayedBookings = useMemo(() => {
    let list = bookingsHook.bookings
    if (filterStatuses.length > 0)
      list = list.filter(b => filterStatuses.includes(b.status))
    if (filterResourceIds.length > 0)
      list = list.filter(b => b.resources?.some(r => filterResourceIds.includes(r.resource_id)))
    return list
  }, [bookingsHook.bookings, filterStatuses, filterResourceIds])

  // Date label for header
  const dateLabel = useMemo(() => {
    if (view === 'day') {
      return formatInTz(currentDate, timezone, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    }
    if (view === 'week') {
      const ws = startOfWeekInTz(currentDate, timezone)
      const we = addDays(ws, 6)
      const fromLabel = formatInTz(ws, timezone, { day: 'numeric', month: 'short' })
      const toLabel   = formatInTz(we, timezone, { day: 'numeric', month: 'short', year: 'numeric' })
      return `${fromLabel} – ${toLabel}`
    }
    return formatInTz(currentDate, timezone, { month: 'long', year: 'numeric' })
  }, [view, currentDate, timezone])

  function navigate(dir: -1 | 1) {
    setCurrentDate(prev => {
      if (view === 'day')      return addDays(prev, dir)
      if (view === 'week')     return addDays(prev, dir * 7)
      if (view === 'timeline') return addDays(prev, dir)
      // month
      const d = new Date(prev)
      d.setMonth(d.getMonth() + dir)
      return d
    })
  }

  function goToday() { setCurrentDate(new Date()) }

  function handleSlotClick(date: Date, hour: number, minute: number) {
    setCreateSlot({ date, hour, minute })
    setShowCreate(true)
  }

  function handleDayClick(day: Date) {
    setCurrentDate(day)
    setView('day')
  }

  async function handleCreateBooking(input: CreateBookingInput): Promise<boolean> {
    const result = await bookingsHook.create(input)
    if (result) { setSelected(result); return true }
    return false
  }

  async function handleStatusChange(id: string, status: BookingStatus) {
    await bookingsHook.updateStatus(id, status)
    setSelected(prev => prev?.id === id ? { ...prev, status } : prev)
  }

  function handleReschedule(_booking: ServiceBooking) {
    setSelected(null)
    setCreateSlot(null)
    setShowCreate(true)
  }

  const weekStart = startOfWeekInTz(currentDate, timezone)

  // Stats bar for day / week views
  const todayStats = bookingsHook.todayStats(timezone)

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.16))] lg:h-[calc(100vh-theme(spacing.4))] -mx-4 -mt-2 lg:-mx-8 lg:-mt-8" style={{ background: '#0F1115' }}>

      {/* ── TOP BAR ──────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 px-4 lg:px-5 py-3 flex-shrink-0"
        style={{ background: '#13161C', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* Date navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={goToday}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hidden sm:block"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}
          >
            Hoy
          </button>
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg transition-all hover:bg-white/5" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => navigate(1)} className="p-1.5 rounded-lg transition-all hover:bg-white/5" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Date label */}
        <p className="text-sm font-semibold text-white capitalize flex-1 truncate">{dateLabel}</p>

        {/* View toggle */}
        <div className="hidden sm:flex items-center gap-0.5 rounded-xl p-0.5" style={{ background: 'rgba(255,255,255,0.06)' }}>
          {VIEWS.map(v => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
                view === v.id ? 'bg-brand text-white' : 'text-white/40 hover:text-white/70',
              )}
              style={{ backgroundColor: view === v.id ? '#F4705A' : undefined }}
            >
              {v.icon}
              <span className="hidden lg:block">{v.label}</span>
            </button>
          ))}
        </div>

        {/* Filters button */}
        <button
          onClick={() => setShowFilters(s => !s)}
          className="p-2 rounded-xl transition-all"
          style={{
            background: showFilters ? 'rgba(244,112,90,0.12)' : 'rgba(255,255,255,0.06)',
            color: showFilters ? '#F4705A' : 'rgba(255,255,255,0.5)',
          }}
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>

        {/* New booking */}
        <button
          onClick={() => { setCreateSlot(null); setShowCreate(true) }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
          style={{ background: '#F4705A' }}
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:block">Nueva</span>
        </button>
      </div>

      {/* ── MOBILE VIEW TABS ─────────────────────────────────────── */}
      <div className="flex sm:hidden gap-0.5 px-3 py-2 overflow-x-auto" style={{ background: '#13161C', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        {VIEWS.map(v => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0 transition-all"
            style={{
              background: view === v.id ? '#F4705A' : 'rgba(255,255,255,0.06)',
              color: view === v.id ? '#fff' : 'rgba(255,255,255,0.45)',
            }}
          >
            {v.icon}
            {v.label}
          </button>
        ))}
        <button onClick={goToday} className="ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)' }}>
          Hoy
        </button>
      </div>

      {/* ── STATS BAR (day/week/timeline) ────────────────────────── */}
      {view !== 'month' && (
        <div
          className="flex items-center gap-4 px-4 lg:px-5 py-2 flex-shrink-0 overflow-x-auto"
          style={{ background: '#0F1115', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
        >
          {[
            { label: 'Hoy',        value: todayStats.total,     color: 'rgba(255,255,255,0.5)' },
            { label: 'Pendientes', value: todayStats.pending,   color: '#F59E0B' },
            { label: 'Confirmados',value: todayStats.confirmed, color: '#3B82F6' },
            { label: 'Completados',value: todayStats.completed, color: '#22C55E' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-lg font-bold" style={{ color: s.color }}>{s.value}</span>
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── MAIN CONTENT ─────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* LEFT — Filters panel (desktop) */}
        {showFilters && (
          <div
            className="hidden lg:flex flex-col w-56 flex-shrink-0 overflow-y-auto"
            style={{ background: '#13161C', borderRight: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Filtros</p>
              <button onClick={() => { setFilterStatuses([]); setFilterResourceIds([]) }} className="text-[10px]" style={{ color: '#F4705A' }}>
                Limpiar
              </button>
            </div>

            {/* Status filters */}
            <div className="px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.25)' }}>Estado</p>
              <div className="space-y-1">
                {STATUS_FILTERS.map(s => {
                  const active = filterStatuses.includes(s)
                  return (
                    <button
                      key={s}
                      onClick={() => setFilterStatuses(prev => active ? prev.filter(x => x !== s) : [...prev, s])}
                      className="w-full text-left"
                    >
                      <StatusBadge status={s} size="sm" />
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Resource filters */}
            {resourcesHook.resources.length > 0 && (
              <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  {term('resources')}
                </p>
                <div className="space-y-1.5">
                  {resourcesHook.resources.filter(r => r.is_active).map(r => {
                    const active = filterResourceIds.includes(r.id)
                    return (
                      <button
                        key={r.id}
                        onClick={() => setFilterResourceIds(prev => active ? prev.filter(x => x !== r.id) : [...prev, r.id])}
                        className="w-full flex items-center gap-2 text-left px-2 py-1.5 rounded-lg transition-all"
                        style={{ background: active ? `${r.color}18` : 'transparent', border: `1px solid ${active ? r.color : 'transparent'}` }}
                      >
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: r.color }} />
                        <span className="text-xs text-white truncate">{r.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* CENTER — Calendar */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {bookingsHook.loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#F4705A', borderTopColor: 'transparent' }} />
            </div>
          ) : (
            <>
              {view === 'day' && (
                <DayView
                  date={currentDate}
                  bookings={displayedBookings}
                  blocks={blocksHook.blocks}
                  timezone={timezone}
                  selectedId={selected?.id}
                  onBookingClick={setSelected}
                  onSlotClick={handleSlotClick}
                />
              )}
              {view === 'week' && (
                <WeekView
                  weekStart={weekStart}
                  bookings={displayedBookings}
                  blocks={blocksHook.blocks}
                  timezone={timezone}
                  selectedId={selected?.id}
                  onBookingClick={setSelected}
                  onSlotClick={handleSlotClick}
                />
              )}
              {view === 'month' && (
                <MonthView
                  date={currentDate}
                  bookings={displayedBookings}
                  blocks={blocksHook.blocks}
                  timezone={timezone}
                  selectedId={selected?.id}
                  onBookingClick={setSelected}
                  onDayClick={handleDayClick}
                />
              )}
              {view === 'timeline' && (
                <TimelineView
                  date={currentDate}
                  bookings={displayedBookings}
                  blocks={blocksHook.blocks}
                  resources={resourcesHook.resources}
                  timezone={timezone}
                  selectedId={selected?.id}
                  onBookingClick={setSelected}
                  onSlotClick={handleSlotClick}
                />
              )}
            </>
          )}
        </div>

        {/* RIGHT — Contextual panel (desktop) */}
        <div
          className="hidden lg:flex flex-col w-72 flex-shrink-0 overflow-hidden"
          style={{ background: '#13161C', borderLeft: '1px solid rgba(255,255,255,0.06)' }}
        >
          <ContextualPanel
            booking={selected}
            timezone={timezone}
            onClose={() => setSelected(null)}
            onStatusChange={handleStatusChange}
            onReschedule={handleReschedule}
          />
        </div>
      </div>

      {/* ── MOBILE — Booking detail bottom sheet ─────────────────── */}
      {selected && (
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 rounded-t-2xl overflow-hidden" style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.08)', maxHeight: '65vh' }}>
          <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-1" style={{ background: 'rgba(255,255,255,0.2)' }} />
          <div style={{ maxHeight: 'calc(65vh - 20px)', overflowY: 'auto' }}>
            <ContextualPanel
              booking={selected}
              timezone={timezone}
              onClose={() => setSelected(null)}
              onStatusChange={handleStatusChange}
              onReschedule={handleReschedule}
            />
          </div>
        </div>
      )}

      {/* ── Mobile backdrop when panel open ──────────────────────── */}
      {selected && (
        <div className="lg:hidden fixed inset-0 z-30" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setSelected(null)} />
      )}

      {/* ── CREATE BOOKING DRAWER ─────────────────────────────────── */}
      {showCreate && (
        <CreateBookingDrawer
          restaurantId={restaurant?.id ?? ''}
          timezone={timezone}
          catalogItems={catalogHook.items}
          resources={resourcesHook.resources}
          initialDate={createSlot?.date}
          initialHour={createSlot?.hour ?? 10}
          initialMinute={createSlot?.minute ?? 0}
          onClose={() => { setShowCreate(false); setCreateSlot(null) }}
          onCreated={handleCreateBooking}
        />
      )}
    </div>
  )
}
