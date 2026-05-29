import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

type Period = 'morning' | 'afternoon' | 'evening'

interface GreetingInfo {
  text: string
  emoji: string
  period: Period
}

function getPeriod(): Period {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 19) return 'afternoon'
  return 'evening'
}

const EMOJI: Record<Period, string> = { morning: '🌅', afternoon: '☀️', evening: '🌙' }
const KEY: Record<Period, string> = {
  morning:   'dashboard.greeting_morning',
  afternoon: 'dashboard.greeting_afternoon',
  evening:   'dashboard.greeting_evening',
}

export function useGreeting(): GreetingInfo {
  const { t } = useTranslation()
  const [period, setPeriod] = useState<Period>(getPeriod)

  useEffect(() => {
    const interval = setInterval(() => setPeriod(getPeriod()), 60_000)
    return () => clearInterval(interval)
  }, [])

  return { text: t(KEY[period]), emoji: EMOJI[period], period }
}
