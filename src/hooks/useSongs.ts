import { useEffect, useSyncExternalStore, useState } from "react";
import type { Song } from "../types";
import {
  refreshSongs,
  SONGS_KEY,
  LAST_REFRESH_KEY,
  markRefreshed,
  createSong as createSongRepo,
  updateSong as updateSongRepo,
  deleteSong as deleteSongRepo,
} from "../api/songsRepo";
import { subscribe, getSnapshot } from "../api/cacheStore";

const TTL_MS = 1000 * 60 * 60; // 1 ora

function shouldRefresh(): boolean {
  const lastRefresh = localStorage.getItem(LAST_REFRESH_KEY);
  if (!lastRefresh) return true;
  const age = Date.now() - parseInt(lastRefresh);
  return age > TTL_MS;
}

export function useSongs(): Song[] {
  const songs = useSyncExternalStore(
    (listener) => subscribe(SONGS_KEY, listener),
    () => getSnapshot<Song[]>(SONGS_KEY, []), // ✅ [] stabile
    () => getSnapshot<Song[]>(SONGS_KEY, []),
  );

  useEffect(() => {
    if (shouldRefresh()) {
      void refreshSongs()
        .then(() => markRefreshed())
        .catch(() => {
          // Offline / unauthorised — keep showing the cached copy.
        });
    }
  }, []);

  return songs;
}

export function useCreateSong() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const create = async (song: Song): Promise<Song> => {
    setIsPending(true);
    setError(null);
    try {
      return await createSongRepo(song);
    } catch (err) {
      const e = err instanceof Error ? err : new Error("Failed to create song");
      setError(e);
      throw e;
    } finally {
      setIsPending(false);
    }
  };

  return { create, isPending, error };
}

export function useUpdateSong() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const update = async (song: Song): Promise<Song> => {
    setIsPending(true);
    setError(null);
    try {
      return await updateSongRepo(song);
    } catch (err) {
      const e = err instanceof Error ? err : new Error("Failed to update song");
      setError(e);
      throw e;
    } finally {
      setIsPending(false);
    }
  };

  return { update, isPending, error };
}

export function useDeleteSong() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const remove = async (id: string): Promise<void> => {
    setIsPending(true);
    setError(null);
    try {
      await deleteSongRepo(id);
    } catch (err) {
      const e = err instanceof Error ? err : new Error("Failed to delete song");
      setError(e);
      throw e;
    } finally {
      setIsPending(false);
    }
  };

  return { remove, isPending, error };
}
