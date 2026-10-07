import type { Song } from '../types'
import { resolveAuthors } from './authors.mjs'

export interface LetterGroup { letter: string; items: Song[] }

export function groupLetter(title: string): string {
  const first = title.trim().normalize('NFD').replace(/[̀-ͯ]/g, '')[0] ?? ''
  return /[A-Za-z]/.test(first) ? first.toUpperCase() : '#'
}

export interface ListFilters { query: string; author: string | null; tag: string | null; inText: boolean }

export function filtersFromParams(params: URLSearchParams): ListFilters {
  return { query: params.get('q') ?? '', author: params.get('author') || null, tag: params.get('tag') || null, inText: params.get('intext') === '1' }
}

export function filtersToParams({ query, author, tag, inText }: ListFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (query) params.set('q', query)
  if (author) params.set('author', author)
  if (tag) params.set('tag', tag)
  if (inText) params.set('intext', '1')
  return params
}

export function uniqueAuthors(songs: Song[]): string[] {
  const authors = new Set(songs.flatMap((s) => resolveAuthors(s.authors, s.artist)))
  return [...authors].sort((a, b) => a.localeCompare(b, 'it'))
}

const lyricsCache = new WeakMap<Song, string>()

function lyricsText(song: Song): string {
  let text = lyricsCache.get(song)
  if (text === undefined) {
    text = (song.content ?? '')
      .replace(/^\s*\{[^}]*\}\s*$/gm, '')
      .replace(/\[[^\]]*\]/g, '')
      .toLowerCase()
    lyricsCache.set(song, text)
  }
  return text
}

export function filterAndGroup(songs: Song[], { query, author, tag, inText }: ListFilters) {
  const q = query.toLowerCase()
  const filtered = songs
    .filter((s) => {
      if (tag && !s.tags?.includes(tag)) return false
      if (author && !resolveAuthors(s.authors, s.artist).includes(author)) return false
      return s.title.toLowerCase().includes(q) || (inText && lyricsText(s).includes(q))
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
