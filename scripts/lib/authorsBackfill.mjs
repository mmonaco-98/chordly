import {
  splitAuthors, makeCanon, applyCanon, joinAuthors, hyphenAmbiguities, compareKey, parseAuthorsColumn,
} from '../../src/utils/authors.mjs'

/**
 * Calcola gli aggiornamenti `authors`/`artist`. La sorgente grezza è il backup di `artist`
 * (se esiste per quell'id), così un rilancio dopo una modifica alla mappa riparte dal valore
 * originale e non da quello già derivato.
 */
export function planBackfill(rows, aliases, backup = {}) {
  const raws = rows.map((r) => backup[r.id] ?? r.artist ?? '')
  const split = raws.map((raw) => splitAuthors(raw, aliases))
  const canon = makeCanon(split.flat(), aliases)
  const changes = []
  rows.forEach((row, i) => {
    const authors = applyCanon(split[i], canon)
    const artist = joinAuthors(authors)
    const same = JSON.stringify(parseAuthorsColumn(row.authors)) === JSON.stringify(authors) && (row.artist ?? '') === artist
    if (!same) changes.push({ id: row.id, oldArtist: row.artist ?? '', authors, artist })
  })
  return { changes, report: buildReport(rows, raws, split, canon, aliases) }
}

function buildReport(rows, raws, split, canon, aliases) {
  const variants = new Map() // forma canonica -> Map(variante -> n. righe)
  for (const names of split) {
    for (const name of names) {
      const canonical = canon.get(compareKey(name)) ?? name
      const forms = variants.get(canonical) ?? new Map()
      forms.set(name, (forms.get(name) ?? 0) + 1)
      variants.set(canonical, forms)
    }
  }
  const hyphens = new Map()
  for (const raw of raws) {
    if (hyphenAmbiguities(raw, aliases).length) hyphens.set(raw, (hyphens.get(raw) ?? 0) + 1)
  }
  const bySurname = new Map()
  for (const canonical of variants.keys()) {
    const last = compareKey(canonical.split(/\s+/).at(-1))
    if (last.length < 3) continue
    bySurname.set(last, [...(bySurname.get(last) ?? []), canonical])
  }
  return {
    rows: rows.length,
    authors: variants.size,
    noAuthor: split.filter((names) => names.length === 0).length,
    unresolvedHyphens: [...hyphens].map(([raw, n]) => ({ raw, rows: n })).sort((a, b) => a.raw.localeCompare(b.raw)),
    variantGroups: [...variants]
      .filter(([, forms]) => forms.size > 1)
      .map(([canonical, forms]) => ({
        canonical,
        variants: [...forms].map(([name, n]) => ({ name, rows: n })).sort((a, b) => (a.name < b.name ? -1 : 1)),
      }))
      .sort((a, b) => a.canonical.localeCompare(b.canonical)),
    possibleAliases: [...bySurname.values()]
      .filter((group) => group.length > 1)
      .map((group) => group.sort())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1)),
  }
}

export async function fetchBackfillRows(supabase, page = 1000) {
  const rows = []
  for (let from = 0; ; from += page) {
    const { data, error } = await supabase.from('songs').select('id,artist,authors').order('id').range(from, from + page - 1)
    if (error) throw new Error(`lettura righe: ${error.message} (la colonna authors esiste? eseguire scripts/add-authors-column.sql)`)
    rows.push(...data)
    if (data.length < page) return rows
  }
}

/** Aggiorna per id a lotti paralleli; `updated_at` = now + indice (strettamente crescente). */
export async function updateRows(supabase, updates, now, concurrency = 20) {
  for (let i = 0; i < updates.length; i += concurrency) {
    const results = await Promise.all(
      updates.slice(i, i + concurrency).map((u, j) =>
        supabase.from('songs').update({ ...u.values, updated_at: now + i + j }).eq('id', u.id)),
    )
    const failed = results.find((r) => r.error)
    if (failed) throw new Error(`aggiornamento fallito (lotto ${i}): ${failed.error.message}`)
  }
}
