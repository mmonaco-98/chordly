import guitarDb from '@tombatossals/chords-db/lib/guitar.json'

export interface ChordPosition {
  frets: number[]
  fingers: number[]
  baseFret: number
  barres: number[]
}

const ROOT_MAP: Record<string, string> = {
  'C': 'C', 'C#': 'Csharp', 'Db': 'Csharp',
  'D': 'D', 'D#': 'Eb', 'Eb': 'Eb',
  'E': 'E',
  'F': 'F', 'F#': 'Fsharp', 'Gb': 'Fsharp',
  'G': 'G', 'G#': 'Ab', 'Ab': 'Ab',
  'A': 'A', 'A#': 'Bb', 'Bb': 'Bb',
  'B': 'B',
}

const SUFFIX_MAP: Record<string, string> = {
  '': 'major',
  'm': 'minor',
}

function parseSuffix(raw: string): string {
  if (raw in SUFFIX_MAP) return SUFFIX_MAP[raw]
  return raw
}

export function lookupChord(chordName: string): ChordPosition | null {
  const positions = lookupChordPositions(chordName)
  return positions.length > 0 ? positions[0] : null
}

export function lookupChordPositions(chordName: string): ChordPosition[] {
  const match = chordName.match(/^([A-G][#b]?)(.*)$/)
  if (!match) return []

  const [, root, rawSuffix] = match
  const dbKey = ROOT_MAP[root]
  if (!dbKey) return []

  const chords = (guitarDb.chords as Record<string, { suffix: string; positions: ChordPosition[] }[]>)[dbKey]
  if (!chords) return []

  // Try exact suffix match
  const suffix = parseSuffix(rawSuffix)
  const found = chords.find(c => c.suffix === suffix)
  if (found) return found.positions

  // For slash chords, try base chord as fallback
  const slashIdx = rawSuffix.indexOf('/')
  if (slashIdx !== -1) {
    const baseSuffix = parseSuffix(rawSuffix.slice(0, slashIdx))
    const fallback = chords.find(c => c.suffix === baseSuffix)
    if (fallback) return fallback.positions
  }

  return []
}
