import type { Song } from '../types'
import { supabase } from './supabaseClient'
import { fetchAllIds, fetchChanged } from './songsSync'
import { mergeSongs } from './songsMerge'
import { getSongsSnapshot, getLastUpdatedAt, setSongs } from './songsStore'

export const LAST_REFRESH_KEY = 'songs:lastRefresh'

export function markRefreshed() {
  localStorage.setItem(LAST_REFRESH_KEY, Date.now().toString())
}

export function getCachedSongs(): Song[] {
  return getSongsSnapshot()
}

export async function refreshSongs(): Promise<Song[]> {
  const local = getSongsSnapshot()
  const [ids, changed] = await Promise.all([fetchAllIds(), fetchChanged(getLastUpdatedAt())])
  const merged = mergeSongs(local, changed.songs, ids)
  const unchanged = changed.songs.length === 0 && merged.length === local.length
  if (!unchanged) await setSongs(merged, changed.maxUpdatedAt)
  return unchanged ? local : merged
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
