export type ChordNotation = 'international' | 'italian'

const INT_TO_IT: Record<string, string> = {
  C: 'Do',
  D: 'Re',
  E: 'Mi',
  F: 'Fa',
  G: 'Sol',
  A: 'La',
  B: 'Si',
}

function convertNote(note: string): string {
  const base = note[0]
  const acc = note.slice(1)
  return (INT_TO_IT[base] ?? base) + acc
}

export function convertChord(chord: string, to: ChordNotation): string {
  if (!chord || to === 'international') return chord

  const match = chord.match(/^([A-G][#b]?)(.*)$/)
  if (!match) return chord

  const [, root, rest] = match

  const slashIdx = rest.lastIndexOf('/')
  if (slashIdx !== -1) {
    const quality = rest.slice(0, slashIdx)
    const bass = rest.slice(slashIdx + 1)
    const bassMatch = bass.match(/^([A-G][#b]?)(.*)$/)
    if (bassMatch) {
      return convertNote(root) + quality + '/' + convertNote(bassMatch[1]) + bassMatch[2]
    }
  }

  return convertNote(root) + rest
}
