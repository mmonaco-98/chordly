import type { Song } from '../types'

export interface LetterGroup { letter: string; items: Song[] }

export function groupLetter(title: string): string {
  const first = title.trim().normalize('NFD').replace(/[̀-ͯ]/g, '')[0] ?? ''
  return /[A-Za-z]/.test(first) ? first.toUpperCase() : '#'
}

export function filterAndGroup(songs: Song[], query: string, tag: string | null) {
  const q = query.toLowerCase()
  const filtered = songs
    .filter((s) => {
      if (tag && !s.tags?.includes(tag)) return false
      return s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q)
    })
    .sort((a, b) => a.title.localeCompare(b.title, 'it'))

  const byLetter = new Map<string, Song[]>()
  for (const song of filtered) {
    const l = groupLetter(song.title)
    const arr = byLetter.get(l)
    if (arr) arr.push(song)
    else byLetter.set(l, [song])
  }
  const groups: LetterGroup[] = [...byLetter]
    .sort(([a], [b]) => (a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b)))
    .map(([letter, items]) => ({ letter, items }))
  return { filtered, groups }
}
