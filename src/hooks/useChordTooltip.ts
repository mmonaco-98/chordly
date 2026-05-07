import { useState, useEffect, useCallback, type RefObject } from 'react'

interface TooltipState {
  isOpen: boolean
  chordName: string
  displayName: string
  position: { x: number; y: number }
}

const INITIAL: TooltipState = {
  isOpen: false,
  chordName: '',
  displayName: '',
  position: { x: 0, y: 0 },
}

export function useChordTooltip(containerRef: RefObject<HTMLDivElement | null>) {
  const [state, setState] = useState<TooltipState>(INITIAL)

  const close = useCallback(() => setState(INITIAL), [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // Direct click on .chord, or click anywhere in .column/.row — find the chord
      let chordEl = target.closest('.chord') as HTMLElement | null
      if (!chordEl) {
        const col = target.closest('.column') as HTMLElement | null
        chordEl = col?.querySelector('.chord') as HTMLElement | null
      }
      // Also handle clicks on .row outside any .column (edge case for end-of-line chords)
      if (!chordEl) {
        const row = target.closest('.row') as HTMLElement | null
        if (row) {
          const cols = row.querySelectorAll<HTMLElement>('.column')
          const lastCol = cols[cols.length - 1]
          if (lastCol?.classList.contains('chord-only')) {
            chordEl = lastCol.querySelector('.chord') as HTMLElement | null
          }
        }
      }
      if (!chordEl) return

      const chordName = chordEl.getAttribute('data-chord')
      if (!chordName) return

      const displayName = chordEl.textContent ?? chordName
      const rect = chordEl.getBoundingClientRect()

      setState({
        isOpen: true,
        chordName,
        displayName,
        position: {
          x: rect.left + rect.width / 2,
          y: rect.bottom,
        },
      })
    }

    container.addEventListener('click', handleClick)
    return () => container.removeEventListener('click', handleClick)
  }, [containerRef])

  return { ...state, close }
}
