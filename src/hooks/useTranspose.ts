import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import ChordSheetJS, { Key as ChordKey } from 'chordsheetjs'
import type { Song } from '../types'
import { subscribe } from '../api/cacheStore'
import {
  TRANSPOSITIONS_KEY,
  getCachedTranspositions,
  refreshTranspositions,
  setTransposition,
} from '../api/transpositionsRepo'

const SHARP_KEYS = new Set([
  'G', 'D', 'A', 'E', 'B', 'F#', 'C#',
  'Em', 'Bm', 'F#m', 'C#m', 'G#m', 'D#m', 'A#m',
])
const FLAT_KEYS = new Set([
  'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb',
  'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm', 'Abm',
])

const ENHARMONIC_NORMALIZE: Record<string, string> = {
  'D#': 'Eb',
  'D#m': 'Ebm',
  'E#': 'F',
  'A#': 'Bb',
  'A#m': 'Bbm',
  'B#': 'C',
  Fb: 'E',
  Cb: 'B',
}

const ENHARMONIC_ROOTS: [RegExp, string][] = [
  [/B#/g, 'C'],
  [/E#/g, 'F'],
  [/Fb/g, 'E'],
  [/Cb/g, 'B'],
]

function normalizeEnharmonics(chordpro: string): string {
  return chordpro.replace(/\[([^\]]+)\]/g, (_match, inner: string) => {
    let result = inner
    for (const [from, to] of ENHARMONIC_ROOTS) {
      result = result.replace(from, to)
    }
    return `[${result}]`
  })
}

function accidentalForKey(keyName: string): '#' | 'b' | undefined {
  const normalized = ENHARMONIC_NORMALIZE[keyName] ?? keyName
  if (SHARP_KEYS.has(normalized)) return '#'
  if (FLAT_KEYS.has(normalized)) return 'b'
  return undefined
}

export function useTranspose(song: Song) {
  const map = useSyncExternalStore(
    (listener) => subscribe(TRANSPOSITIONS_KEY, listener),
    () => getCachedTranspositions(),
    () => getCachedTranspositions(),
  )

  useEffect(() => {
    void refreshTranspositions().catch(() => {})
  }, [])

  const persistedSemitones = map[song.id] ?? 0
  const [displaySemitones, setDisplaySemitones] = useState(persistedSemitones)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const skipSyncRef = useRef(false)

  useEffect(() => {
    if (skipSyncRef.current) {
      skipSyncRef.current = false
      return
    }
    setDisplaySemitones(persistedSemitones)
  }, [persistedSemitones])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  useEffect(() => {
    if (displaySemitones === persistedSemitones) return

    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(() => {
      void setTransposition(song.id, displaySemitones)
      timerRef.current = null
    }, 500)
  }, [displaySemitones, song.id, persistedSemitones])

  const update = (next: number) => {
    setDisplaySemitones(next)
  }

  const transposed = useMemo(() => {
    try {
      const parser = new ChordSheetJS.ChordProParser()
      const sheet = parser.parse(song.content)
      const targetKeyName =
        ChordKey.wrap(song.key)?.transpose(displaySemitones)?.toString() ?? ''
      const accidental = accidentalForKey(targetKeyName)
      const transposedSheet = sheet.transpose(
        displaySemitones,
        accidental ? { accidental } : {},
      )
      const formatter = new ChordSheetJS.ChordProFormatter({
        normalizeChords: false,
      })
      return normalizeEnharmonics(formatter.format(transposedSheet))
    } catch {
      return song.content
    }
  }, [song, displaySemitones])

  return {
    transposed,
    semitones: displaySemitones,
    up: () => update(displaySemitones + 1),
    down: () => update(displaySemitones - 1),
    reset: () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      skipSyncRef.current = true
      setDisplaySemitones(0)
      void setTransposition(song.id, 0)
    },
  }
}
