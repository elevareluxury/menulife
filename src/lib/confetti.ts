export function triggerConfetti() {
  const container = document.createElement('div')
  container.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 9999;
    overflow: hidden;
  `

  const colors = ['#FF6B7A', '#FFE66D', '#4ECDC4', '#FF8E53', '#10B981']

  for (let i = 0; i < 60; i++) {
    const piece = document.createElement('div')
    const color = colors[Math.floor(Math.random() * colors.length)]
    const size = Math.random() * 10 + 5
    const left = Math.random() * 100
    const delay = Math.random() * 0.5
    const duration = Math.random() * 2 + 2

    piece.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      left: ${left}%;
      top: -20px;
      animation: confetti-fall ${duration}s ${delay}s cubic-bezier(0.25,0.46,0.45,0.94) forwards;
      transform: rotate(${Math.random() * 360}deg);
    `
    container.appendChild(piece)
  }

  if (!document.querySelector('#confetti-styles')) {
    const style = document.createElement('style')
    style.id = 'confetti-styles'
    style.textContent = `
      @keyframes confetti-fall {
        0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
        100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
      }
    `
    document.head.appendChild(style)
  }

  document.body.appendChild(container)
  setTimeout(() => container.remove(), 4000)
}
