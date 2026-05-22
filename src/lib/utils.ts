import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function formatPrice(amount: number, currency: 'ARS' | 'USD' = 'ARS'): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date))
}

export function getTimeSince(date: string): { minutes: number; color: string } {
  const now = new Date()
  const created = new Date(date)
  const diffMs = now.getTime() - created.getTime()
  const minutes = Math.floor(diffMs / 60000)

  let color = 'green'
  if (minutes > 15) color = 'red'
  else if (minutes > 10) color = 'yellow'

  return { minutes, color }
}

export function formatOrderTime(date: string): string {
  return new Date(date).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
