import type { Playlist } from '../types'
import { supabase } from './supabaseClient'
import { getCache, setCache } from './cacheStore'

export const PLAYLISTS_KEY = 'playlists'
export const LAST_REFRESH_KEY = 'playlists:lastRefresh'

export function markRefreshed() {
  localStorage.setItem(LAST_REFRESH_KEY, Date.now().toString())
}

export function getCachedPlaylists(): Playlist[] {
  return getCache<Playlist[]>(PLAYLISTS_KEY) ?? []
}

export async function refreshPlaylists(): Promise<Playlist[]> {
  const { data, error } = await supabase
    .from('playlists')
    .select('*')
    .order('position', { ascending: true })
  
  if (error) throw error
  
  const playlists = data.map(row => ({
    id: row.id,
    name: row.name,
    songIds: JSON.parse(row.song_ids as string) as string[],
  }))
  
  setCache(PLAYLISTS_KEY, playlists)
  return playlists
}

export async function createPlaylist(playlist: Playlist): Promise<Playlist> {
  const { error } = await supabase.from('playlists').insert({
    id: playlist.id,
    name: playlist.name,
    song_ids: JSON.stringify(playlist.songIds),
    position: 0,
    updated_at: Date.now(),
  })
  
  if (error) throw error
  await refreshPlaylists()
  markRefreshed()
  return playlist
}

export async function updatePlaylist(playlist: Playlist): Promise<Playlist> {
  const { error } = await supabase
    .from('playlists')
    .update({
      name: playlist.name,
      song_ids: JSON.stringify(playlist.songIds),
      updated_at: Date.now(),
    })
    .eq('id', playlist.id)
  
  if (error) throw error
  await refreshPlaylists()
  markRefreshed()
  return playlist
}

export async function deletePlaylist(id: string): Promise<void> {
  const { error } = await supabase.from('playlists').delete().eq('id', id)
  
  if (error) throw error
  await refreshPlaylists()
  markRefreshed()
}

export async function reorderPlaylists(orderedIds: string[]): Promise<void> {
  const updates = orderedIds.map((id, index) =>
    supabase
      .from('playlists')
      .update({ position: index, updated_at: Date.now() })
      .eq('id', id)
  )
  
  const { error } = await Promise.all(updates).then((results) => {
    const errors = results.map((r) => r.error).filter((e) => e)
    return errors.length > 0 ? { error: errors[0] } : { error: null }
  })
  
  if (error) throw error
  await refreshPlaylists()
  markRefreshed()
}
