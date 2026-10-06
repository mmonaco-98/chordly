import type { Song } from '../types'
import { loadAll, saveAll } from './songsDb'

const LEGACY_KEY = 'cache:songs'
const EMPTY: Song[] = []

let songs: Song[] = EMPTY
let lastUpdatedAt = 0
const listeners = new Set<() => void>()

export function getSongsSnapshot(): Song[] { return songs }
export function getLastUpdatedAt(): number { return lastUpdatedAt }
export function subscribeSongs(l: () => void): () => void {
  listeners.add(l)
  return () => { listeners.delete(l) }
}

/** Aggiorna memoria + listener subito; persiste su IndexedDB senza mai lanciare. */
export async function setSongs(next: Song[], cursor: number): Promise<void> {
  songs = next
  lastUpdatedAt = cursor
  listeners.forEach((l) => l())
  try { await saveAll(next, cursor) } catch { /* IndexedDB non disponibile: resta la memoria */ }
}

/** Da attendere prima del primo render. Migra la vecchia cache localStorage. */
export async function initSongsStore(): Promise<void> {
  try {
    const stored = await loadAll()
    songs = stored.songs.length ? stored.songs : EMPTY
    lastUpdatedAt = stored.lastUpdatedAt
  } catch { /* nessuna cache persistente */ }
  try {
    if (songs === EMPTY) {
      const legacy = localStorage.getItem(LEGACY_KEY)
      if (legacy) {
        const legacySongs = JSON.parse(legacy) as Song[]
        songs = legacySongs // subito disponibile, anche se IndexedDB non lo è
        await saveAll(legacySongs, 0) // cursore a 0: il primo refresh riallinea
        localStorage.removeItem(LEGACY_KEY) // solo a salvataggio riuscito
      }
    } else {
      localStorage.removeItem(LEGACY_KEY)
    }
  } catch { /* la chiave legacy resta: nessuna perdita di cache offline */ }
}

/** "Cancella cache": svuota canzoni e cursore (forza un riscaricamento completo). */
export async function clearSongsStore(): Promise<void> {
  songs = EMPTY
  lastUpdatedAt = 0
  listeners.forEach((l) => l())
  try { await saveAll([], 0) } catch { /* ignora */ }
  try { localStorage.removeItem(LEGACY_KEY) } catch { /* ignora */ }
}
