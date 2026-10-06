import type { Song } from '../types'
import { supabase } from './supabaseClient'
import { rowToSong, type SongRow } from './songsMerge'

const PAGE = 1000
// Finestra di sovrapposizione: tollera orologi client sfasati e scritture nello stesso ms.
const OVERLAP_MS = 60_000
const IN_CHUNK = 50

// PostgREST taglia a 1000 righe per richiesta: paginare sempre.
export async function fetchAllIds(): Promise<Set<string>> {
  const ids = new Set<string>()
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from('songs').select('id').order('id').range(from, from + PAGE - 1)
    if (error) throw error
    data.forEach((r) => ids.add(r.id as string))
    if (data.length < PAGE) return ids
  }
}

export async function fetchChanged(sinceUpdatedAt: number): Promise<{ songs: Song[]; maxUpdatedAt: number }> {
  const songs: Song[] = []
  let max = sinceUpdatedAt
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('songs').select('*').gt('updated_at', Math.max(0, sinceUpdatedAt - OVERLAP_MS))
      .order('updated_at').order('id').range(from, from + PAGE - 1)
    if (error) throw error
    for (const row of data as SongRow[]) {
      songs.push(rowToSong(row))
      if ((row.updated_at ?? 0) > max) max = row.updated_at ?? 0
    }
    if (data.length < PAGE) return { songs, maxUpdatedAt: max }
  }
}

/** Scarica le canzoni con questi id (recupero di righe sfuggite al cursore). */
export async function fetchByIds(ids: string[]): Promise<Song[]> {
  const songs: Song[] = []
  for (let i = 0; i < ids.length; i += IN_CHUNK) {
    const { data, error } = await supabase.from('songs').select('*').in('id', ids.slice(i, i + IN_CHUNK))
    if (error) throw error
    for (const row of data as SongRow[]) songs.push(rowToSong(row))
  }
  return songs
}
