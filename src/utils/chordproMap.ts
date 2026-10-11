/**
 * Una colonna dell'HTML di chordsheetjs, nello stesso ordine in cui compare, vista dal sorgente
 * ChordPro. Le posizioni sono offset nel sorgente. Senza accordo (`chord === ''`)
 * chordStart e chordEnd coincidono con lyricStart.
 *
 * chordsheetjs divide una sola volta il testo che segue un accordo: la prima parola (con gli
 * spazi che la seguono) resta sotto l'accordo, il resto diventa una colonna senza accordo.
 * Il testo prima del primo accordo, e quello delle annotazioni `[*..]`, non viene diviso.
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
  const lines = content.split('\n')
  let offset = 0

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const raw = lines[lineIndex]
    const lineStart = offset
    offset += raw.length + 1

    const line = raw.endsWith('\r') ? raw.slice(0, -1) : raw
    if (!line.trim()) continue

    const blank = (at: number, end: number): SourcePair => ({
      line: lineIndex,
      chord: '',
      chordStart: lineStart + at,
      chordEnd: lineStart + at,
      lyricStart: lineStart + at,
      lyricEnd: lineStart + end,
    })

    // `#` a inizio riga: commento. L'eventuale rientro che lo precede resta una colonna.
    const hash = line.match(/^(\s*)#/)
    if (hash) {
      if (hash[1].length > 0) pairs.push(blank(0, hash[1].length))
      continue
    }

    const linePairs: SourcePair[] = []
    let current: SourcePair | null = null
    let cursor = 0

    // Il testo tra due token allunga la colonna corrente, o ne apre una senza accordo.
    const addText = (end: number) => {
      if (end <= cursor) return
      if (current) current.lyricEnd = lineStart + end
      else {
        current = blank(cursor, end)
        linePairs.push(current)
      }
    }

    // Una direttiva `{..}` può stare ovunque nella riga e chiude la colonna corrente.
    for (const m of line.matchAll(/\{[^}]*\}|\[([^\]]*)\]/g)) {
      const index = m.index ?? 0
      addText(index)
      cursor = index + m[0].length
      if (m[0].startsWith('{')) {
        current = null
        continue
      }
      const chordStart = lineStart + index
      const chordEnd = chordStart + m[0].length
      if (m[1].startsWith('*')) {
        // Annotazione `[*..]`: colonna a sé, senza accordo e senza divisione del testo.
        current = { ...blank(cursor, cursor), lyricStart: chordEnd, lyricEnd: chordEnd }
        current.chordStart = current.chordEnd = chordEnd
      } else {
        current = { line: lineIndex, chord: m[1], chordStart, chordEnd, lyricStart: chordEnd, lyricEnd: chordEnd }
      }
      linePairs.push(current)
    }
    addText(line.length)

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
