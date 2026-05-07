import { useEffect, useSyncExternalStore } from 'react'
import type { Playlist } from '../types'
import { subscribe } from '../api/cacheStore'
import {
  PLAYLISTS_KEY,
  createPlaylist,
  deletePlaylist,
  getCachedPlaylists,
  refreshPlaylists,
  reorderPlaylists,
  updatePlaylist,
} from '../api/playlistsRepo'

export const FAVORITES_ID = '__fav__'
export const FAVORITES_NAME = 'Preferiti'

export function usePlaylists() {
  const playlists = useSyncExternalStore(
    (listener) => subscribe(PLAYLISTS_KEY, listener),
    () => getCachedPlaylists(),
    () => getCachedPlaylists(),
  )

  useEffect(() => {
    void refreshPlaylists().catch(() => {
      // Offline / error — cache keeps the UI alive.
    })
  }, [])

  const ensureFavorites = (list: Playlist[]): Playlist[] => {
    if (list.find((p) => p.id === FAVORITES_ID)) return list
    const fav: Playlist = { id: FAVORITES_ID, name: FAVORITES_NAME, songIds: [] }
    void createPlaylist(fav)
    return [fav, ...list]
  }

  const toggleSong = (playlistId: string, songId: string) => {
    const list = ensureFavorites(playlists)
    const target = list.find((p) => p.id === playlistId)
    if (!target) return
    const nextIds = target.songIds.includes(songId)
      ? target.songIds.filter((id) => id !== songId)
      : [...target.songIds, songId]
    void updatePlaylist({ ...target, songIds: nextIds })
  }

  const toggleFavorite = (songId: string) => toggleSong(FAVORITES_ID, songId)

  const isFavorite = (songId: string) =>
    playlists.find((p) => p.id === FAVORITES_ID)?.songIds.includes(songId) ?? false

  const isSongInPlaylist = (playlistId: string, songId: string) =>
    playlists.find((p) => p.id === playlistId)?.songIds.includes(songId) ?? false

  const createPlaylistLocal = (name: string): Playlist => {
    const p: Playlist = { id: Date.now().toString(), name, songIds: [] }
    void createPlaylist(p)
    return p
  }

  const deletePlaylistLocal = (id: string) => {
    void deletePlaylist(id)
  }

  const reorderSongs = (playlistId: string, newSongIds: string[]) => {
    const target = playlists.find((p) => p.id === playlistId)
    if (!target) return
    void updatePlaylist({ ...target, songIds: newSongIds })
  }

  const addSongs = (playlistId: string, newSongIds: string[]) => {
    const list = ensureFavorites(playlists)
    const target = list.find((p) => p.id === playlistId)
    if (!target) return
    const toAdd = newSongIds.filter((id) => !target.songIds.includes(id))
    if (toAdd.length === 0) return
    void updatePlaylist({ ...target, songIds: [...target.songIds, ...toAdd] })
  }

  const reorderPlaylistsLocal = (newCustomIds: string[]) => {
    const ids = playlists.find((p) => p.id === FAVORITES_ID)
      ? [FAVORITES_ID, ...newCustomIds]
      : newCustomIds
    void reorderPlaylists(ids)
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
    createPlaylist: createPlaylistLocal,
    deletePlaylist: deletePlaylistLocal,
    addSongs,
    reorderSongs,
    reorderPlaylists: reorderPlaylistsLocal,
  }
}
