import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, Globe, DollarSign, ShoppingCart, Bell, X, Receipt } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useMenuStore } from '@/store/menuStore'
import { useCartStore } from '@/store/cartStore'
import { formatPrice } from '@/lib/utils'
import { CartSheet } from '../components/CartSheet'
import { CheckoutModal } from '../components/CheckoutModal'
import { ItemDetailSheet } from '../components/ItemDetailSheet'
import { ActiveOrderBanner } from '@/components/tracking/ActiveOrderBanner'
import toast from 'react-hot-toast'
import type { Restaurant, MenuSection, MenuItem } from '@/types'

// ─── Tag labels ────────────────────────────────────────────────────────────────

const TAG_ICONS: Record<string, string> = {
  vegano: '🌱',
  vegetariano: '🥗',
  sin_tacc: '🌾',
  picante: '🌶️',
  recomendado: '⭐',
  nuevo: '✨',
}

// ─── Item card ─────────────────────────────────────────────────────────────────

function ItemCard({
  item,
  language,
  currency,
  onTap,
}: {
  item: MenuItem
  language: 'ES' | 'EN'
  currency: 'ARS' | 'USD'
  onTap: (item: MenuItem) => void
}) {
  const { addItem, items: cartItems, updateQuantity } = useCartStore()
  const cartItem = cartItems.find(i => i.id === item.id)
  const cartQty = cartItem?.quantity ?? 0

  const name  = language === 'EN' && item.name_en        ? item.name_en        : item.name
  const desc  = language === 'EN' && item.description_en ? item.description_en : item.description
  const price = currency === 'ARS' ? item.price_ars : item.price_usd

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation()
    addItem({
      id:        item.id,
      name:      item.name,
      name_en:   item.name_en,
      price_ars: item.price_ars,
      price_usd: item.price_usd,
      image_url: item.image_url,
    })
  }

  return (
    <button
      onClick={() => onTap(item)}
      className="w-full text-left flex gap-3 p-3 rounded-2xl transition-colors active:opacity-80"
      style={{
        backgroundColor: 'var(--menu-card, #111111)',
        border: '1px solid var(--menu-border, rgba(255,255,255,0.06))',
      }}
    >
      {/* Thumbnail */}
      <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 relative">
        {item.image_url ? (
          <>
            <img
              src={item.image_url}
              alt={name}
              loading="lazy"
              className="w-full h-full object-cover"
            />
            {cartQty > 0 && (
              <div
                className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                style={{ background: 'var(--menu-accent-gradient, linear-gradient(135deg,#FF6B6B,#FF8E53))' }}
              >
                {cartQty}
              </div>
            )}
          </>
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--menu-card-elevated, #1A1A1A)' }}
          >
            <span className="text-3xl" style={{ filter: 'grayscale(1)', opacity: 0.18 }}>🍽️</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div>
          <p
            className="text-[1rem] font-bold leading-tight line-clamp-1"
            style={{ color: 'var(--menu-text-primary, #F5F5F5)' }}
          >
            {name}
          </p>
          {desc && (
            <p
              className="text-[0.8125rem] line-clamp-2 mt-0.5 leading-snug"
              style={{ color: 'var(--menu-text-muted, #555555)' }}
            >
              {desc}
            </p>
          )}
        </div>

        {/* Price + tags + add button */}
        <div className="flex items-end justify-between mt-2">
          <div>
            <p
              className="text-[1.0625rem] font-bold"
              style={{ color: 'var(--menu-accent, #FF6B6B)' }}
            >
              {formatPrice(price, currency)}
            </p>
            {item.tags.length > 0 && (
              <div className="flex gap-1 mt-1">
                {item.tags.slice(0, 3).map(tag => (
                  <span key={tag} className="text-xs" style={{ color: 'var(--menu-text-muted, #555555)' }}>
                    {TAG_ICONS[tag] ?? tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {cartQty > 0 ? (
            <div
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl"
              style={{ backgroundColor: 'rgba(255,107,107,0.12)' }}
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={e => { e.stopPropagation(); updateQuantity(item.id, cartQty - 1) }}
                className="w-5 h-5 flex items-center justify-center rounded-md text-xs font-bold"
                style={{ color: 'var(--menu-accent, #FF6B6B)' }}
              >
                −
              </button>
              <span
                className="text-sm font-bold w-4 text-center"
                style={{ color: 'var(--menu-accent, #FF6B6B)' }}
              >
                {cartQty}
              </span>
              <motion.button
                whileTap={{ scale: 0.82 }}
                transition={{ type: 'spring', stiffness: 500, damping: 12 }}
                onClick={e => { e.stopPropagation(); updateQuantity(item.id, cartQty + 1) }}
                className="w-5 h-5 flex items-center justify-center rounded-md text-xs font-bold"
                style={{ color: 'var(--menu-accent, #FF6B6B)' }}
              >
                +
              </motion.button>
            </div>
          ) : (
            <motion.button
              whileTap={{ scale: 0.82 }}
              transition={{ type: 'spring', stiffness: 500, damping: 12 }}
              onClick={handleAdd}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-white font-bold text-lg leading-none"
              style={{ background: 'var(--menu-accent-gradient, linear-gradient(135deg,#FF6B6B,#FF8E53))' }}
            >
              +
            </motion.button>
          )}
        </div>
      </div>
    </button>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function PublicMenu() {
  const { slug } = useParams()
  const { currency, language, setCurrency, setLanguage } = useMenuStore()
  const { getItemCount, getTotal } = useCartStore()
  const itemCount = getItemCount()

  const [restaurant, setRestaurant]       = useState<Restaurant | null>(null)
  const [sections, setSections]           = useState<MenuSection[]>([])
  const [items, setItems]                 = useState<MenuItem[]>([])
  const [loading, setLoading]             = useState(true)
  const [searchQuery, setSearchQuery]     = useState('')
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)

  const [isCartOpen,      setIsCartOpen]      = useState(false)
  const [isCheckoutOpen,  setIsCheckoutOpen]  = useState(false)
  const [detailItem,      setDetailItem]      = useState<MenuItem | null>(null)
  const [isDetailOpen,    setIsDetailOpen]    = useState(false)

  const [callingWaiter, setCallingWaiter]     = useState(false)
  const [requestingBill, setRequestingBill]   = useState(false)
  const [billRequested, setBillRequested]     = useState(false)
  const mesaParam = new URLSearchParams(window.location.search).get('mesa')
  const prevItemCount = useRef(itemCount)

  // Cart icon wiggle when item added
  const [cartWiggle, setCartWiggle] = useState(false)
  useEffect(() => {
    if (itemCount > prevItemCount.current) {
      setCartWiggle(true)
      setTimeout(() => setCartWiggle(false), 600)
    }
    prevItemCount.current = itemCount
  }, [itemCount])

  // ── Fetch data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!slug) { setLoading(false); return }

    async function fetchData() {
      try {
        const { data: rest, error: restErr } = await supabase
          .from('restaurants')
          .select('*')
          .eq('slug', slug as string)
          .eq('is_active', true)
          .single()
        if (restErr) throw restErr
        setRestaurant(rest as Restaurant)

        const { data: secs } = await supabase
          .from('menu_sections')
          .select('*')
          .eq('restaurant_id', rest.id)
          .eq('is_active', true)
          .order('sort_order')
        setSections((secs as MenuSection[]) ?? [])

        const { data: itms } = await supabase
          .from('menu_items')
          .select('*')
          .eq('restaurant_id', rest.id)
          .order('sort_order')
        setItems((itms as MenuItem[]) ?? [])
      } catch (err) {
        console.error('Error loading menu:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [slug])

  // ── Bill request ─────────────────────────────────────────────────────────────
  const handleRequestBill = async () => {
    if (!restaurant || !mesaParam || requestingBill || billRequested) return
    setRequestingBill(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any
      const { data: tableData } = await db
        .from('tables')
        .select('id, waiter_id')
        .eq('restaurant_id', restaurant.id)
        .eq('table_number', mesaParam)
        .maybeSingle()
      if (!tableData) { toast.error(language === 'ES' ? 'Mesa no encontrada' : 'Table not found'); return }
      const { error } = await db.from('waiter_calls').insert({
        restaurant_id: restaurant.id,
        table_id: tableData.id,
        waiter_id: tableData.waiter_id ?? null,
        type: 'bill_request',
      })
      if (error) throw error
      setBillRequested(true)
      toast.success(language === 'ES' ? '¡Cuenta solicitada! El mozo se acerca.' : 'Bill requested!')
    } catch {
      toast.error(language === 'ES' ? 'No pudimos enviar la solicitud' : 'Could not send request')
    } finally {
      setRequestingBill(false)
    }
  }

  // ── Waiter call ─────────────────────────────────────────────────────────────
  const handleCallWaiter = async () => {
    if (!restaurant || !mesaParam || callingWaiter) return
    setCallingWaiter(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any
      const { data: tableData } = await db
        .from('tables')
        .select('id, waiter_id')
        .eq('restaurant_id', restaurant.id)
        .eq('table_number', mesaParam)
        .maybeSingle()
      if (!tableData?.waiter_id) return
      const { error } = await db.from('waiter_calls').insert({
        restaurant_id: restaurant.id,
        table_id: tableData.id,
        waiter_id: tableData.waiter_id,
      })
      if (error) throw error
      toast.success(language === 'ES' ? '¡Mozo notificado!' : 'Waiter notified!')
    } catch {
      toast.error(language === 'ES' ? 'No pudimos llamar al mozo, intentá de nuevo' : 'Could not reach waiter, please try again')
    } finally {
      setCallingWaiter(false)
    }
  }

  // ── Filtering ───────────────────────────────────────────────────────────────
  const toggleFilter = (f: string) =>
    setActiveFilters(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])

  const filteredItems = items.filter(item => {
    if (!item.is_available) return false
    if (activeSectionId && item.section_id !== activeSectionId) return false
    const q = searchQuery.toLowerCase()
    const matchSearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      (item.name_en?.toLowerCase().includes(q) ?? false) ||
      (item.description?.toLowerCase().includes(q) ?? false)
    const matchFilters =
      activeFilters.length === 0 || activeFilters.every(f => item.tags.includes(f))
    return matchSearch && matchFilters
  })

  // ── Open detail sheet ───────────────────────────────────────────────────────
  const openDetail = (item: MenuItem) => {
    setDetailItem(item)
    setIsDetailOpen(true)
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="public-menu min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'var(--menu-accent, #FF6B6B)', borderTopColor: 'transparent' }}
          />
          <p className="text-sm" style={{ color: 'var(--menu-text-muted, #555555)' }}>
            Cargando menú...
          </p>
        </div>
      </div>
    )
  }

  if (!restaurant) {
    return (
      <div className="public-menu min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-5xl mb-3">🍽️</p>
          <p style={{ color: 'var(--menu-text-secondary, #888888)' }}>
            Restaurante no encontrado
          </p>
        </div>
      </div>
    )
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const filters = [
    { key: 'vegano',      label: '🌱 Vegano'      },
    { key: 'vegetariano', label: '🥗 Vegetariano' },
    { key: 'sin_tacc',    label: '🌾 Sin TACC'    },
  ]

  // Groups for "Todos" view
  const sectionGroups = sections
    .map(sec => ({
      section: sec,
      items: filteredItems.filter(i => i.section_id === sec.id),
    }))
    .filter(g => g.items.length > 0)

  const restName = restaurant.name

  return (
    <div className="public-menu min-h-screen" style={{ backgroundColor: 'var(--menu-bg, #0D0D0D)' }}>

      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-30"
        style={{
          backgroundColor: 'rgba(13,13,13,0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--menu-border, rgba(255,255,255,0.06))',
        }}
      >
        {/* Row 1: Logo + name + toggles */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {restaurant.logo_url && (
              <img
                src={restaurant.logo_url}
                alt={restName}
                className="w-8 h-8 rounded-xl object-cover flex-shrink-0"
              />
            )}
            <h1
              className="font-bold truncate"
              style={{ fontSize: '1.125rem', color: 'var(--menu-text-primary, #F5F5F5)' }}
            >
              {restName}
            </h1>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => setLanguage(language === 'ES' ? 'EN' : 'ES')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-opacity active:opacity-60"
              style={{
                backgroundColor: 'var(--menu-card-elevated, #1A1A1A)',
                color: 'var(--menu-text-secondary, #888888)',
              }}
            >
              <Globe className="w-3 h-3" />
              {language}
            </button>
            <button
              onClick={() => setCurrency(currency === 'ARS' ? 'USD' : 'ARS')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-opacity active:opacity-60"
              style={{
                backgroundColor: 'var(--menu-card-elevated, #1A1A1A)',
                color: 'var(--menu-text-secondary, #888888)',
              }}
            >
              <DollarSign className="w-3 h-3" />
              {currency}
            </button>
          </div>
        </div>

        {/* Row 2: Search */}
        <div className="px-4 pb-2">
          <div
            className="flex items-center gap-2 px-3 py-2.5 rounded-2xl"
            style={{
              backgroundColor: 'var(--menu-card-elevated, #1A1A1A)',
              border: '1px solid var(--menu-border, rgba(255,255,255,0.06))',
            }}
          >
            <Search className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--menu-text-muted, #555555)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={language === 'ES' ? 'Buscar platos...' : 'Search dishes...'}
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: 'var(--menu-text-primary, #F5F5F5)', fontSize: '16px' }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}>
                <X className="w-4 h-4" style={{ color: 'var(--menu-text-muted, #555555)' }} />
              </button>
            )}
          </div>
        </div>

        {/* Row 3: Filter pills */}
        <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-hide">
          {filters.map(({ key, label }) => {
            const active = activeFilters.includes(key)
            return (
              <button
                key={key}
                onClick={() => toggleFilter(key)}
                className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 transition-all active:scale-95"
                style={{
                  backgroundColor: active ? 'rgba(255,107,107,0.15)' : 'var(--menu-card-elevated, #1A1A1A)',
                  color: active ? 'var(--menu-accent, #FF6B6B)' : 'var(--menu-text-secondary, #888888)',
                  border: `1px solid ${active ? 'rgba(255,107,107,0.3)' : 'var(--menu-border, rgba(255,255,255,0.06))'}`,
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      </header>

      {/* ── Category tabs ──────────────────────────────────────────────────── */}
      {sections.length > 1 && (
        <div
          className="sticky z-20 flex gap-1 overflow-x-auto px-4 py-2 scrollbar-hide"
          style={{
            top: 'auto',
            backgroundColor: 'rgba(13,13,13,0.92)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid var(--menu-border, rgba(255,255,255,0.06))',
          }}
        >
          {/* "Todos" tab */}
          <button
            onClick={() => setActiveSectionId(null)}
            className="px-4 py-2 rounded-xl text-[0.9375rem] font-semibold whitespace-nowrap flex-shrink-0 transition-all relative"
            style={{
              color: activeSectionId === null
                ? 'var(--menu-accent, #FF6B6B)'
                : 'var(--menu-text-secondary, #888888)',
            }}
          >
            {language === 'ES' ? 'Todos' : 'All'}
            {activeSectionId === null && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                style={{ backgroundColor: 'var(--menu-accent, #FF6B6B)' }}
              />
            )}
          </button>

          {sections.map(sec => {
            const label = language === 'EN' && sec.name_en ? sec.name_en : sec.name
            const isActive = activeSectionId === sec.id
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSectionId(isActive ? null : sec.id)}
                className="px-4 py-2 rounded-xl text-[0.9375rem] font-semibold whitespace-nowrap flex-shrink-0 transition-all relative"
                style={{
                  color: isActive
                    ? 'var(--menu-accent, #FF6B6B)'
                    : 'var(--menu-text-secondary, #888888)',
                }}
              >
                {label}
                {isActive && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                    style={{ backgroundColor: 'var(--menu-accent, #FF6B6B)' }}
                  />
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* ── Items ──────────────────────────────────────────────────────────── */}
      <main
        className="px-4 py-4 space-y-6"
        style={{ paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}
      >
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <p className="text-4xl">🔍</p>
            <p className="text-sm" style={{ color: 'var(--menu-text-secondary, #888888)' }}>
              {language === 'ES' ? 'No se encontraron platos' : 'No dishes found'}
            </p>
          </div>
        ) : activeSectionId !== null ? (
          /* Single section */
          <motion.div
            key={activeSectionId}
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.05 } }, hidden: {} }}
            className="space-y-3"
          >
            {filteredItems.map(item => (
              <motion.div
                key={item.id}
                variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
              >
                <ItemCard
                  item={item}
                  language={language}
                  currency={currency}
                  onTap={openDetail}
                />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          /* All sections grouped */
          sectionGroups.map(({ section, items: sItems }) => (
            <div key={section.id}>
              <h2
                className="text-base font-bold mb-3"
                style={{ color: 'var(--menu-text-secondary, #888888)', letterSpacing: '0.04em' }}
              >
                {(language === 'EN' && section.name_en ? section.name_en : section.name).toUpperCase()}
              </h2>
              <motion.div
                initial="hidden"
                animate="show"
                variants={{ show: { transition: { staggerChildren: 0.05 } }, hidden: {} }}
                className="space-y-3"
              >
                {sItems.map(item => (
                  <motion.div
                    key={item.id}
                    variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
                  >
                    <ItemCard
                      item={item}
                      language={language}
                      currency={currency}
                      onTap={openDetail}
                    />
                  </motion.div>
                ))}
              </motion.div>
            </div>
          ))
        )}
      </main>

      {/* ── Pedir la cuenta (only when mesa param exists) ─────────────────── */}
      {mesaParam && (
        <button
          onClick={handleRequestBill}
          disabled={requestingBill || billRequested}
          className="fixed bottom-44 right-4 z-20 w-12 h-12 flex items-center justify-center rounded-2xl transition-all active:opacity-60 disabled:opacity-50"
          style={{
            backgroundColor: billRequested ? 'rgba(245,158,11,0.15)' : 'var(--menu-card-elevated, #1A1A1A)',
            border: `1px solid ${billRequested ? '#F59E0B' : 'var(--menu-border, rgba(255,255,255,0.06))'}`,
          }}
          title={language === 'ES' ? 'Pedir la cuenta' : 'Request bill'}
        >
          <Receipt
            className={`w-5 h-5 ${requestingBill ? 'animate-pulse' : ''}`}
            style={{ color: billRequested ? '#F59E0B' : 'var(--menu-text-secondary, #888888)' }}
          />
        </button>
      )}

      {/* ── Bell button (only when mesa param exists) ──────────────────────── */}
      {mesaParam && (
        <button
          onClick={handleCallWaiter}
          disabled={callingWaiter}
          className="fixed bottom-28 right-4 z-20 w-12 h-12 flex items-center justify-center rounded-2xl transition-opacity active:opacity-60 disabled:opacity-50"
          style={{
            backgroundColor: 'var(--menu-card-elevated, #1A1A1A)',
            border: '1px solid var(--menu-border, rgba(255,255,255,0.06))',
          }}
          title="Llamar al mozo"
        >
          <Bell
            className={`w-5 h-5 ${callingWaiter ? 'animate-pulse' : ''}`}
            style={{ color: 'var(--menu-text-secondary, #888888)' }}
          />
        </button>
      )}

      {/* ── Floating cart button ───────────────────────────────────────────── */}
      <AnimatePresence>
        {itemCount > 0 && (
          <motion.button
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
            onClick={() => setIsCartOpen(true)}
            className="fixed left-1/2 z-30 flex items-center gap-3 rounded-2xl font-semibold text-white text-sm"
            style={{
              bottom: 'calc(20px + env(safe-area-inset-bottom))',
              transform: 'translateX(-50%)',
              padding: '16px 24px',
              background: 'linear-gradient(135deg, #FF6B6B, #FF8E53)',
              boxShadow: '0 8px 32px rgba(255,107,107,0.4)',
              whiteSpace: 'nowrap',
            }}
          >
            <motion.span
              animate={cartWiggle ? { rotate: [0, -15, 15, -10, 10, 0] } : {}}
              transition={{ duration: 0.5 }}
            >
              <ShoppingCart className="w-5 h-5" />
            </motion.span>
            <span>
              {language === 'ES' ? 'Ver pedido' : 'View order'} ({itemCount})
            </span>
            <span className="opacity-80">·</span>
            <span>{formatPrice(getTotal(currency), currency)}</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Sheets & modals ────────────────────────────────────────────────── */}
      <ItemDetailSheet
        item={detailItem}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
      />

      <CartSheet
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onCheckout={() => { setIsCartOpen(false); setIsCheckoutOpen(true) }}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        restaurantId={restaurant.id}
        onSuccess={() => setIsCheckoutOpen(false)}
        slug={slug}
        restaurantName={restaurant.name}
      />

      {slug && <ActiveOrderBanner slug={slug} />}
    </div>
  )
}
