import { useState } from 'react'

const MIN = 12
const MAX = 26
const STEP = 2
const DEFAULT = 16
const KEY = 'fontSize'

export function useFontSize() {
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem(KEY)
    const n = saved ? parseInt(saved, 10) : DEFAULT
    return isNaN(n) ? DEFAULT : Math.min(MAX, Math.max(MIN, n))
  })

  const increase = () => setFontSize(f => {
    const next = Math.min(MAX, f + STEP)
    localStorage.setItem(KEY, String(next))
    return next
  })

  const decrease = () => setFontSize(f => {
    const next = Math.max(MIN, f - STEP)
    localStorage.setItem(KEY, String(next))
    return next
  })

  return { fontSize, increase, decrease }
}
