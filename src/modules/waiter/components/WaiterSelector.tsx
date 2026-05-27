import type { Waiter } from '@/types'

const AVATAR_COLORS = [
  'bg-emerald-500',
  'bg-teal-500',
  'bg-cyan-500',
  'bg-green-500',
  'bg-sky-500',
  'bg-violet-500',
  'bg-rose-500',
  'bg-amber-500',
]

function avatarColor(id: string) {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) & 0xff
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

function SkeletonCard() {
  return (
    <div className="bg-gray-50 rounded-xl p-4 flex flex-col items-center gap-3 animate-pulse border-2 border-transparent">
      <div className="w-14 h-14 rounded-full bg-gray-200" />
      <div className="h-3.5 w-20 bg-gray-200 rounded" />
    </div>
  )
}

interface Props {
  waiters: Waiter[]
  loading: boolean
  lastWaiterId: string | null
  onSelect: (waiter: Waiter) => void
}

export function WaiterSelector({ waiters, loading, lastWaiterId, onSelect }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 w-full">
        {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
      </div>
    )
  }

  if (waiters.length === 0) {
    return (
      <p className="text-center text-gray-400 py-8 text-sm">
        No hay mozos activos registrados
      </p>
    )
  }

  const sorted = [...waiters].sort((a, b) => {
    if (a.id === lastWaiterId) return -1
    if (b.id === lastWaiterId) return 1
    return 0
  })

  return (
    <div className="grid grid-cols-2 gap-3 w-full max-h-64 overflow-y-auto">
      {sorted.map((waiter) => {
        const initials = `${waiter.first_name[0]}${waiter.last_name[0]}`.toUpperCase()
        const isLast = waiter.id === lastWaiterId
        return (
          <button
            key={waiter.id}
            onClick={() => onSelect(waiter)}
            className={`bg-gray-50 hover:bg-gray-100 active:bg-gray-200 rounded-xl p-4 flex flex-col items-center gap-2 transition-colors border-2 ${
              isLast ? 'border-emerald-500' : 'border-transparent'
            }`}
          >
            <div
              className={`w-14 h-14 rounded-full ${avatarColor(waiter.id)} flex items-center justify-center text-white text-xl font-bold select-none`}
            >
              {initials}
            </div>
            <span className="text-gray-800 text-sm font-medium text-center leading-tight">
              {waiter.first_name} {waiter.last_name}
            </span>
            {isLast && (
              <span className="text-emerald-600 text-xs font-medium">Último usado</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
