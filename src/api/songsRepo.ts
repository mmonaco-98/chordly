import type { Song } from '../types'
import { supabase } from './supabaseClient'
import { fetchAllIds, fetchChanged, fetchByIds } from './songsSync'
import { mergeSongs, missingIds } from './songsMerge'
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
  // Auto-riparazione: righe remote che né la cache né il cursore hanno visto
  const missing = missingIds(local, changed.songs, ids)
  const recovered = missing.length ? await fetchByIds(missing) : []
  const all = [...changed.songs, ...recovered]
  const merged = mergeSongs(local, all, ids)
  const unchanged = all.length === 0 && merged.length === local.length
  if (!unchanged) await setSongs(merged, changed.maxUpdatedAt)
  return unchanged ? local : merged
}

/** Applica subito alla cache locale una canzone appena scritta (non dipende dal cursore/orologio). */
async function applyLocal(song: Song): Promise<void> {
  const local = getSongsSnapshot()
  const saved = { ...song, tags: song.tags ?? [] }
  const next = local.some((s) => s.id === song.id)
    ? local.map((s) => (s.id === song.id ? saved : s))
    : [...local, saved]
  await setSongs(next, getLastUpdatedAt())
}

async function refreshQuietly(): Promise<void> {
  try { await refreshSongs() } catch { /* scrittura già riuscita: la rete può fallire dopo */ }
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
  await applyLocal(song)
  await refreshQuietly()
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
  await applyLocal(song)
  await refreshQuietly()
  markRefreshed()
  return song
}

export async function deleteSong(id: string): Promise<void> {
  const { error } = await supabase
    .from('songs')
    .delete()
    .eq('id', id)
  
  if (error) throw error
  await setSongs(getSongsSnapshot().filter((s) => s.id !== id), getLastUpdatedAt())
  await refreshQuietly()
  markRefreshed()
}
