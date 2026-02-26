import { useState } from 'react'
import type { Playlist } from '../types'

export const FAVORITES_ID = '__fav__'
export const FAVORITES_NAME = 'Preferiti'

const KEY = 'playlists'

function loadPlaylists(): Playlist[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

export function usePlaylists() {
  const [playlists, setPlaylists] = useState<Playlist[]>(loadPlaylists)

  const save = (next: Playlist[]) => {
    setPlaylists(next)
    localStorage.setItem(KEY, JSON.stringify(next))
  }

  const toggleSong = (playlistId: string, songId: string) => {
    let list = playlists
    if (!list.find((p) => p.id === playlistId)) {
      // lazy-create favorites playlist
      list = [{ id: FAVORITES_ID, name: FAVORITES_NAME, songIds: [] }, ...list]
    }
    save(
      list.map((p) =>
        p.id !== playlistId
          ? p
          : {
              ...p,
              songIds: p.songIds.includes(songId)
                ? p.songIds.filter((id) => id !== songId)
                : [...p.songIds, songId],
            }
      )
    )
  }

  const toggleFavorite = (songId: string) => toggleSong(FAVORITES_ID, songId)

  const isFavorite = (songId: string) =>
    playlists.find((p) => p.id === FAVORITES_ID)?.songIds.includes(songId) ?? false

  const isSongInPlaylist = (playlistId: string, songId: string) =>
    playlists.find((p) => p.id === playlistId)?.songIds.includes(songId) ?? false

  const createPlaylist = (name: string): Playlist => {
    const p: Playlist = { id: Date.now().toString(), name, songIds: [] }
    save([...playlists, p])
    return p
  }

  const deletePlaylist = (id: string) => save(playlists.filter((p) => p.id !== id))

  const reorderSongs = (playlistId: string, newSongIds: string[]) => {
    save(
      playlists.map((p) =>
        p.id !== playlistId ? p : { ...p, songIds: newSongIds }
      )
    )
  }

  const favorites = playlists.find((p) => p.id === FAVORITES_ID)
  const customPlaylists = playlists.filter((p) => p.id !== FAVORITES_ID)

  return {
    playlists,
    favorites,
    customPlaylists,
    toggleFavorite,
    isFavorite,
    toggleSong,
    isSongInPlaylist,
    createPlaylist,
    deletePlaylist,
    reorderSongs,
  }
}
