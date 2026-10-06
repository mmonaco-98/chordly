import type { Song } from '../types'
import { supabase } from './supabaseClient'
import { rowToSong, type SongRow } from './songsMerge'

const PAGE = 1000

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
      .from('songs').select('*').gt('updated_at', sinceUpdatedAt)
      .order('updated_at').order('id').range(from, from + PAGE - 1)
    if (error) throw error
    for (const row of data as SongRow[]) {
      songs.push(rowToSong(row))
      if ((row.updated_at ?? 0) > max) max = row.updated_at ?? 0
    }
    if (data.length < PAGE) return { songs, maxUpdatedAt: max }
  }
}
