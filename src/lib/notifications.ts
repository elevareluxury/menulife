export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }
  return false
}

function showNotification(title: string, options?: NotificationOptions) {
  if (Notification.permission !== 'granted') return
  const notification = new Notification(title, { icon: '/icon-192.png', ...options })
  setTimeout(() => notification.close(), 5000)
}

function playAlertBeep() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 660
    gain.gain.setValueAtTime(0.4, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.5)
  } catch {
    // AudioContext may be blocked by browser policy
  }
}

export function notifyNewOrder(orderType: string, tableOrName: string) {
  showNotification('🔔 Nuevo Pedido', {
    body: orderType === 'dine_in'
      ? `Mesa ${tableOrName}`
      : `Para llevar: ${tableOrName}`,
    tag: 'new-order',
    requireInteraction: true,
  })
  playAlertBeep()
}

export function notifyDelayedOrder(orderInfo: string, minutes: number) {
  showNotification('⚠️ Pedido Demorado', {
    body: `${orderInfo} lleva ${minutes} minutos`,
    tag: `delayed-${orderInfo}`,
  })
}
