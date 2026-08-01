import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useScroll, useMotionValueEvent } from 'framer-motion'
import { Search, Globe, DollarSign, ShoppingCart, Bell, X, Receipt, ArrowLeft, CalendarDays } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useMenuStore } from '@/store/menuStore'
import { useCartStore } from '@/store/cartStore'
import { CartSheet } from '../components/CartSheet'
import { CheckoutModal } from '../components/CheckoutModal'
import { ItemDetailSheet } from '../components/ItemDetailSheet'
import { ActiveOrderBanner } from '@/components/tracking/ActiveOrderBanner'
import toast from 'react-hot-toast'
import type { Restaurant, MenuSection, MenuItem, OrderTypeData, DeliveryZone } from '@/types'

type MenuPhase = 'delivery-form' | 'takeaway-form' | 'menu'

function calculateDeliveryFee(restaurant: Restaurant, orderTotal: number, zone?: string): number {
  if (restaurant.delivery_fee_type === 'fixed') return restaurant.delivery_fee_value ?? 0
  if (restaurant.delivery_fee_type === 'percentage') return (orderTotal * (restaurant.delivery_fee_value ?? 0)) / 100
  if (restaurant.delivery_fee_type === 'zone' && zone) {
    const zones = Array.isArray(restaurant.delivery_zones) ? (restaurant.delivery_zones as DeliveryZone[]) : []
    const selected = zones.find(z => z.name === zone)
    return selected?.fee ?? 0
  }
  return 0
}


function DeliveryFormScreen({
  restaurant,
  onBack,
  onSubmit,
}: {
  restaurant: Restaurant
  onBack: () => void
  onSubmit: (data: OrderTypeData) => void
}) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [addressExtra, setAddressExtra] = useState('')
  const [zone, setZone] = useState('')
  const [notes, setNotes] = useState('')
  const accentColor = restaurant.menu_accent_color ?? '#F4705A'
  const zones = Array.isArray(restaurant.delivery_zones) ? (restaurant.delivery_zones as DeliveryZone[]) : []
  const deliveryFee = calculateDeliveryFee(restaurant, 0, zone)

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', borderRadius: '14px',
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.05)',
    color: 'var(--menu-text-primary, #f5f5f5)',
    fontSize: '15px', outline: 'none',
    fontFamily: 'var(--font-jakarta)',
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !phone || !address) { toast.error('Completá todos los campos requeridos'); return }
    if (zones.length > 0 && !zone) { toast.error('Seleccioná una zona de entrega'); return }
    onSubmit({
      type: 'delivery',
      customerName: name,
      customerPhone: phone,
      customerAddress: address,
      customerAddressExtra: addressExtra,
      deliveryFee,
      zone: zone || undefined,
      notes,
    })
  }

  return (
    <div className="public-menu min-h-screen" style={{ '--menu-accent': accentColor } as React.CSSProperties}>
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3" style={{ background: 'rgba(15,17,21,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--menu-border)' }}>
        <button onClick={onBack} style={{ color: 'var(--menu-text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
          <ArrowLeft size={20} />
        </button>
        <h2 className="font-bold text-base" style={{ color: 'var(--menu-text-primary)', fontFamily: 'var(--font-syne)' }}>🛵 Delivery</h2>
      </div>

      <form onSubmit={handleSubmit} className="px-4 py-5 space-y-4 max-w-md mx-auto" style={{ paddingBottom: '100px' }}>
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--menu-text-muted)' }}>Tus datos</p>

        <div>
          <label className="block text-xs mb-1.5" style={{ color: 'var(--menu-text-muted)' }}>Nombre completo *</label>
          <input style={inputStyle} placeholder="Juan Pérez" value={name} onChange={e => setName(e.target.value)} required />
        </div>

        <div>
          <label className="block text-xs mb-1.5" style={{ color: 'var(--menu-text-muted)' }}>Teléfono / WhatsApp *</label>
          <input style={inputStyle} type="tel" placeholder="+54 9 11 1234-5678" value={phone} onChange={e => setPhone(e.target.value)} required />
        </div>

        <div>
          <label className="block text-xs mb-1.5" style={{ color: 'var(--menu-text-muted)' }}>Dirección de entrega *</label>
          <input style={inputStyle} placeholder="Av. Corrientes 1234" value={address} onChange={e => setAddress(e.target.value)} required />
        </div>

        <div>
          <label className="block text-xs mb-1.5" style={{ color: 'var(--menu-text-muted)' }}>Piso / Dpto / Referencias</label>
          <input style={inputStyle} placeholder="Piso 3, Dpto B" value={addressExtra} onChange={e => setAddressExtra(e.target.value)} />
        </div>

        {zones.length > 0 && (
          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--menu-text-muted)' }}>Zona *</label>
            <select style={{ ...inputStyle }} value={zone} onChange={e => setZone(e.target.value)} required>
              <option value="">Seleccionar zona</option>
              {zones.map(z => (
                <option key={z.name} value={z.name}>{z.name} — hasta {z.max_km} km — ${z.fee.toLocaleString('es-AR')}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs mb-1.5" style={{ color: 'var(--menu-text-muted)' }}>Notas para el repartidor</label>
          <textarea style={{ ...inputStyle, resize: 'none', height: '80px' } as React.CSSProperties} placeholder="Timbre roto, llamar por teléfono..." value={notes} onChange={e => setNotes(e.target.value)} />
        </div>

        {/* Summary */}
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', padding: '14px 16px' }}>
          <p className="text-sm" style={{ color: 'var(--menu-text-secondary)' }}>
            ⏱️ Tiempo estimado: ~{restaurant.delivery_time_estimate ?? 30} min
          </p>
          {restaurant.delivery_fee_type !== 'zone' && (
            <p className="text-sm mt-1" style={{ color: 'var(--menu-text-secondary)' }}>
              🛵 Costo de envío: {deliveryFee === 0 ? 'Gratis' : `$${deliveryFee.toLocaleString('es-AR')}`}
            </p>
          )}
          {zone && zones.length > 0 && (
            <p className="text-sm mt-1" style={{ color: 'var(--menu-text-secondary)' }}>
              🛵 Costo de envío: ${calculateDeliveryFee(restaurant, 0, zone).toLocaleString('es-AR')}
            </p>
          )}
          {(restaurant.delivery_min_order ?? 0) > 0 && (
            <p className="text-xs mt-1" style={{ color: 'var(--menu-text-muted)' }}>
              Pedido mínimo: ${(restaurant.delivery_min_order ?? 0).toLocaleString('es-AR')}
            </p>
          )}
        </div>

        <button
          type="submit"
          className="w-full py-4 rounded-2xl font-semibold text-white text-base"
          style={{ background: `linear-gradient(135deg, ${accentColor}, #F09040)`, boxShadow: `0 8px 24px ${accentColor}50` }}
        >
          Continuar al menú →
        </button>
      </form>
    </div>
  )
}

function TakeawayFormScreen({
  restaurant,
  onBack,
  onSubmit,
}: {
  restaurant: Restaurant
  onBack: () => void
  onSubmit: (data: OrderTypeData) => void
}) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const accentColor = restaurant.menu_accent_color ?? '#F4705A'

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', borderRadius: '14px',
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.05)',
    color: 'var(--menu-text-primary, #f5f5f5)',
    fontSize: '15px', outline: 'none',
    fontFamily: 'var(--font-jakarta)',
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !phone) { toast.error('Completá todos los campos requeridos'); return }
    onSubmit({ type: 'takeaway', customerName: name, customerPhone: phone, deliveryFee: 0 })
  }

  return (
    <div className="public-menu min-h-screen" style={{ '--menu-accent': accentColor } as React.CSSProperties}>
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3" style={{ background: 'rgba(15,17,21,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--menu-border)' }}>
        <button onClick={onBack} style={{ color: 'var(--menu-text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
          <ArrowLeft size={20} />
        </button>
        <h2 className="font-bold text-base" style={{ color: 'var(--menu-text-primary)', fontFamily: 'var(--font-syne)' }}>🥡 Para llevar</h2>
      </div>

      <form onSubmit={handleSubmit} className="px-4 py-5 space-y-4 max-w-md mx-auto" style={{ paddingBottom: '100px' }}>
        <div>
          <label className="block text-xs mb-1.5" style={{ color: 'var(--menu-text-muted)' }}>Nombre *</label>
          <input style={inputStyle} placeholder="Juan Pérez" value={name} onChange={e => setName(e.target.value)} required />
        </div>

        <div>
          <label className="block text-xs mb-1.5" style={{ color: 'var(--menu-text-muted)' }}>Teléfono *</label>
          <input style={inputStyle} type="tel" placeholder="+54 9 11 1234-5678" value={phone} onChange={e => setPhone(e.target.value)} required />
        </div>

        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', padding: '14px 16px' }}>
          <p className="text-sm" style={{ color: 'var(--menu-text-secondary)' }}>
            ⏱️ Tiempo estimado: ~{restaurant.takeaway_time_estimate ?? 15} min
          </p>
        </div>

        <button
          type="submit"
          className="w-full py-4 rounded-2xl font-semibold text-white text-base"
          style={{ background: `linear-gradient(135deg, ${accentColor}, #F09040)`, boxShadow: `0 8px 24px ${accentColor}50` }}
        >
          Continuar al menú →
        </button>
      </form>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtPrice(amount: number): string {
  if (Number.isInteger(amount)) return amount.toLocaleString('es-AR')
  return amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const BADGE_PRIORITY = ['nuevo', 'recomendado', 'picante', 'sin_tacc', 'vegano', 'vegetariano']
const BADGE_META: Record<string, { label: string; bg: string; color: string }> = {
  nuevo:        { label: '✨ Nuevo',       bg: 'rgba(139,92,246,0.16)', color: '#A78BFA' },
  recomendado:  { label: '⭐ Popular',     bg: 'rgba(245,158,11,0.16)', color: '#FCD34D' },
  picante:      { label: '🌶️ Picante',    bg: 'rgba(244,112,90,0.16)', color: '#F4705A' },
  sin_tacc:     { label: '🌾 Sin TACC',   bg: 'rgba(16,185,129,0.14)', color: '#34D399' },
  vegano:       { label: '🌱 Vegano',     bg: 'rgba(16,185,129,0.14)', color: '#34D399' },
  vegetariano:  { label: '🥗 Vegetariano', bg: 'rgba(16,185,129,0.14)', color: '#34D399' },
}

function topBadge(tags: string[]): string | null {
  for (const b of BADGE_PRIORITY) {
    if (tags.includes(b)) return b
  }
  return null
}

// ─── ItemCard ─────────────────────────────────────────────────────────────────

function ItemCard({
  item,
  language,
  currency,
  onTap,
}: {
  item: MenuItem
  language: string
  currency: string
  onTap: (item: MenuItem) => void
}) {
  const { addItem, items: cartItems, updateQuantity } = useCartStore()
  const cartItem = cartItems.find(i => i.id === item.id)
  const cartQty = cartItem?.quantity ?? 0

  const name  = language === 'EN' && item.name_en        ? item.name_en        : item.name
  const desc  = language === 'EN' && item.description_en ? item.description_en : item.description
  const price = currency === 'ARS' ? item.price_ars : item.price_usd
  const badge = topBadge(item.tags)

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation()
    addItem({ id: item.id, product_id: item.product_id ?? undefined, name: item.name, name_en: item.name_en, price_ars: item.price_ars, price_usd: item.price_usd, image_url: item.image_url })
  }

  return (
    <motion.button
      onClick={() => onTap(item)}
      whileTap={{ scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      className="w-full text-left flex gap-3 p-3 rounded-2xl relative overflow-hidden"
      style={{ backgroundColor: 'var(--menu-card)', border: '1px solid var(--menu-border)' }}
    >
      {/* Thumbnail */}
      <div className="relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0">
        {item.image_url ? (
          <img src={item.image_url} alt={name} loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: 'var(--menu-card-elevated)' }}>
            <span className="text-3xl opacity-20">🍽️</span>
          </div>
        )}
        {cartQty > 0 && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <span className="text-white text-xl font-bold">{cartQty}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div>
          {badge && (
            <div
              className="inline-flex items-center text-[0.625rem] font-bold px-1.5 py-0.5 rounded-full mb-1"
              style={{ backgroundColor: BADGE_META[badge].bg, color: BADGE_META[badge].color }}
            >
              {BADGE_META[badge].label}
            </div>
          )}
          <p className="text-[0.9375rem] font-bold leading-tight line-clamp-1" style={{ color: 'var(--menu-text-primary)' }}>
            {name}
          </p>
          {desc && (
            <p className="text-[0.75rem] line-clamp-2 mt-0.5 leading-snug" style={{ color: 'var(--menu-text-muted)' }}>
              {desc}
            </p>
          )}
        </div>

        <div className="flex items-end justify-between mt-2">
          <p className="text-[1rem] font-bold" style={{ color: 'var(--menu-accent)' }}>
            ${fmtPrice(price)}
          </p>

          {cartQty > 0 ? (
            <div
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl"
              style={{ backgroundColor: 'rgba(244,112,90,0.12)' }}
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={e => { e.stopPropagation(); updateQuantity(item.id, cartQty - 1) }}
                className="w-6 h-6 flex items-center justify-center rounded-lg text-sm font-bold"
                style={{ color: 'var(--menu-accent)' }}
              >−</button>
              <span className="text-sm font-bold w-4 text-center" style={{ color: 'var(--menu-accent)' }}>{cartQty}</span>
              <motion.button
                whileTap={{ scale: 0.82 }}
                transition={{ type: 'spring', stiffness: 500, damping: 12 }}
                onClick={e => { e.stopPropagation(); updateQuantity(item.id, cartQty + 1) }}
                className="w-6 h-6 flex items-center justify-center rounded-lg text-sm font-bold"
                style={{ color: 'var(--menu-accent)' }}
              >+</motion.button>
            </div>
          ) : (
            <motion.button
              whileTap={{ scale: 0.82 }}
              transition={{ type: 'spring', stiffness: 500, damping: 12 }}
              onClick={handleAdd}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-white font-bold text-lg leading-none"
              style={{ background: 'var(--menu-accent-gradient)' }}
            >+</motion.button>
          )}
        </div>
      </div>
    </motion.button>
  )
}

// ─── FeaturedRow ──────────────────────────────────────────────────────────────

function FeaturedRow({
  items,
  language,
  currency,
  onTap,
}: {
  items: MenuItem[]
  language: string
  currency: string
  onTap: (item: MenuItem) => void
}) {
  const { addItem, items: cartItems } = useCartStore()
  if (items.length === 0) return null

  return (
    <div className="mb-6">
      <p
        className="text-xs font-bold uppercase tracking-widest px-4 mb-3"
        style={{ color: 'var(--menu-text-muted)', letterSpacing: '0.1em' }}
      >
        ⭐ {language === 'ES' ? 'Destacados' : 'Featured'}
      </p>
      <div className="flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-hide" style={{ scrollSnapType: 'x mandatory' }}>
        {items.map(item => {
          const inCart = cartItems.find(i => i.id === item.id)?.quantity ?? 0
          const name  = language === 'EN' && item.name_en ? item.name_en : item.name
          const price = currency === 'ARS' ? item.price_ars : item.price_usd

          return (
            <motion.button
              key={item.id}
              onClick={() => onTap(item)}
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="flex-shrink-0 rounded-2xl overflow-hidden text-left relative"
              style={{
                width: 144,
                scrollSnapAlign: 'start',
                backgroundColor: 'var(--menu-card)',
                border: '1px solid var(--menu-border)',
              }}
            >
              <div className="relative" style={{ height: 112 }}>
                {item.image_url ? (
                  <img src={item.image_url} alt={name} loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: 'var(--menu-card-elevated)' }}>
                    <span className="text-4xl opacity-20">🍽️</span>
                  </div>
                )}
                {inCart > 0 && (
                  <div
                    className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                    style={{ background: 'var(--menu-accent-gradient)' }}
                  >{inCart}</div>
                )}
              </div>
              <div className="p-2.5 pb-2">
                <p className="text-[0.8125rem] font-semibold line-clamp-1 mb-0.5" style={{ color: 'var(--menu-text-primary)' }}>
                  {name}
                </p>
                <p className="text-[0.8125rem] font-bold" style={{ color: 'var(--menu-accent)' }}>
                  ${fmtPrice(price)}
                </p>
              </div>
              <button
                onClick={e => {
                  e.stopPropagation()
                  addItem({ id: item.id, product_id: item.product_id ?? undefined, name: item.name, name_en: item.name_en, price_ars: item.price_ars, price_usd: item.price_usd, image_url: item.image_url })
                }}
                className="absolute bottom-2.5 right-2.5 w-7 h-7 rounded-xl flex items-center justify-center text-white font-bold text-base"
                style={{ background: 'var(--menu-accent-gradient)' }}
              >+</button>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PublicMenu() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { currency, language, setCurrency, setLanguage } = useMenuStore()
  const { getItemCount, getTotal } = useCartStore()
  const itemCount = getItemCount()

  const [restaurant, setRestaurant]           = useState<Restaurant | null>(null)
  const [sections, setSections]               = useState<MenuSection[]>([])
  const [items, setItems]                     = useState<MenuItem[]>([])
  const [loading, setLoading]                 = useState(true)
  const [searchQuery, setSearchQuery]         = useState('')
  const [activeFilters, setActiveFilters]     = useState<string[]>([])
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)
  const [scrolled, setScrolled]               = useState(false)

  const [isCartOpen,     setIsCartOpen]     = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [detailItem,     setDetailItem]     = useState<MenuItem | null>(null)
  const [isDetailOpen,   setIsDetailOpen]   = useState(false)

  const [callingWaiter,  setCallingWaiter]  = useState(false)
  const [requestingBill, setRequestingBill] = useState(false)
  const [billRequested,  setBillRequested]  = useState(false)
  const [bannerActive,   setBannerActive]   = useState(false)
  const mesaParam = new URLSearchParams(window.location.search).get('mesa')

  // Review modal
  const [showReviewModal,  setShowReviewModal]  = useState(false)
  const [reviewRating,     setReviewRating]     = useState(0)
  const [reviewSubmitted,  setReviewSubmitted]  = useState(false)

  // Delivery/Takeaway phase
  const [menuPhase, setMenuPhase] = useState<MenuPhase>('menu')
  const [orderTypeData, setOrderTypeData] = useState<OrderTypeData | null>(null)
  const [orderType, setOrderType] = useState<'dine_in' | 'delivery' | 'takeaway'>('dine_in')

  const prevItemCount = useRef(itemCount)
  const [cartWiggle, setCartWiggle] = useState(false)

  const { scrollY } = useScroll()
  useMotionValueEvent(scrollY, 'change', v => setScrolled(v > 130))

  useEffect(() => {
    if (itemCount > prevItemCount.current) {
      setCartWiggle(true)
      setTimeout(() => setCartWiggle(false), 600)
    }
    prevItemCount.current = itemCount
  }, [itemCount])

  // ── Fetch data ───────────────────────────────────────────────────────────────
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
        const r = rest as unknown as Restaurant
        setRestaurant(r)

        // Init language from restaurant default if user hasn't manually switched
        if (!localStorage.getItem(`menulife_menu_lang_${slug as string}`)) {
          setLanguage(r.default_language ?? 'ES')
        }

        // Always go directly to menu — restore saved order type if any
        if (!mesaParam) {
          const storageKey = `order_type_${slug as string}`
          const saved = sessionStorage.getItem(storageKey)
          if (saved) {
            try {
              const parsed = JSON.parse(saved) as OrderTypeData
              setOrderTypeData(parsed)
              setOrderType(parsed.type)
            } catch { /* ignore */ }
          }
        }

        const { data: secs } = await supabase
          .from('menu_sections')
          .select('*')
          .eq('restaurant_id', r.id)
          .eq('is_active', true)
          .order('sort_order')
        setSections((secs as MenuSection[]) ?? [])

        const { data: itms } = await supabase
          .from('menu_items')
          .select('*')
          .eq('restaurant_id', r.id)
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
        .from('tables').select('id, waiter_id')
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

  // ── Waiter call ──────────────────────────────────────────────────────────────
  const handleCallWaiter = async () => {
    if (!restaurant || !mesaParam || callingWaiter) return
    setCallingWaiter(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any

      // Find active order → set waiter_called = true (trigger creates waiter_notification)
      const { data: activeOrder } = await db
        .from('orders')
        .select('id')
        .eq('restaurant_id', restaurant.id)
        .eq('table_number', mesaParam)
        .in('status', ['pending', 'cooking', 'ready', 'bill_requested', 'waiting'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (activeOrder?.id) {
        const { error } = await db.from('orders').update({ waiter_called: true }).eq('id', activeOrder.id)
        if (error) throw error
      } else {
        // No active order: fallback to waiter_calls for legacy dashboard
        const { data: tableData } = await db
          .from('tables').select('id, waiter_id')
          .eq('restaurant_id', restaurant.id)
          .eq('table_number', mesaParam)
          .maybeSingle()
        if (tableData?.waiter_id) {
          await db.from('waiter_calls').insert({
            restaurant_id: restaurant.id,
            table_id: tableData.id,
            waiter_id: tableData.waiter_id,
          })
        }
      }

      toast.success(language === 'ES' ? '🔔 ¡Tu mozo fue notificado!' : '🔔 Waiter notified!')
    } catch {
      toast.error(language === 'ES' ? 'No pudimos llamar al mozo, intentá de nuevo' : 'Could not reach waiter, please try again')
    } finally {
      setCallingWaiter(false)
    }
  }

  // ── Review modal handlers ────────────────────────────────────────────────────
  const handleOrderCompleted = (orderId: string) => {
    const sessionKey = `review_shown_${orderId}`
    if (sessionStorage.getItem(sessionKey)) return
    sessionStorage.setItem(sessionKey, '1')
    setShowReviewModal(true)
  }

  const handleStarRating = async (stars: number) => {
    setReviewRating(stars)
    setReviewSubmitted(true)
    const phone = orderTypeData?.customerPhone
    if (phone && restaurant) {
      const tag = `reseña-${stars}-estrellas`
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyDb = supabase as any
      try {
        const { data: contact } = await anyDb.from('crm_contacts')
          .select('id, tags').eq('restaurant_id', restaurant.id)
          .eq('phone', phone).maybeSingle()
        if (contact) {
          const existing: string[] = Array.isArray(contact.tags) ? contact.tags : []
          const next = [...new Set([...existing.filter((t: string) => !t.startsWith('reseña-')), tag])]
          await anyDb.from('crm_contacts').update({ tags: next }).eq('id', contact.id)
        }
      } catch { /* ignore */ }
    }
  }

  // ── Filtering ─────────────────────────────────────────────────────────────────
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
    const matchFilters = activeFilters.length === 0 || activeFilters.every(f => item.tags.includes(f))
    return matchSearch && matchFilters
  })

  const openDetail = (item: MenuItem) => {
    setDetailItem(item)
    setIsDetailOpen(true)
  }

  const handleSelectOrderType = (type: 'dine_in' | 'delivery' | 'takeaway') => {
    setOrderType(type)
    if (type === 'dine_in') {
      const data: OrderTypeData = { type: 'dine_in' }
      sessionStorage.setItem(`order_type_${slug as string}`, JSON.stringify(data))
      setOrderTypeData(data)
    } else if (type === 'delivery') {
      if (orderTypeData?.type === 'delivery') return
      setMenuPhase('delivery-form')
    } else {
      if (orderTypeData?.type === 'takeaway') return
      setMenuPhase('takeaway-form')
    }
  }

  const handleOrderTypeSubmit = (data: OrderTypeData) => {
    sessionStorage.setItem(`order_type_${slug as string}`, JSON.stringify(data))
    setOrderTypeData(data)
    setOrderType(data.type)
    setMenuPhase('menu')
  }

  // ── Pre-menu phases ─────────────────────────────────────────────────────────
  if (!loading && restaurant && menuPhase === 'delivery-form') {
    return <DeliveryFormScreen restaurant={restaurant} onBack={() => setMenuPhase('menu')} onSubmit={handleOrderTypeSubmit} />
  }
  if (!loading && restaurant && menuPhase === 'takeaway-form') {
    return <TakeawayFormScreen restaurant={restaurant} onBack={() => setMenuPhase('menu')} onSubmit={handleOrderTypeSubmit} />
  }

  // ── Loading ───────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="public-menu min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 rounded-full border-2 animate-spin"
            style={{ borderColor: 'var(--menu-accent)', borderTopColor: 'transparent' }}
          />
          <p className="text-sm" style={{ color: 'var(--menu-text-muted)' }}>Cargando menú...</p>
        </div>
      </div>
    )
  }

  if (!restaurant) {
    return (
      <div className="public-menu min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-5xl mb-3">🍽️</p>
          <p style={{ color: 'var(--menu-text-secondary)' }}>Restaurante no encontrado</p>
        </div>
      </div>
    )
  }

  // ── Computed ──────────────────────────────────────────────────────────────────
  const FILTERS = [
    { key: 'vegano',      label: '🌱 Vegano'      },
    { key: 'vegetariano', label: '🥗 Vegetariano' },
    { key: 'sin_tacc',    label: '🌾 Sin TACC'    },
    { key: 'picante',     label: '🌶️ Picante'     },
  ]

  const accentColor = restaurant.menu_accent_color ?? '#F4705A'
  const featuredItems = items.filter(i => i.is_available && i.tags.includes('recomendado'))
  const sectionGroups = sections
    .map(sec => ({ section: sec, items: filteredItems.filter(i => i.section_id === sec.id) }))
    .filter(g => g.items.length > 0)

  const menuVars = {
    '--menu-accent': accentColor,
    '--menu-accent-gradient': `linear-gradient(135deg, ${accentColor}, #F09040)`,
  } as React.CSSProperties

  return (
    <div
      className="public-menu min-h-screen"
      style={{ ...menuVars, paddingBottom: bannerActive ? 'calc(64px + env(safe-area-inset-bottom))' : undefined }}
    >

      {/* ── Hero (180px mobile / 280px desktop, document flow, scrolls away) ── */}
      <div className="relative menu-hero-header">
        {restaurant.cover_image_url ? (
          <img
            src={restaurant.cover_image_url}
            alt={restaurant.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(135deg, #0F1115 0%, #1a2035 100%)' }}
          />
        )}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(15,17,21,0.25) 0%, rgba(15,17,21,0.88) 100%)' }}
        />
        {/* Restaurant name — top right */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            fontFamily: "'Ruda', sans-serif",
            fontSize: 18,
            fontWeight: 700,
            color: '#FFFFFF',
            textAlign: 'right',
            textTransform: 'capitalize',
            maxWidth: 220,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            paddingTop: 12,
            paddingRight: 16,
            textShadow: '0 1px 4px rgba(0,0,0,0.6)',
          }}
        >
          {restaurant.name}
        </div>

        {/* Restaurant info overlay */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 flex items-end gap-3">
          {restaurant.logo_url && (
            <img
              src={restaurant.logo_url}
              alt={restaurant.name}
              className="w-14 h-14 rounded-2xl object-cover flex-shrink-0"
              style={{ border: '2px solid rgba(255,255,255,0.15)' }}
            />
          )}
          {mesaParam && (
            <div className="flex-1 min-w-0 pb-0.5">
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>Mesa {mesaParam}</p>
            </div>
          )}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {(restaurant.allow_language_switch ?? true) && (
              <button
                onClick={() => {
                  const next = language === 'ES' ? 'EN' : 'ES'
                  setLanguage(next)
                  localStorage.setItem(`menulife_menu_lang_${slug as string}`, next)
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold"
                style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(8px)' }}
              >
                <Globe className="w-3 h-3" />{language}
              </button>
            )}
            <button
              onClick={() => setCurrency(currency === 'ARS' ? 'USD' : 'ARS')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold"
              style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(8px)' }}
            >
              <DollarSign className="w-3 h-3" />{currency}
            </button>
            {restaurant.reservations_enabled && (
              <button
                onClick={() => navigate(`/r/${slug}/reservar`)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold"
                style={{ backgroundColor: accentColor, color: '#fff', backdropFilter: 'blur(8px)', borderRadius: '10px' }}
              >
                <CalendarDays className="w-3 h-3" />
                {language === 'ES' ? 'Reservar' : 'Book'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Collapsing header (fixed, appears when hero scrolled away) ───── */}
      <AnimatePresence>
        {scrolled && (
          <motion.div
            key="collapsed-header"
            initial={{ y: -64 }}
            animate={{ y: 0 }}
            exit={{ y: -64 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="fixed top-0 left-0 right-0 z-50 flex items-center gap-2.5 px-4"
            style={{
              height: 52,
              backgroundColor: 'rgba(15,17,21,0.95)',
              backdropFilter: 'blur(20px)',
              borderBottom: '1px solid var(--menu-border)',
            }}
          >
            <a href={`/${slug}`} className="flex items-center gap-2.5 flex-1 min-w-0 no-underline">
              {restaurant.logo_url && (
                <img src={restaurant.logo_url} alt={restaurant.name} className="w-7 h-7 rounded-xl object-cover flex-shrink-0" />
              )}
              <span className="font-bold text-sm flex-1 truncate" style={{ color: 'var(--menu-text-primary)' }}>
                {restaurant.name}
              </span>
            </a>
            {mesaParam && (
              <span
                className="text-xs px-2 py-1 rounded-lg"
                style={{ backgroundColor: 'var(--menu-card-elevated)', color: 'var(--menu-text-secondary)' }}
              >
                Mesa {mesaParam}
              </span>
            )}
            <div className="flex items-center gap-1">
              {(restaurant.allow_language_switch ?? true) && (
                <button
                  onClick={() => {
                    const next = language === 'ES' ? 'EN' : 'ES'
                    setLanguage(next)
                    localStorage.setItem(`menulife_menu_lang_${slug as string}`, next)
                  }}
                  className="px-2 py-1 rounded-lg text-xs font-semibold"
                  style={{ backgroundColor: 'var(--menu-card-elevated)', color: 'var(--menu-text-secondary)' }}
                >{language}</button>
              )}
              <button
                onClick={() => setCurrency(currency === 'ARS' ? 'USD' : 'ARS')}
                className="px-2 py-1 rounded-lg text-xs font-semibold"
                style={{ backgroundColor: 'var(--menu-card-elevated)', color: 'var(--menu-text-secondary)' }}
              >{currency}</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Sticky search + filter bar ───────────────────────────────────── */}
      <div
        className="sticky z-30 px-4 pt-3 pb-2.5"
        style={{
          top: scrolled ? 52 : 0,
          backgroundColor: 'rgba(15,17,21,0.95)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--menu-border)',
        }}
      >
        <div
          className="flex items-center gap-2 px-3 py-2.5 rounded-2xl mb-2.5"
          style={{ backgroundColor: 'var(--menu-card-elevated)', border: '1px solid var(--menu-border)' }}
        >
          <Search className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--menu-text-muted)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={language === 'ES' ? 'Buscar platos...' : 'Search dishes...'}
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: 'var(--menu-text-primary)', fontSize: '16px' }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')}>
              <X className="w-4 h-4" style={{ color: 'var(--menu-text-muted)' }} />
            </button>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {FILTERS.map(({ key, label }) => {
            const active = activeFilters.includes(key)
            return (
              <button
                key={key}
                onClick={() => toggleFilter(key)}
                className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 transition-all active:scale-95"
                style={{
                  backgroundColor: active ? 'rgba(244,112,90,0.14)' : 'var(--menu-card-elevated)',
                  color: active ? 'var(--menu-accent)' : 'var(--menu-text-secondary)',
                  border: `1px solid ${active ? 'rgba(244,112,90,0.3)' : 'var(--menu-border)'}`,
                }}
              >{label}</button>
            )
          })}
        </div>

        {/* Order type pills — only when delivery or takeaway is enabled and no mesa */}
        {!mesaParam && (restaurant.delivery_enabled || restaurant.takeaway_enabled) && (
          <div className="flex gap-2 mt-2.5 overflow-x-auto scrollbar-hide">
            {[
              { type: 'dine_in' as const, emoji: '🪑', label: language === 'ES' ? 'Mesa' : 'Dine in' },
              ...(restaurant.delivery_enabled ? [{ type: 'delivery' as const, emoji: '🛵', label: 'Delivery' }] : []),
              ...(restaurant.takeaway_enabled ? [{ type: 'takeaway' as const, emoji: '🥡', label: language === 'ES' ? 'Para llevar' : 'Takeaway' }] : []),
            ].map(opt => {
              const active = orderType === opt.type
              return (
                <button
                  key={opt.type}
                  onClick={() => handleSelectOrderType(opt.type)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all active:scale-95"
                  style={{
                    backgroundColor: active ? `${accentColor}1a` : 'var(--menu-card-elevated)',
                    color: active ? accentColor : 'var(--menu-text-secondary)',
                    border: `1px solid ${active ? `${accentColor}50` : 'var(--menu-border)'}`,
                  }}
                >
                  <span>{opt.emoji}</span>
                  <span>{opt.label}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Category tabs ────────────────────────────────────────────────── */}
      {sections.length > 1 && (
        <div
          className="sticky z-20 flex gap-1 overflow-x-auto px-4 py-2 scrollbar-hide"
          style={{
            top: 0,
            backgroundColor: 'rgba(15,17,21,0.95)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid var(--menu-border)',
          }}
        >
          <button
            onClick={() => setActiveSectionId(null)}
            className="px-4 py-2 text-[0.875rem] font-semibold whitespace-nowrap flex-shrink-0 relative transition-colors"
            style={{ color: activeSectionId === null ? 'var(--menu-accent)' : 'var(--menu-text-secondary)' }}
          >
            {language === 'ES' ? 'Todos' : 'All'}
            {activeSectionId === null && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                style={{ backgroundColor: 'var(--menu-accent)' }}
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
                className="px-4 py-2 text-[0.875rem] font-semibold whitespace-nowrap flex-shrink-0 relative transition-colors"
                style={{ color: isActive ? 'var(--menu-accent)' : 'var(--menu-text-secondary)' }}
              >
                {label}
                {isActive && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                    style={{ backgroundColor: 'var(--menu-accent)' }}
                  />
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="pt-4" style={{ paddingBottom: 'calc(110px + env(safe-area-inset-bottom))' }}>

        {/* Featured row — hidden while searching or filtering */}
        {!activeSectionId && !searchQuery && activeFilters.length === 0 && featuredItems.length > 0 && (
          <FeaturedRow items={featuredItems} language={language} currency={currency} onTap={openDetail} />
        )}

        {/* Items */}
        <div className="px-4">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <p className="text-4xl">😕</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--menu-text-secondary)' }}>
                {searchQuery
                  ? (language === 'ES' ? `No encontramos "${searchQuery}"` : `No results for "${searchQuery}"`)
                  : (language === 'ES' ? 'No se encontraron platos' : 'No dishes found')
                }
              </p>
              {(searchQuery || activeFilters.length > 0) && (
                <button
                  onClick={() => { setSearchQuery(''); setActiveFilters([]) }}
                  className="text-sm font-semibold px-4 py-2 rounded-xl mt-1"
                  style={{ backgroundColor: 'rgba(244,112,90,0.12)', color: 'var(--menu-accent)' }}
                >
                  {language === 'ES' ? 'Ver todo el menú' : 'Show full menu'}
                </button>
              )}
            </div>
          ) : activeSectionId !== null ? (
            <motion.div
              key={activeSectionId}
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.04 } }, hidden: {} }}
              className="space-y-3"
            >
              {filteredItems.map(item => (
                <motion.div key={item.id} variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}>
                  <ItemCard item={item} language={language} currency={currency} onTap={openDetail} />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            sectionGroups.map(({ section, items: sItems }) => (
              <div key={section.id} className="mb-7">
                <p
                  className="text-xs font-bold uppercase mb-3"
                  style={{ color: 'var(--menu-text-primary)', letterSpacing: '0.1em' }}
                >
                  {language === 'EN' && section.name_en ? section.name_en : section.name}
                </p>
                <motion.div
                  initial="hidden"
                  animate="show"
                  variants={{ show: { transition: { staggerChildren: 0.04 } }, hidden: {} }}
                  className="space-y-3"
                >
                  {sItems.map(item => (
                    <motion.div key={item.id} variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}>
                      <ItemCard item={item} language={language} currency={currency} onTap={openDetail} />
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            ))
          )}
        </div>

        {/* ── Menu footer: Google Reviews + Social ─────────────────────────── */}
        {!searchQuery && activeFilters.length === 0 && (() => {
          const socials = (restaurant.social_links as Record<string, string> | null) ?? {}
          const googleReviewUrl = socials.google_maps ? `${socials.google_maps}/review` : null
          const hasSocials = !!(socials.instagram || socials.facebook || socials.tiktok || socials.whatsapp)

          if (!googleReviewUrl && !hasSocials) return null

          return (
            <div className="px-4 mt-8 mb-2">
              {/* Divider */}
              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 h-px" style={{ background: 'var(--menu-border)' }} />
                <span className="text-xs" style={{ color: 'var(--menu-text-muted)' }}>
                  {language === 'ES' ? 'Fin del menú' : 'End of menu'}
                </span>
                <div className="flex-1 h-px" style={{ background: 'var(--menu-border)' }} />
              </div>

              {/* Google Reviews */}
              {googleReviewUrl && (
                <div className="mb-6 text-center">
                  <p className="text-sm font-semibold mb-1" style={{ color: 'var(--menu-text-secondary)' }}>
                    {language === 'ES' ? '¿Te gustó la experiencia?' : 'Enjoyed your experience?'}
                  </p>
                  <p className="text-xs mb-3" style={{ color: 'var(--menu-text-muted)' }}>
                    {language === 'ES' ? 'Dejanos una reseña 🌟' : 'Leave us a review 🌟'}
                  </p>
                  <a
                    href={googleReviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full py-4 rounded-2xl font-semibold text-base transition-transform active:scale-[0.98]"
                    style={{
                      background: '#FFFFFF',
                      color: '#1A1A1A',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)'
                      ;(e.currentTarget as HTMLElement).style.boxShadow = '0 6px 24px rgba(0,0,0,0.35)'
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.transform = 'scale(1)'
                      ;(e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.25)'
                    }}
                  >
                    ⭐ {language === 'ES' ? 'Dejá tu reseña en Google' : 'Leave a Google review'}
                  </a>
                </div>
              )}

              {/* Social media */}
              {hasSocials && (
                <div className="mb-6">
                  <p
                    className="text-xs font-bold uppercase text-center mb-3"
                    style={{ color: 'var(--menu-text-muted)', letterSpacing: '0.1em' }}
                  >
                    {language === 'ES' ? 'Seguinos' : 'Follow us'}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {socials.instagram && (
                      <a
                        href={`https://instagram.com/${socials.instagram}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-colors"
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: '#fff',
                          textDecoration: 'none',
                        }}
                      >
                        📸 Instagram
                      </a>
                    )}
                    {socials.facebook && (
                      <a
                        href={`https://facebook.com/${socials.facebook}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-colors"
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: '#fff',
                          textDecoration: 'none',
                        }}
                      >
                        📘 Facebook
                      </a>
                    )}
                    {socials.tiktok && (
                      <a
                        href={`https://tiktok.com/@${socials.tiktok}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-colors"
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: '#fff',
                          textDecoration: 'none',
                        }}
                      >
                        🎵 TikTok
                      </a>
                    )}
                    {socials.whatsapp && (
                      <a
                        href={`https://wa.me/${socials.whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-colors"
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: '#fff',
                          textDecoration: 'none',
                        }}
                      >
                        💬 WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Powered by */}
              <div className="text-center pb-2">
                <a
                  href="https://menulife.digital"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs"
                  style={{ color: 'rgba(255,255,255,0.2)', textDecoration: 'none' }}
                >
                  Powered by MenuLife
                </a>
              </div>
            </div>
          )
        })()}
      </main>

      {/* ── Bill request button ──────────────────────────────────────────── */}
      {mesaParam && (
        <button
          onClick={handleRequestBill}
          disabled={requestingBill || billRequested}
          className="fixed bottom-44 right-4 z-20 w-12 h-12 flex items-center justify-center rounded-2xl transition-all active:opacity-60 disabled:opacity-50"
          style={{
            backgroundColor: billRequested ? 'rgba(245,158,11,0.15)' : 'var(--menu-card-elevated)',
            border: `1px solid ${billRequested ? '#F59E0B' : 'var(--menu-border)'}`,
          }}
          title={language === 'ES' ? 'Pedir la cuenta' : 'Request bill'}
        >
          <Receipt
            className={`w-5 h-5 ${requestingBill ? 'animate-pulse' : ''}`}
            style={{ color: billRequested ? '#F59E0B' : 'var(--menu-text-secondary)' }}
          />
        </button>
      )}

      {/* ── Bell button ──────────────────────────────────────────────────── */}
      {mesaParam && (
        <button
          onClick={handleCallWaiter}
          disabled={callingWaiter}
          className="fixed bottom-28 right-4 z-20 w-12 h-12 flex items-center justify-center rounded-2xl transition-opacity active:opacity-60 disabled:opacity-50"
          style={{ backgroundColor: 'var(--menu-card-elevated)', border: '1px solid var(--menu-border)' }}
          title="Llamar al mozo"
        >
          <Bell
            className={`w-5 h-5 ${callingWaiter ? 'animate-pulse' : ''}`}
            style={{ color: 'var(--menu-text-secondary)' }}
          />
        </button>
      )}

      {/* ── Floating cart pill ───────────────────────────────────────────── */}
      <AnimatePresence>
        {itemCount > 0 && (
          <motion.button
            initial={{ y: 80, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 80, opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
            onClick={() => setIsCartOpen(true)}
            className="fixed z-40 flex items-center gap-3 rounded-2xl font-semibold text-white text-sm"
            style={{
              bottom: bannerActive
                ? 'calc(68px + env(safe-area-inset-bottom))'
                : 'calc(20px + env(safe-area-inset-bottom))',
              left: '50%',
              x: '-50%',
              padding: '14px 22px',
              background: `linear-gradient(135deg, ${accentColor}, #F09040)`,
              boxShadow: `0 8px 32px rgba(244,112,90,0.38)`,
              whiteSpace: 'nowrap',
              width: 'calc(100% - 32px)',
              maxWidth: '420px',
            }}
          >
            <motion.span
              animate={cartWiggle ? { rotate: [0, -15, 15, -10, 10, 0] } : {}}
              transition={{ duration: 0.5 }}
            >
              <ShoppingCart className="w-5 h-5" />
            </motion.span>
            <span>{language === 'ES' ? 'Ver pedido' : 'View order'} ({itemCount})</span>
            <span className="opacity-50">·</span>
            <span>${fmtPrice(getTotal(currency))}</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Sheets & modals ─────────────────────────────────────────────── */}
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
        onSuccess={() => {
          setIsCheckoutOpen(false)
          sessionStorage.removeItem(`order_type_${slug as string}`)
          setOrderTypeData(null)
        }}
        slug={slug}
        restaurantName={restaurant.name}
        businessType={restaurant.business_type}
        orderTypeData={orderTypeData}
        mesaParam={mesaParam}
      />
      {slug && (
        <ActiveOrderBanner
          slug={slug}
          onCallWaiter={mesaParam ? handleCallWaiter : undefined}
          onVisibleChange={setBannerActive}
          onCompleted={handleOrderCompleted}
        />
      )}

      {/* ── Review modal ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showReviewModal && (
          <motion.div
            key="review-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center"
            style={{ backdropFilter: 'blur(12px)', backgroundColor: 'rgba(0,0,0,0.7)' }}
            onClick={() => setShowReviewModal(false)}
          >
            <motion.div
              key="review-sheet"
              initial={{ y: 120, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 120, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 340, damping: 30 }}
              className="w-full max-w-md rounded-t-3xl px-6 pt-6 pb-10"
              style={{ backgroundColor: '#111318', border: '1px solid rgba(255,255,255,0.1)', borderBottom: 'none' }}
              onClick={e => e.stopPropagation()}
            >
              {!reviewSubmitted ? (
                <>
                  <div className="text-center mb-6">
                    <p className="text-5xl mb-3">🎉</p>
                    <h3 className="text-xl font-bold text-white mb-1">¡Gracias por tu visita!</h3>
                    <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
                      Tu opinión nos ayuda a mejorar
                    </p>
                  </div>

                  <div className="flex flex-col gap-3">
                    {(() => {
                      const googleUrl = (restaurant.social_links as Record<string, string> | null)?.google_review
                      return googleUrl ? (
                        <a
                          href={googleUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-semibold text-white transition-all active:scale-95"
                          style={{ backgroundColor: accentColor }}
                        >
                          ⭐ Dejar reseña en Google
                        </a>
                      ) : null
                    })()}

                    <div
                      className="w-full rounded-2xl px-4 py-4"
                      style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      <p className="text-sm font-medium text-center mb-3" style={{ color: 'rgba(255,255,255,0.7)' }}>
                        ✨ Solo puntuar
                      </p>
                      <div className="flex justify-center gap-3">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button
                            key={star}
                            onClick={() => handleStarRating(star)}
                            className="text-3xl transition-transform active:scale-110 hover:scale-110"
                          >
                            {star <= reviewRating ? '⭐' : '☆'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowReviewModal(false)}
                    className="w-full mt-4 py-3 rounded-2xl text-sm font-medium transition-all active:scale-95"
                    style={{ backgroundColor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)' }}
                  >
                    Cerrar
                  </button>
                </>
              ) : (
                <>
                  <div className="text-center py-4">
                    <p className="text-5xl mb-3">💛</p>
                    <h3 className="text-xl font-bold text-white mb-1">¡Gracias por tu puntuación!</h3>
                    <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.55)' }}>
                      Nos ayudás a crecer día a día
                    </p>
                    <button
                      onClick={() => setShowReviewModal(false)}
                      className="px-8 py-3 rounded-2xl font-semibold text-white transition-all active:scale-95"
                      style={{ backgroundColor: accentColor }}
                    >
                      Cerrar
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
