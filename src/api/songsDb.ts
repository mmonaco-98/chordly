import type { Song } from '../types'

const DB = 'chordly'
const STORE = 'songs'
const META = 'meta'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: 'id' })
      req.result.createObjectStore(META)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = tx.onabort = () => reject(tx.error)
  })
}

function result<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function loadAll(): Promise<{ songs: Song[]; lastUpdatedAt: number }> {
  const db = await open()
  const tx = db.transaction([STORE, META], 'readonly')
  const songs = await result(tx.objectStore(STORE).getAll() as IDBRequest<Song[]>)
  const last = await result(tx.objectStore(META).get('lastUpdatedAt') as IDBRequest<number | undefined>)
  return { songs, lastUpdatedAt: last ?? 0 }
}

/** Sostituisce l'intero contenuto (songs + cursore) in una transazione. */
export async function saveAll(songs: Song[], lastUpdatedAt: number): Promise<void> {
  const db = await open()
  const tx = db.transaction([STORE, META], 'readwrite')
  const store = tx.objectStore(STORE)
  store.clear()
  songs.forEach((s) => store.put(s))
  tx.objectStore(META).put(lastUpdatedAt, 'lastUpdatedAt')
  await done(tx)
}
