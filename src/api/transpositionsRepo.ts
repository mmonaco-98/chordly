import { supabase } from './supabaseClient'
import { getCache, setCache } from './cacheStore'

export const TRANSPOSITIONS_KEY = 'transpositions'
export const LAST_REFRESH_KEY = 'transpositions:lastRefresh'

export type TranspositionMap = Record<string, number>

export function markRefreshed() {
  localStorage.setItem(LAST_REFRESH_KEY, Date.now().toString())
}

export function getCachedTranspositions(): TranspositionMap {
  return getCache<TranspositionMap>(TRANSPOSITIONS_KEY) ?? {}
}

export async function refreshTranspositions(): Promise<TranspositionMap> {
  const { data, error } = await supabase.from('transpositions').select('*')
  
  if (error) throw error
  
  const map = Object.fromEntries(data.map(row => [row.song_id, row.semitones]))
  setCache(TRANSPOSITIONS_KEY, map)
  return map
}

export async function setTransposition(songId: string, semitones: number): Promise<void> {
  if (semitones === 0) {
    const { error } = await supabase.from('transpositions').delete().eq('song_id', songId)
    if (error) throw error
  } else {
    const { error } = await supabase.from('transpositions').upsert({
      song_id: songId,
      semitones,
      updated_at: Date.now(),
    })
    if (error) throw error
  }
  
  await refreshTranspositions()
  markRefreshed()
}
