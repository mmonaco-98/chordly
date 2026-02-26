import { useState } from 'react'
import type { ChordNotation } from '../utils/convertChord'

const KEY = 'chordNotation'

export function useChordNotation() {
  const [notation, setNotation] = useState<ChordNotation>(() =>
    (localStorage.getItem(KEY) as ChordNotation) ?? 'international'
  )

  const toggle = () => setNotation(n => {
    const next: ChordNotation = n === 'international' ? 'italian' : 'international'
    localStorage.setItem(KEY, next)
    return next
  })

  return { notation, toggle }
}
