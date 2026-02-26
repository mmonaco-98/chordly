import { useState, useEffect, useMemo } from 'react'
import ChordSheetJS from 'chordsheetjs'
import type { Song } from '../types'

const storageKey = (id: string) => `transpose_${id}`

export function useTranspose(song: Song) {
  const [semitones, setSemitones] = useState<number>(() => {
    const saved = localStorage.getItem(storageKey(song.id))
    return saved ? parseInt(saved, 10) : 0
  })

  useEffect(() => {
    if (semitones === 0) {
      localStorage.removeItem(storageKey(song.id))
    } else {
      localStorage.setItem(storageKey(song.id), String(semitones))
    }
  }, [song.id, semitones])

  useEffect(() => {
    const saved = localStorage.getItem(storageKey(song.id))
    setSemitones(saved ? parseInt(saved, 10) : 0)
  }, [song.id])

  const transposed = useMemo(() => {
    try {
      const parser = new ChordSheetJS.ChordProParser()
      const sheet = parser.parse(song.content)
      const transposedSheet = sheet.transpose(semitones)
      const formatter = new ChordSheetJS.ChordProFormatter()
      return formatter.format(transposedSheet)
    } catch {
      return song.content
    }
  }, [song, semitones])

  return {
    transposed,
    semitones,
    up: () => setSemitones((s) => s + 1),
    down: () => setSemitones((s) => s - 1),
    reset: () => setSemitones(0),
  }
}
