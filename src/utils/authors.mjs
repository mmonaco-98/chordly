// Normalizzazione degli autori: puro, usato da script Node (backfill, sync) e dal client.
export const EMPTY_ALIASES = Object.freeze({ overrides: {}, names: {} })

// Separatori sicuri. Il "-" senza spazi (es. "Jean-Paul", "Avolio-Capacchione") NON separa:
// è ambiguo e lo decide la mappa `overrides` in scripts/authors-aliases.json.
const SEPARATORS = /\s*[,;/]\s*|\s+[-–—]\s+|\s+e\s+/

const clean = (s) => s.replace(/\s+/g, ' ').trim()

/** Chiave di confronto: minuscolo, senza accenti, solo lettere e cifre. */
export function compareKey(name) {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
}

function nameLookup(aliases) {
  return new Map(Object.entries(aliases.names).map(([variant, name]) => [compareKey(variant), name]))
}

/** Spezza la stringa grezza in autori: scarta segnaposto, applica override/alias, deduplica. */
export function splitAuthors(raw, aliases = EMPTY_ALIASES) {
  const text = clean(String(raw ?? ''))
  const tokens = Object.hasOwn(aliases.overrides, text) ? aliases.overrides[text] : text.split(SEPARATORS)
  const lookup = nameLookup(aliases)
  const out = []
  const seen = new Set()
  for (const token of tokens) {
    const name = clean(token)
    if (!compareKey(name)) continue
    const final = lookup.get(compareKey(name)) ?? name
    const key = compareKey(final)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(final)
  }
  return out
}

/**
 * Mappa chiave → forma canonica: la variante più frequente in `names` (a parità, la prima
 * in ordine alfabetico). Alias e override manuali hanno la precedenza.
 */
export function makeCanon(names, aliases = EMPTY_ALIASES) {
  const forms = new Map()
  for (const name of names) {
    const key = compareKey(name)
    if (!key) continue
    const counts = forms.get(key) ?? new Map()
    counts.set(name, (counts.get(name) ?? 0) + 1)
    forms.set(key, counts)
  }
  const canon = new Map()
  for (const [key, counts] of forms) {
    const [best] = [...counts].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0]
    canon.set(key, best)
  }
  const explicit = [...Object.values(aliases.names), ...Object.values(aliases.overrides).flat()]
  for (const name of explicit) {
    const key = compareKey(name)
    if (key) canon.set(key, name)
  }
  return canon
}

/** Porta ogni autore alla forma canonica e deduplica, mantenendo l'ordine. */
export function applyCanon(authors, canon) {
  const out = []
  const seen = new Set()
  for (const author of authors) {
    const key = compareKey(author)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(canon.get(key) ?? author)
  }
  return out
}

export function joinAuthors(authors) {
  return authors.join(', ')
}

/** Autori di una canzone; ripiega su `artist` per righe/cache senza `authors`. */
export function resolveAuthors(authors, artist) {
  if (Array.isArray(authors) && authors.length) return authors
  return compareKey(artist ?? '') ? [clean(artist)] : []
}

/** Campo "Artista" dell'editor: solo virgola e slash, unificato con le forme del catalogo. */
export function parseAuthorsInput(text, canon) {
  const names = String(text ?? '').split(/[,/]/).map(clean).filter((n) => compareKey(n))
  return applyCanon(names, canon)
}

/** Colonna `authors` (testo JSON): mai lanciare, valori malformati → []. */
export function parseAuthorsColumn(value) {
  try {
    const parsed = JSON.parse(value ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

/** Frammenti con "-" senza spazi che né override né alias risolvono (da rivedere a mano). */
export function hyphenAmbiguities(raw, aliases = EMPTY_ALIASES) {
  const text = clean(String(raw ?? ''))
  if (Object.hasOwn(aliases.overrides, text)) return []
  const lookup = nameLookup(aliases)
  return text.split(SEPARATORS).map(clean)
    .filter((t) => compareKey(t) && /\S[-–—]\S/.test(t) && !lookup.has(compareKey(t)))
}
