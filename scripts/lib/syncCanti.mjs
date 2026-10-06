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

export async function listCantiIds(supabase, page = 1000) {
  const ids = []
  for (let from = 0; ; from += page) {
    const { data, error } = await supabase.from('songs').select('id')
      .like('tags', '%"canticristiani"%').order('id').range(from, from + page - 1)
    if (error) throw new Error(`lettura id: ${error.message}`)
    ids.push(...data.map((r) => r.id))
    if (data.length < page) return ids
  }
}

export async function insertSongs(supabase, songs, now, batch = 100) {
  for (let i = 0; i < songs.length; i += batch) {
    const rows = songs.slice(i, i + batch).map((s, j) => ({
      id: s.id, title: s.title, artist: s.artist, song_key: s.key, bpm: null,
      content: s.content, tags: JSON.stringify(s.tags), updated_at: now + i + j,
    }))
    const { error } = await supabase.from('songs').upsert(rows, { onConflict: 'id', ignoreDuplicates: true })
    if (error) throw new Error(`batch ${i}: ${error.message}`)
  }
}

export async function runSync({
  supabase, fetchRows, convertAll, check, yes,
  maxNew = DEFAULT_MAX_NEW, now = Date.now(), log = console.log,
}) {
  const rows = await fetchRows()
  const { songs, skipped: unconvertible } = convertAll(rows)
  const existing = await listCantiIds(supabase)
  const fresh = pickNewSongs(songs, existing)
  assertSane({ rawCount: rows.length, newCount: fresh.length, maxNew })
  const { ok, skipped: unparsable } = splitParsable(fresh, check)
  const skipped = [...unconvertible, ...unparsable]
  log(`API: ${rows.length}; in DB: ${existing.length}; nuovi: ${fresh.length}; saltati: ${skipped.length}`)
  for (const s of skipped) log(`  saltato ${s.id}: ${s.error}`)
  let inserted = 0
  if (!yes) {
    log(`dry-run: ${ok.length} canti da inserire, nessuna scrittura. Rilanciare con --yes`)
  } else if (ok.length > 0) {
    await insertSongs(supabase, ok, now)
    inserted = ok.length
    for (const s of ok) log(`  + ${s.id}`)
  }
  return { apiCount: rows.length, existingCount: existing.length, newCount: fresh.length, inserted, skipped }
}
