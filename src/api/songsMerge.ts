import type { Song } from '../types'

export interface SongRow {
  id: string
  title: string
  artist: string
  song_key: string
  bpm: number | null
  content: string | string[]
  tags: string
  updated_at?: number
}

export function rowToSong(row: SongRow): Song {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    key: row.song_key,
    bpm: row.bpm ?? undefined,
    content: Array.isArray(row.content) ? row.content.join('\n') : row.content,
    tags: JSON.parse(row.tags) as string[],
  }
}

export function mergeSongs(local: Song[], changed: Song[], remoteIds: Set<string>): Song[] {
  const byId = new Map(local.filter((s) => remoteIds.has(s.id)).map((s) => [s.id, s]))
  for (const s of changed) byId.set(s.id, s)
  return [...byId.values()]
}
