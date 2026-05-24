import { useState, useEffect } from 'react'

interface GreetingInfo {
  text: string
  emoji: string
  period: 'morning' | 'afternoon' | 'evening'
}

function computeGreeting(): GreetingInfo {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 12) return { text: 'Buenos días', emoji: '🌅', period: 'morning' }
  if (hour >= 12 && hour < 19) return { text: 'Buenas tardes', emoji: '☀️', period: 'afternoon' }
  return { text: 'Buenas noches', emoji: '🌙', period: 'evening' }
}

export function useGreeting(): GreetingInfo {
  const [greeting, setGreeting] = useState<GreetingInfo>(computeGreeting)

  useEffect(() => {
    const interval = setInterval(() => setGreeting(computeGreeting()), 60_000)
    return () => clearInterval(interval)
  }, [])

  return greeting
}
