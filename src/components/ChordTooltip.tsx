import { useRef, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { SVGuitarChord } from 'svguitar'
import { lookupChordPositions } from '../utils/chordDatabase'

interface Props {
  chordName: string
  displayName: string
  position: { x: number; y: number }
  onClose: () => void
}

const TOOLTIP_WIDTH = 150
const TOOLTIP_MARGIN = 8

function getThemeColors() {
  const style = getComputedStyle(document.documentElement)
  return {
    text: style.getPropertyValue('--text').trim(),
    textMuted: style.getPropertyValue('--text-muted').trim(),
    chord: style.getPropertyValue('--chord').trim(),
    surface: style.getPropertyValue('--surface').trim(),
  }
}

export function ChordTooltip({ chordName, displayName, position, onClose }: Props) {
  const diagramRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const positions = lookupChordPositions(chordName)
  const [posIdx, setPosIdx] = useState(0)

  // Reset position index when chord changes
  useEffect(() => { setPosIdx(0) }, [chordName])

  const chordData = positions[posIdx] ?? null

  // Draw SVG diagram
  useEffect(() => {
    if (!diagramRef.current || !chordData) return
    diagramRef.current.innerHTML = ''

    const colors = getThemeColors()
    const chart = new SVGuitarChord(diagramRef.current)

    // SVGuitar Finger: [string, fret | 0 (open) | 'x' (muted), text?]
    // string: 1 = high E (rightmost), 6 = low E (leftmost)
    const fingers: [number, number | 0 | 'x', string?][] = []

    chordData.frets.forEach((fret, i) => {
      const string = 6 - i
      if (fret === -1) {
        fingers.push([string, 'x'])
      } else if (fret === 0) {
        fingers.push([string, 0])
      } else {
        const finger = chordData.fingers[i]
        fingers.push(finger ? [string, fret, `${finger}`] : [string, fret])
      }
    })

    const barres: { fromString: number; toString: number; fret: number; color?: string; textColor?: string }[] = []
    chordData.barres.forEach(barreFret => {
      // Find the range of strings for this barre
      let minString = 7, maxString = 0
      chordData.frets.forEach((f, i) => {
        if (f === barreFret) {
          const s = 6 - i
          minString = Math.min(minString, s)
          maxString = Math.max(maxString, s)
        }
      })
      if (minString < maxString) {
        barres.push({ fromString: maxString, toString: minString, fret: barreFret, color: colors.chord, textColor: colors.surface })
        // Remove individual fingers that are part of the barre
        for (let idx = fingers.length - 1; idx >= 0; idx--) {
          if (fingers[idx][1] === barreFret) fingers.splice(idx, 1)
        }
      }
    })

    chart
      .configure({
        strings: 6,
        frets: Math.max(4, ...chordData.frets.filter(f => f > 0)),
        position: chordData.baseFret > 1 ? chordData.baseFret : undefined,
        color: colors.text,
        fretColor: colors.textMuted,
        stringColor: colors.textMuted,
        fingerTextColor: colors.surface,
        fingerColor: colors.chord,
        barreChordRadius: 0.3,
        fingerTextSize: 11,
        sidePadding: 0.2,
        titleBottomMargin: 0,
      })
      .chord({
        fingers,
        barres,
      })
      .draw()

    // Draw open/muted string indicators via the SVG
    const svg = diagramRef.current.querySelector('svg')
    if (svg) {
      // Remove default title if any
      const title = svg.querySelector('text')
      if (title && title.textContent === '') title.remove()
    }

    return () => {
      if (diagramRef.current) diagramRef.current.innerHTML = ''
    }
  }, [chordName, posIdx])

  // Position tooltip and handle click outside
  useEffect(() => {
    const tooltip = tooltipRef.current
    if (!tooltip) return

    // Calculate position
    const rect = tooltip.getBoundingClientRect()
    const vh = window.innerHeight
    const vw = window.innerWidth

    let left = position.x - TOOLTIP_WIDTH / 2
    let top = position.y + TOOLTIP_MARGIN

    // Clamp horizontal
    left = Math.max(TOOLTIP_MARGIN, Math.min(left, vw - TOOLTIP_WIDTH - TOOLTIP_MARGIN))

    // If not enough space below, show above
    if (top + rect.height > vh - TOOLTIP_MARGIN) {
      top = position.y - rect.height - TOOLTIP_MARGIN
    }

    tooltip.style.left = `${left}px`
    tooltip.style.top = `${top}px`
    tooltip.style.visibility = 'visible'

    const handleClickOutside = (e: PointerEvent) => {
      if (tooltip.contains(e.target as Node)) return
      // Let the chord-sheet click handler deal with chord clicks
      const target = e.target as HTMLElement
      if (target.closest('.chord')) return
      onClose()
    }

    document.addEventListener('pointerdown', handleClickOutside)
    return () => document.removeEventListener('pointerdown', handleClickOutside)
  }, [position, onClose])

  const content = (
    <div ref={tooltipRef} className="chord-tooltip" style={{ visibility: 'hidden' }}>
      <div className="chord-tooltip__title">{displayName}</div>
      {chordData ? (
        <>
          <div ref={diagramRef} className="chord-tooltip__diagram" />
          {positions.length > 1 && (
            <div className="chord-tooltip__nav">
              <button
                className="chord-tooltip__nav-btn"
                onClick={() => setPosIdx(i => (i - 1 + positions.length) % positions.length)}
                aria-label="Posizione precedente"
              >‹</button>
              <span className="chord-tooltip__nav-label">{posIdx + 1}/{positions.length}</span>
              <button
                className="chord-tooltip__nav-btn"
                onClick={() => setPosIdx(i => (i + 1) % positions.length)}
                aria-label="Posizione successiva"
              >›</button>
            </div>
          )}
        </>
      ) : (
        <div className="chord-tooltip__fallback">
          Diagramma non disponibile
        </div>
      )}
    </div>
  )

  return createPortal(content, document.body)
}
