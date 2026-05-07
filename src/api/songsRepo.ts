import type { Song } from '../types'
import { supabase } from './supabaseClient'
import { getCache, setCache } from './cacheStore'

export const SONGS_KEY = 'songs'
export const LAST_REFRESH_KEY = 'songs:lastRefresh'

export function markRefreshed() {
  localStorage.setItem(LAST_REFRESH_KEY, Date.now().toString())
}

export function getCachedSongs(): Song[] {
  return getCache<Song[]>(SONGS_KEY) ?? []
}

export async function refreshSongs(): Promise<Song[]> {
  const { data, error } = await supabase.from('songs').select('*')
  if (error) throw error
  
  const songs = data.map(row => ({
    id: row.id,
    title: row.title,
    artist: row.artist,
    key: row.song_key,
    bpm: row.bpm,
    content: row.content,
    tags: JSON.parse(row.tags as string) as string[],
  }))
  
  // Normalize content
  const normalized = songs.map((s) => ({
    ...s,
    content: Array.isArray(s.content) ? (s.content as string[]).join('\n') : s.content,
  }))
  
  setCache(SONGS_KEY, normalized)
  return normalized
}

export async function createSong(song: Song): Promise<Song> {
  const { error } = await supabase
    .from('songs')
    .insert({
      id: song.id,
      title: song.title,
      artist: song.artist,
      song_key: song.key,
      bpm: song.bpm,
      content: song.content,
      tags: JSON.stringify(song.tags ?? []),
      updated_at: Date.now(),
    })
  
  if (error) throw error
  await refreshSongs()
  markRefreshed()
  return song
}

export async function updateSong(song: Song): Promise<Song> {
  const { error } = await supabase
    .from('songs')
    .update({
      title: song.title,
      artist: song.artist,
      song_key: song.key,
      bpm: song.bpm,
      content: song.content,
      tags: JSON.stringify(song.tags ?? []),
      updated_at: Date.now(),
    })
    .eq('id', song.id)
  
  if (error) throw error
  await refreshSongs()
  markRefreshed()
  return song
}

export async function deleteSong(id: string): Promise<void> {
  const { error } = await supabase
    .from('songs')
    .delete()
    .eq('id', id)
  
  if (error) throw error
  await refreshSongs()
  markRefreshed()
}
