import { useEffect, useSyncExternalStore, useState } from "react";
import type { Song } from "../types";
import {
  refreshSongs,
  SONGS_KEY,
  createSong as createSongRepo,
  updateSong as updateSongRepo,
  deleteSong as deleteSongRepo,
} from "../api/songsRepo";
import { subscribe, getSnapshot } from "../api/cacheStore";

export function useSongs(): Song[] {
  const songs = useSyncExternalStore(
    (listener) => subscribe(SONGS_KEY, listener),
    () => getSnapshot<Song[]>(SONGS_KEY, []),
    () => getSnapshot<Song[]>(SONGS_KEY, []),
  );

  useEffect(() => {
    // Network-first: tenta sempre BE al mount
    void refreshSongs()
      .catch(() => {
        // BE fallito → resta su cache, nessun errore a UI
      });
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
