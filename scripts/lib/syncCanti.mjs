import { convertCanto, bigCollections } from './convertCanto.mjs'
import {
  makeCanon, applyCanon, joinAuthors, hyphenAmbiguities, parseAuthorsColumn, EMPTY_ALIASES,
} from '../../src/utils/authors.mjs'

export const MIN_API_ROWS = 1000
export const DEFAULT_MAX_NEW = 50
const MAX_UNCONVERTIBLE_RATIO = 0.05

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

export function convertAll(rows, aliases = EMPTY_ALIASES) {
  const big = bigCollections(rows, 5)
  const ids = new Set()
  const songs = []
  const skipped = []
  for (const raw of rows) {
    let song
    try {
      ({ song } = convertCanto(raw, { bigCollections: big, aliases }))
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

/** Tutti gli autori presenti nel DB (occorrenze, per calcolare la forma canonica più frequente). */
export async function listAllAuthors(supabase, page = 1000) {
  const names = []
  for (let from = 0; ; from += page) {
    const { data, error } = await supabase.from('songs').select('authors').order('id').range(from, from + page - 1)
    if (error) throw new Error(`lettura autori: ${error.message}`)
    for (const r of data) names.push(...parseAuthorsColumn(r.authors))
    if (data.length < page) return names
  }
}

/** Uniforma gli autori dei canti nuovi alle forme già presenti nel DB. */
export function canonicalizeSongs(songs, existingNames, aliases = EMPTY_ALIASES) {
  // le forme già nel DB hanno la precedenza; per gli autori nuovi vale la frequenza tra i canti nuovi
  const canon = new Map([
    ...makeCanon(songs.flatMap((s) => s.authors ?? []), aliases),
    ...makeCanon(existingNames, aliases),
  ])
  return songs.map((s) => {
    if (!Array.isArray(s.authors)) return s
    const authors = applyCanon(s.authors, canon)
    return { ...s, authors, artist: joinAuthors(authors) }
  })
}

export async function insertSongs(supabase, songs, now, batch = 100) {
  for (let i = 0; i < songs.length; i += batch) {
    const rows = songs.slice(i, i + batch).map((s, j) => ({
      id: s.id, title: s.title, artist: s.artist, song_key: s.key, bpm: null,
      content: s.content, tags: JSON.stringify(s.tags), authors: JSON.stringify(s.authors ?? []), updated_at: now + i + j,
    }))
    const { error } = await supabase.from('songs').upsert(rows, { onConflict: 'id', ignoreDuplicates: true })
    if (error) throw new Error(`batch ${i}: ${error.message}`)
  }
}

export async function runSync({
  supabase, fetchRows, convertAll, check, yes,
  maxNew = DEFAULT_MAX_NEW, now = Date.now(), log = console.log, aliases = EMPTY_ALIASES,
}) {
  const rows = await fetchRows()
  const { songs, skipped: unconvertible } = convertAll(rows, aliases)
  if (unconvertible.length > rows.length * MAX_UNCONVERTIBLE_RATIO) {
    throw new Error(`${unconvertible.length}/${rows.length} canti inconvertibili: schema API cambiato? Nessuna scrittura.`)
  }
  const existing = await listCantiIds(supabase)
  const fresh = pickNewSongs(songs, existing)
  assertSane({ rawCount: rows.length, newCount: fresh.length, maxNew })
  const { ok: parsed, skipped: unparsable } = splitParsable(fresh, check)
  const ok = parsed.length ? canonicalizeSongs(parsed, await listAllAuthors(supabase), aliases) : parsed
  for (const s of ok) {
    for (const a of s.authors ?? []) {
      if (hyphenAmbiguities(a, aliases).length) log(`  ? ${s.id}: autore con "-" da verificare in scripts/authors-aliases.json: ${a}`)
    }
  }
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
