import { useState, useRef, useEffect, useCallback } from 'react'

const SPEED_KEY = 'autoscroll-speed'
export const SCROLL_MIN = 1
export const SCROLL_MAX = 10
const DEFAULT_SPEED = 3

export function useAutoScroll() {
  const [isScrolling, setIsScrolling] = useState(false)
  const [speed, setSpeed] = useState<number>(() => {
    const s = localStorage.getItem(SPEED_KEY)
    return s ? Math.min(SCROLL_MAX, Math.max(SCROLL_MIN, Number(s))) : DEFAULT_SPEED
  })
  const rafRef = useRef<number | null>(null)

  const toggle = useCallback(() => setIsScrolling((v) => !v), [])

  const increaseSpeed = useCallback(() =>
    setSpeed((s) => {
      const n = Math.min(SCROLL_MAX, s + 1)
      localStorage.setItem(SPEED_KEY, String(n))
      return n
    }), [])

  const decreaseSpeed = useCallback(() =>
    setSpeed((s) => {
      const n = Math.max(SCROLL_MIN, s - 1)
      localStorage.setItem(SPEED_KEY, String(n))
      return n
    }), [])

  useEffect(() => {
    if (!isScrolling) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      return
    }
    const pxPerFrame = speed * 0.15
    const tick = () => {
      const maxY = document.documentElement.scrollHeight - window.innerHeight
      if (window.scrollY >= maxY) {
        setIsScrolling(false)
        return
      }
      window.scrollBy(0, pxPerFrame)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [isScrolling, speed])

  return { isScrolling, speed, toggle, increaseSpeed, decreaseSpeed }
}
