/**
 * Una colonna dell'HTML di chordsheetjs, nello stesso ordine in cui compare, vista dal sorgente
 * ChordPro. Le posizioni sono offset nel sorgente. Senza accordo (`chord === ''`)
 * chordStart e chordEnd coincidono con lyricStart.
 *
 * chordsheetjs divide una sola volta il testo che segue un accordo: la prima parola (con gli
 * spazi che la seguono) resta sotto l'accordo, il resto diventa una colonna senza accordo.
 * Il testo prima del primo accordo non viene diviso.
 */
export interface SourcePair {
  /** Indice di riga (da 0) nel sorgente. */
  line: number
  chord: string
  chordStart: number
  chordEnd: number
  lyricStart: number
  lyricEnd: number
}

export function buildSourceMap(content: string): SourcePair[] {
  const pairs: SourcePair[] = []
  let offset = 0

  const lines = content.split('\n')
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const raw = lines[lineIndex]
    const lineStart = offset
    offset += raw.length + 1

    const line = raw.endsWith('\r') ? raw.slice(0, -1) : raw
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('{') || trimmed.startsWith('#')) continue

    const linePairs: SourcePair[] = []
    let current: SourcePair | null = null
    for (const m of line.matchAll(/\[([^\]]*)\]/g)) {
      const index = m.index ?? 0
      if (current) current.lyricEnd = lineStart + index
      else if (index > 0) {
        linePairs.push({
          line: lineIndex,
          chord: '',
          chordStart: lineStart,
          chordEnd: lineStart,
          lyricStart: lineStart,
          lyricEnd: lineStart + index,
        })
      }
      const chordStart = lineStart + index
      const chordEnd = chordStart + m[0].length
      current = { line: lineIndex, chord: m[1], chordStart, chordEnd, lyricStart: chordEnd, lyricEnd: chordEnd }
      linePairs.push(current)
    }

    if (current) {
      current.lyricEnd = lineStart + line.length
    } else {
      linePairs.push({
        line: lineIndex,
        chord: '',
        chordStart: lineStart,
        chordEnd: lineStart,
        lyricStart: lineStart,
        lyricEnd: lineStart + line.length,
      })
    }

    for (const pair of linePairs) {
      pairs.push(pair)
      if (!pair.chord) continue
      const lyric = line.slice(pair.lyricStart - lineStart, pair.lyricEnd - lineStart)
      const head = lyric.match(/^\S*\s+(?=\S)/)
      if (!head) continue
      const split = pair.lyricStart + head[0].length
      pairs.push({ line: pair.line, chord: '', chordStart: split, chordEnd: split, lyricStart: split, lyricEnd: pair.lyricEnd })
      pair.lyricEnd = split
    }
  }

  return pairs
}

/** Sostituisce (o rimuove, con `chord` vuoto) l'accordo di una coppia. */
export function replaceChord(content: string, pair: SourcePair, chord: string): string {
  const next = chord ? `[${chord}]` : ''
  return content.slice(0, pair.chordStart) + next + content.slice(pair.chordEnd)
}
