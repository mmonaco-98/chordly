export type ChordNotation = 'international' | 'italian'

const INT_TO_IT: Record<string, string> = {
  C: 'DO',
  D: 'RE',
  E: 'MI',
  F: 'FA',
  G: 'SOL',
  A: 'LA',
  B: 'SI',
}

function convertNote(note: string): string {
  const base = note[0]
  const acc = note.slice(1)
  return (INT_TO_IT[base] ?? base) + acc
}

function convertMaj(rest: string): string {
  return rest.replace(/^maj(\d*)/, (_match, digits: string) => `${digits}+`)
}

function minorToHyphen(rest: string): string {
  if (rest.startsWith('m') && !rest.startsWith('maj')) {
    return '-' + rest.slice(1)
  }
  return rest
}

function convertQuality(rest: string): string {
  return minorToHyphen(convertMaj(rest))
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
      return convertNote(root) + convertQuality(quality) + '/' + convertNote(bassMatch[1]) + convertQuality(bassMatch[2])
    }
  }

  return convertNote(root) + convertQuality(rest)
}
