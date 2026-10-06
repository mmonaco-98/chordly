import { convertCanto, bigCollections } from './convertCanto.mjs'

export const MIN_API_ROWS = 1000
export const DEFAULT_MAX_NEW = 50

export function extractCantoId(id) {
  const m = /-(\d+)$/.exec(id ?? '')
  return m ? m[1] : null
}

export function pickNewSongs(songs, existingIds) {
  const known = new Set()
  for (const id of existingIds) {
    const c = extractCantoId(id)
    if (c !== null) known.add(c)
  }
  return songs.filter((s) => {
    const c = extractCantoId(s.id)
    return c !== null && !known.has(c)
  })
}

export function assertSane({ rawCount, newCount, maxNew }) {
  if (!Number.isInteger(rawCount) || rawCount < MIN_API_ROWS) {
    throw new Error(`API sospetta: ${rawCount} canti (minimo ${MIN_API_ROWS}). Nessuna scrittura.`)
  }
  if (newCount > maxNew) {
    throw new Error(`${newCount} canti nuovi superano il tetto di ${maxNew}. Nessuna scrittura; rilanciare con --max-new <n> se è corretto.`)
  }
}

export function splitParsable(songs, check) {
  const ok = []
  const skipped = []
  for (const s of songs) {
    try { check(s); ok.push(s) } catch (e) { skipped.push({ id: s.id, error: e.message }) }
  }
  return { ok, skipped }
}

export async function fetchCantiRows(url, fetchImpl = fetch) {
  const res = await fetchImpl(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  const data = json?.canti?.data
  if (!Array.isArray(data)) throw new Error('struttura inattesa: canti.data non è un array')
  return data
}

export function convertAll(rows) {
  const big = bigCollections(rows, 5)
  const ids = new Set()
  const songs = []
  const skipped = []
  for (const raw of rows) {
    let song
    try {
      ({ song } = convertCanto(raw, { bigCollections: big }))
      if (!song.title) throw new Error('titolo vuoto')
      if (ids.has(song.id)) throw new Error('id duplicato')
      ids.add(song.id)
      songs.push(song)
    } catch (e) {
      skipped.push({ id: song?.id ?? String(raw?.id_canti ?? '?'), error: e.message })
    }
  }
  return { songs, skipped }
}
