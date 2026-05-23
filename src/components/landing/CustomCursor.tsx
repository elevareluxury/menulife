import { useEffect, useState } from 'react'

export function CustomCursor() {
  const [pos, setPos] = useState({ x: -100, y: -100 })
  const [hovering, setHovering] = useState(false)

  useEffect(() => {
    const move = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY })
    document.addEventListener('mousemove', move)
    document.body.style.cursor = 'none'
    return () => {
      document.removeEventListener('mousemove', move)
      document.body.style.cursor = ''
    }
  }, [])

  useEffect(() => {
    const enter = () => setHovering(true)
    const leave = () => setHovering(false)
    const els = document.querySelectorAll('button, a, [data-cursor]')
    els.forEach(el => {
      el.addEventListener('mouseenter', enter)
      el.addEventListener('mouseleave', leave)
    })
    return () => {
      els.forEach(el => {
        el.removeEventListener('mouseenter', enter)
        el.removeEventListener('mouseleave', leave)
      })
    }
  })

  return (
    <>
      <div
        className="fixed top-0 left-0 w-2 h-2 bg-orange rounded-full pointer-events-none z-[9999] transition-transform duration-75"
        style={{ transform: `translate(${pos.x - 4}px, ${pos.y - 4}px)` }}
      />
      <div
        className={`fixed top-0 left-0 rounded-full pointer-events-none z-[9998] border border-orange/60 transition-all duration-200 ${
          hovering ? 'w-10 h-10 bg-orange/10' : 'w-6 h-6'
        }`}
        style={{
          transform: `translate(${pos.x - (hovering ? 20 : 12)}px, ${pos.y - (hovering ? 20 : 12)}px)`,
        }}
      />
    </>
  )
}
