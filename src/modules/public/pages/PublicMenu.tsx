import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Search, Globe, DollarSign, ShoppingCart, Bell } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useMenuStore } from '@/store/menuStore'
import { useCartStore } from '@/store/cartStore'
import { formatPrice } from '@/lib/utils'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { CartSheet } from '../components/CartSheet'
import { CheckoutModal } from '../components/CheckoutModal'
import toast from 'react-hot-toast'
import type { Restaurant, MenuSection, MenuItem } from '@/types'

export function PublicMenu() {
  const { slug } = useParams()
  const { currency, language, setCurrency, setLanguage } = useMenuStore()
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [sections, setSections] = useState<MenuSection[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const { addItem, getItemCount } = useCartStore()
  const itemCount = getItemCount()
  const [callingWaiter, setCallingWaiter] = useState(false)

  const handleCallWaiter = async () => {
    if (!restaurant) return
    const mesaParam = new URLSearchParams(window.location.search).get('mesa')
    if (!mesaParam) { toast.error('No se detectó el número de mesa'); return }
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
      if (!tableData?.waiter_id) { toast.error('No hay mozo asignado a esta mesa'); return }
      const { error } = await db.from('waiter_calls').insert({
        restaurant_id: restaurant.id,
        table_id: tableData.id,
        waiter_id: tableData.waiter_id,
      })
      if (error) throw error
      toast.success('¡Mozo notificado!')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error')
    } finally {
      setCallingWaiter(false)
    }
  }

  useEffect(() => {
    if (!slug) {
      setLoading(false)
      return
    }

    async function fetchData() {
      try {
        const { data: rest, error: restError } = await supabase
          .from('restaurants')
          .select('*')
          .eq('slug', slug as string)
          .eq('is_active', true)
          .single()

        if (restError) throw restError
        setRestaurant(rest as Restaurant)

        const { data: secs, error: secsError } = await supabase
          .from('menu_sections')
          .select('*')
          .eq('restaurant_id', rest.id)
          .eq('is_active', true)
          .order('sort_order')

        if (secsError) throw secsError
        setSections((secs as MenuSection[]) ?? [])

        const { data: itms, error: itmsError } = await supabase
          .from('menu_items')
          .select('*')
          .eq('restaurant_id', rest.id)
          .order('sort_order')

        if (itmsError) throw itmsError
        setItems((itms as MenuItem[]) ?? [])
      } catch (error) {
        console.error('Error fetching public menu:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [slug])

  function toggleFilter(filter: string) {
    setActiveFilters((prev) =>
      prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter]
    )
  }

  const filteredItems = items.filter((item) => {
    if (!item.is_available) return false

    const q = searchQuery.toLowerCase()
    const matchesSearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      item.name_en?.toLowerCase().includes(q) ||
      item.description?.toLowerCase().includes(q)

    const matchesFilters =
      activeFilters.length === 0 || activeFilters.every((f) => item.tags.includes(f))

    return matchesSearch && matchesFilters
  })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Restaurante no encontrado</p>
      </div>
    )
  }

  const filters = [
    { key: 'vegano', label: '🌱 Vegano' },
    { key: 'vegetariano', label: '🥗 Vegetariano' },
    { key: 'sin_tacc', label: '🌾 Sin TACC' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {restaurant.logo_url && (
                <img src={restaurant.logo_url} alt={restaurant.name} className="h-10 w-10 object-contain" />
              )}
              <h1 className="text-xl font-bold text-gray-900">{restaurant.name}</h1>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setLanguage(language === 'ES' ? 'EN' : 'ES')}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
              >
                <Globe className="w-4 h-4" />
                {language}
              </button>
              <button
                onClick={() => setCurrency(currency === 'ARS' ? 'USD' : 'ARS')}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
              >
                <DollarSign className="w-4 h-4" />
                {currency}
              </button>
            </div>
          </div>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={language === 'ES' ? 'Buscar platos...' : 'Search dishes...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {filters.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => toggleFilter(key)}
                className={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition-colors ${
                  activeFilters.includes(key)
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {sections.map((section) => {
          const sectionItems = filteredItems.filter((i) => i.section_id === section.id)
          if (sectionItems.length === 0) return null

          const sectionName = language === 'EN' && section.name_en ? section.name_en : section.name
          const sectionDesc =
            language === 'EN' && section.description_en
              ? section.description_en
              : section.description

          return (
            <div key={section.id} className="mb-10">
              <h2 className="text-2xl font-bold mb-1">{sectionName}</h2>
              {sectionDesc && <p className="text-gray-500 text-sm mb-4">{sectionDesc}</p>}

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sectionItems.map((item) => {
                  const itemName = language === 'EN' && item.name_en ? item.name_en : item.name
                  const itemDesc =
                    language === 'EN' && item.description_en ? item.description_en : item.description
                  const price = currency === 'ARS'
                    ? formatPrice(item.price_ars, 'ARS')
                    : formatPrice(item.price_usd, 'USD')

                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                    >
                      {item.image_url && (
                        <img
                          src={item.image_url}
                          alt={itemName}
                          className="w-full h-48 object-cover"
                        />
                      )}
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{itemName}</h3>
                          <p className="font-bold text-primary whitespace-nowrap">{price}</p>
                        </div>
                        {itemDesc && (
                          <p className="text-sm text-gray-500 mb-3 line-clamp-2">{itemDesc}</p>
                        )}
                        {item.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {item.tags.map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <Button
                          size="sm"
                          onClick={() => addItem({
                            id: item.id,
                            name: item.name,
                            name_en: item.name_en,
                            price_ars: item.price_ars,
                            price_usd: item.price_usd,
                            image_url: item.image_url,
                          })}
                          className="w-full"
                        >
                          {language === 'ES' ? 'Agregar' : 'Add'}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {filteredItems.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">
              {language === 'ES' ? 'No se encontraron platos' : 'No dishes found'}
            </p>
          </div>
        )}
      </div>

      <button
        onClick={handleCallWaiter}
        disabled={callingWaiter}
        className="fixed bottom-20 right-4 bg-blue-500 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all z-30 disabled:opacity-50"
        title="Llamar al mozo"
      >
        <Bell className={`w-6 h-6 ${callingWaiter ? 'animate-pulse' : ''}`} />
      </button>

      {itemCount > 0 && (
        <button
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-4 right-4 bg-emerald-500 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all z-30 flex items-center gap-2"
        >
          <ShoppingCart className="w-6 h-6" />
          <span className="font-bold">{itemCount}</span>
        </button>
      )}

      <CartSheet
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onCheckout={() => {
          setIsCartOpen(false)
          setIsCheckoutOpen(true)
        }}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        restaurantId={restaurant?.id ?? ''}
        onSuccess={() => setIsCheckoutOpen(false)}
      />
    </div>
  )
}
