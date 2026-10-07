import type { Song } from '../types'

export interface LetterGroup { letter: string; items: Song[] }

export function groupLetter(title: string): string {
  const first = title.trim().normalize('NFD').replace(/[̀-ͯ]/g, '')[0] ?? ''
  return /[A-Za-z]/.test(first) ? first.toUpperCase() : '#'
}

export interface ListFilters { query: string; author: string | null; tag: string | null }

export function filtersFromParams(params: URLSearchParams): ListFilters {
  return { query: params.get('q') ?? '', author: params.get('author') || null, tag: params.get('tag') || null }
}

export function filtersToParams({ query, author, tag }: ListFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (query) params.set('q', query)
  if (author) params.set('author', author)
  if (tag) params.set('tag', tag)
  return params
}

export function uniqueAuthors(songs: Song[]): string[] {
  const authors = new Set(songs.map((s) => s.artist.trim()).filter(Boolean))
  return [...authors].sort((a, b) => a.localeCompare(b, 'it'))
}

export function filterAndGroup(songs: Song[], { query, author, tag }: ListFilters) {
  const q = query.toLowerCase()
  const filtered = songs
    .filter((s) => {
      if (tag && !s.tags?.includes(tag)) return false
      if (author && s.artist.trim() !== author) return false
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
