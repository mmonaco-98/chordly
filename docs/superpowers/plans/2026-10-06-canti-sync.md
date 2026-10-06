# Sync periodico canti Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un job GitHub Actions giornaliero importa su Supabase i canti nuovi di canticristiani.it, convertiti con il convertitore esistente.

**Architecture:** Nuovo sottocomando `sync` in `scripts/import-canti.mjs`. La logica vive in `scripts/lib/syncCanti.mjs` con dipendenze iniettate (fetch, Supabase, parse check), quindi si testa senza rete. Un workflow YAML sottile lancia `npm run import:sync -- --yes`.

**Tech Stack:** Node 22 (ESM `.mjs`), `@supabase/supabase-js`, `chordsheetjs`, vitest, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-06-canti-sync-design.md`

## Global Constraints

- Solo canti nuovi: mai UPDATE/DELETE; insert con `upsert(..., { onConflict: 'id', ignoreDuplicates: true })`.
- Confronto "è nuovo" sul suffisso numerico `id_canti` dell'id (`slug-id_canti`), non sull'id completo.
- Guardie: fallisce senza scrivere se l'API ha meno di 1000 canti o i nuovi superano 50 (default, alzabile con `--max-new` / env `MAX_NEW`).
- Lotti da 100; `updated_at` strettamente crescente a partire da `Date.now()`.
- Senza `--yes` nessuna scrittura (dry-run).
- Cron `0 6 * * *` (UTC) + `workflow_dispatch`; Node 22; secret `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- Nessuna modifica all'app client (`src/`).
- Codice come lo script esistente: ESM, niente punto e virgola, apici singoli, commenti rari e in italiano.

## Deviazioni dalla spec (decise scrivendo il piano)

1. **Existing ids filtrati per tag.** `listCantiIds` legge solo le righe con tag `canticristiani` (`like '%"canticristiani"%'`). Senza filtro, un canto creato a mano con id tipo `mia-canzone-7` farebbe credere che il canto 7 di canticristiani sia già importato.
2. **Riga inconvertibile → saltata e segnalata**, non fallimento del job. Un solo canto upstream con titolo vuoto o `titolo` mancante non deve bloccare per sempre tutti gli import futuri.
3. **Documentazione solo in `CLAUDE.md`.** `INSTALL.md` parla di installazione su iPhone, non di import.

## Review Focus

- Titolo cambiato upstream per un canto già importato → non deve creare un duplicato (Task 1).
- Canto creato a mano con id che finisce in `-<numero>` → non deve bloccare l'import del canto omonimo (Task 2, filtro tag).
- API vuota, troncata o con struttura sbagliata → nessuna scrittura, job in errore (Task 1 e 2).
- Rilancio subito dopo un sync riuscito → 0 inserimenti (idempotenza, Task 2).
- Più di 1000 canti in DB → la lettura degli id deve paginare (Task 2).

---

### Task 1: Funzioni pure (`syncCanti.mjs`)

**Files:**
- Create: `scripts/lib/syncCanti.mjs`
- Test: `scripts/lib/syncCanti.test.mjs`

**Interfaces:**
- Produces:
  - `MIN_API_ROWS = 1000`, `DEFAULT_MAX_NEW = 50`
  - `extractCantoId(id: string): string | null`
  - `pickNewSongs(songs: Song[], existingIds: string[]): Song[]` (`Song` = `{ id, title, artist, key, content, tags }`)
  - `assertSane({ rawCount: number, newCount: number, maxNew: number }): void` (lancia `Error`)
  - `splitParsable(songs, check): { ok: Song[], skipped: { id: string, error: string }[] }` (`check(song)` lancia se il canto non è valido)
  - `fetchCantiRows(url: string, fetchImpl?: typeof fetch): Promise<object[]>`
  - `convertAll(rows): { songs: Song[], skipped: { id: string, error: string }[] }`

- [ ] **Step 1: Scrivere i test che falliscono**

```js
// scripts/lib/syncCanti.test.mjs
import { describe, it, expect } from 'vitest'
import {
  extractCantoId, pickNewSongs, assertSane, splitParsable, fetchCantiRows, convertAll,
  MIN_API_ROWS, DEFAULT_MAX_NEW,
} from './syncCanti.mjs'

const song = (id) => ({ id, title: id, artist: '', key: '', content: '', tags: ['canticristiani'] })

describe('extractCantoId', () => {
  it('estrae il suffisso numerico', () => {
    expect(extractCantoId('abba-misericordia-1')).toBe('1')
    expect(extractCantoId('acclamate-al-signore-1234')).toBe('1234')
  })
  it('funziona con slug vuoto', () => {
    expect(extractCantoId('-77')).toBe('77')
  })
  it('null se non c\'è suffisso numerico', () => {
    expect(extractCantoId('mia-canzone')).toBeNull()
    expect(extractCantoId('')).toBeNull()
    expect(extractCantoId(undefined)).toBeNull()
  })
})

describe('pickNewSongs', () => {
  it('id_canti già presente con titolo diverso: non è nuovo', () => {
    const out = pickNewSongs([song('nuovo-titolo-5')], ['vecchio-titolo-5'])
    expect(out).toEqual([])
  })
  it('id_canti assente: è nuovo', () => {
    const out = pickNewSongs([song('a-5'), song('b-6')], ['x-5'])
    expect(out.map((s) => s.id)).toEqual(['b-6'])
  })
  it('ignora gli id esistenti senza suffisso numerico', () => {
    const out = pickNewSongs([song('a-5')], ['mia-canzone'])
    expect(out.map((s) => s.id)).toEqual(['a-5'])
  })
})

describe('assertSane', () => {
  it('ok al limite', () => {
    expect(() => assertSane({ rawCount: MIN_API_ROWS, newCount: DEFAULT_MAX_NEW, maxNew: DEFAULT_MAX_NEW })).not.toThrow()
  })
  it('troppo pochi canti dall\'API', () => {
    expect(() => assertSane({ rawCount: MIN_API_ROWS - 1, newCount: 0, maxNew: 50 })).toThrow(/API/)
  })
  it('rawCount non numerico', () => {
    expect(() => assertSane({ rawCount: undefined, newCount: 0, maxNew: 50 })).toThrow(/API/)
  })
  it('troppi canti nuovi', () => {
    expect(() => assertSane({ rawCount: 1500, newCount: 51, maxNew: 50 })).toThrow(/--max-new/)
  })
})

describe('splitParsable', () => {
  it('salta i canti che fanno lanciare check e prosegue con gli altri', () => {
    const check = (s) => { if (s.id === 'rotto-2') throw new Error('boom') }
    const { ok, skipped } = splitParsable([song('a-1'), song('rotto-2'), song('b-3')], check)
    expect(ok.map((s) => s.id)).toEqual(['a-1', 'b-3'])
    expect(skipped).toEqual([{ id: 'rotto-2', error: 'boom' }])
  })
})

describe('fetchCantiRows', () => {
  const resp = (body, ok = true, status = 200) => ({ ok, status, json: async () => body })
  it('restituisce canti.data', async () => {
    const rows = await fetchCantiRows('u', async () => resp({ canti: { data: [{ id_canti: '1' }] } }))
    expect(rows).toEqual([{ id_canti: '1' }])
  })
  it('errore HTTP', async () => {
    await expect(fetchCantiRows('u', async () => resp({}, false, 503))).rejects.toThrow(/503/)
  })
  it('struttura inattesa', async () => {
    await expect(fetchCantiRows('u', async () => resp({ canti: {} }))).rejects.toThrow(/struttura/)
  })
})

describe('convertAll', () => {
  const raw = (over = {}) => ({ id_canti: '4', titolo: 'Ciao Mondo', autore: 'X', raccolta: '', accordi: '[DO]Ciao', testo: 'Ciao', ...over })
  it('converte tutti i canti', () => {
    const { songs, skipped } = convertAll([raw(), raw({ id_canti: '5', titolo: 'Altro' })])
    expect(songs.map((s) => s.id)).toEqual(['ciao-mondo-4', 'altro-5'])
    expect(skipped).toEqual([])
  })
  it('salta titolo mancante, titolo vuoto e id duplicato', () => {
    const { songs, skipped } = convertAll([
      raw(),
      raw({ id_canti: '6', titolo: undefined }),
      raw({ id_canti: '7', titolo: '   ' }),
      raw(),
    ])
    expect(songs.map((s) => s.id)).toEqual(['ciao-mondo-4'])
    expect(skipped.map((s) => s.id)).toEqual(['6', '-7', 'ciao-mondo-4'])
  })
})
```

- [ ] **Step 2: Verificare che falliscano**

Run: `npx vitest run scripts/lib/syncCanti.test.mjs`
Expected: FAIL (modulo `./syncCanti.mjs` non trovato).

- [ ] **Step 3: Implementare**

```js
// scripts/lib/syncCanti.mjs
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
```

- [ ] **Step 4: Verificare che passino**

Run: `npx vitest run scripts/lib/syncCanti.test.mjs`
Expected: PASS (tutti i test del file).

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/syncCanti.mjs scripts/lib/syncCanti.test.mjs
git commit -m "feat: funzioni pure per il sync dei canti nuovi

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: I/O Supabase e `runSync`

**Files:**
- Modify: `scripts/lib/syncCanti.mjs` (aggiungere in coda)
- Modify: `scripts/lib/syncCanti.test.mjs` (aggiungere in coda)

**Interfaces:**
- Consumes (Task 1): `pickNewSongs`, `assertSane`, `splitParsable`, `DEFAULT_MAX_NEW`.
- Produces:
  - `listCantiIds(supabase, page?: number): Promise<string[]>` — id delle righe con tag `canticristiani`, paginato.
  - `insertSongs(supabase, songs: Song[], now: number, batch?: number): Promise<void>`
  - `runSync({ supabase, fetchRows, convertAll, check, yes, maxNew?, now?, log? }): Promise<{ apiCount, existingCount, newCount, inserted, skipped }>` — `fetchRows(): Promise<object[]>`, `convertAll(rows): { songs, skipped }`, `check(song): void`.

- [ ] **Step 1: Scrivere i test che falliscono** (in coda a `syncCanti.test.mjs`; aggiungere `listCantiIds, insertSongs, runSync` all'import iniziale)

```js
function fakeSupabase(existing = []) {
  const upserts = []
  const likes = []
  const db = {
    upserts, likes,
    from() {
      const q = {
        select() { return q },
        like(col, pat) { likes.push([col, pat]); return q },
        order() { return q },
        range: async (a, b) => ({ data: existing.slice(a, b + 1).map((id) => ({ id })), error: null }),
        upsert: async (rows, opts) => { upserts.push({ rows, opts }); return { error: null } },
      }
      return q
    },
  }
  return db
}

describe('listCantiIds', () => {
  it('filtra per tag canticristiani', async () => {
    const db = fakeSupabase(['a-1'])
    await listCantiIds(db)
    expect(db.likes).toEqual([['tags', '%"canticristiani"%']])
  })
  it('pagina oltre la dimensione di pagina', async () => {
    const ids = ['a-1', 'b-2', 'c-3', 'd-4', 'e-5']
    expect(await listCantiIds(fakeSupabase(ids), 2)).toEqual(ids)
  })
})

describe('insertSongs', () => {
  it('lotti, updated_at crescente, ignoreDuplicates, tags serializzati', async () => {
    const db = fakeSupabase()
    const songs = ['a-1', 'b-2', 'c-3'].map(song)
    await insertSongs(db, songs, 1000, 2)
    expect(db.upserts).toHaveLength(2)
    expect(db.upserts[0].opts).toEqual({ onConflict: 'id', ignoreDuplicates: true })
    const all = db.upserts.flatMap((u) => u.rows)
    expect(all.map((r) => r.updated_at)).toEqual([1000, 1001, 1002])
    expect(all[0]).toMatchObject({ id: 'a-1', song_key: '', bpm: null, tags: '["canticristiani"]' })
  })
})

describe('runSync', () => {
  const apiRows = Array.from({ length: MIN_API_ROWS }, (_, i) => ({ id_canti: String(i + 1) }))
  const conv = (rows) => ({ songs: rows.map((r) => song(`t-${r.id_canti}`)), skipped: [] })
  const base = (over = {}) => ({
    fetchRows: async () => apiRows, convertAll: conv, check: () => {},
    yes: true, now: 5000, log: () => {}, ...over,
  })

  it('inserisce solo i canti mancanti', async () => {
    const existing = apiRows.slice(0, MIN_API_ROWS - 3).map((r) => `x-${r.id_canti}`)
    const db = fakeSupabase(existing)
    const res = await runSync({ supabase: db, ...base() })
    expect(res).toMatchObject({ apiCount: MIN_API_ROWS, newCount: 3, inserted: 3 })
    expect(db.upserts.flatMap((u) => u.rows).map((r) => r.id)).toEqual(['t-998', 't-999', 't-1000'])
  })
  it('idempotente: secondo giro non inserisce nulla', async () => {
    const existing = apiRows.map((r) => `t-${r.id_canti}`)
    const db = fakeSupabase(existing)
    const res = await runSync({ supabase: db, ...base() })
    expect(res.inserted).toBe(0)
    expect(db.upserts).toEqual([])
  })
  it('dry-run: nessuna scrittura', async () => {
    const db = fakeSupabase([])
    const res = await runSync({ supabase: db, ...base({ yes: false, maxNew: 5000 }) })
    expect(res).toMatchObject({ newCount: MIN_API_ROWS, inserted: 0 })
    expect(db.upserts).toEqual([])
  })
  it('API troncata: lancia, nessuna scrittura', async () => {
    const db = fakeSupabase([])
    await expect(runSync({ supabase: db, ...base({ fetchRows: async () => apiRows.slice(0, 10) }) })).rejects.toThrow(/API/)
    expect(db.upserts).toEqual([])
  })
  it('troppi nuovi: lancia, nessuna scrittura', async () => {
    const db = fakeSupabase([])
    await expect(runSync({ supabase: db, ...base() })).rejects.toThrow(/--max-new/)
    expect(db.upserts).toEqual([])
  })
  it('canto non parsabile: saltato, gli altri inseriti', async () => {
    const existing = apiRows.slice(0, MIN_API_ROWS - 2).map((r) => `x-${r.id_canti}`)
    const db = fakeSupabase(existing)
    const check = (s) => { if (s.id === 't-999') throw new Error('boom') }
    const res = await runSync({ supabase: db, ...base({ check }) })
    expect(res.inserted).toBe(1)
    expect(res.skipped).toEqual([{ id: 't-999', error: 'boom' }])
  })
  it('errore Supabase in lettura: lancia', async () => {
    const db = { from: () => { const q = { select: () => q, like: () => q, order: () => q, range: async () => ({ data: null, error: { message: 'rls' } }) }; return q } }
    await expect(runSync({ supabase: db, ...base() })).rejects.toThrow(/rls/)
  })
})
```

- [ ] **Step 2: Verificare che falliscano**

Run: `npx vitest run scripts/lib/syncCanti.test.mjs`
Expected: FAIL (`listCantiIds`/`insertSongs`/`runSync` non esportate).

- [ ] **Step 3: Implementare** (in coda a `syncCanti.mjs`)

```js
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
```

Nota sul test "inserisce solo i canti mancanti": i canti in DB sono `x-1`…`x-997`, quindi mancano `t-998`, `t-999`, `t-1000`. Nel test "canto non parsabile" gli esistenti sono `x-1`…`x-998`, mancano `t-999` e `t-1000`.

- [ ] **Step 4: Verificare che passino**

Run: `npx vitest run scripts/lib/syncCanti.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/syncCanti.mjs scripts/lib/syncCanti.test.mjs
git commit -m "feat: runSync con lettura id paginata e insert a lotti

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Comando `sync` nella CLI

**Files:**
- Modify: `scripts/import-canti.mjs` (import in testa; `loadEnv`, `parseMaxNew`, `syncPhase`; tabella `phases`; usage)
- Modify: `package.json` (script `import:sync`)

**Interfaces:**
- Consumes (Task 1-2): `runSync`, `fetchCantiRows`, `convertAll` da `./lib/syncCanti.mjs`.
- Produces: `npm run import:sync [-- --yes] [-- --max-new <n>]`; variabile d'ambiente `MAX_NEW` come alternativa a `--max-new`.

- [ ] **Step 1: Modificare `scripts/import-canti.mjs`**

Dopo la riga `import { convertCanto, bigCollections } from './lib/convertCanto.mjs'` aggiungere:

```js
import { runSync, fetchCantiRows, convertAll } from './lib/syncCanti.mjs'
```

Dopo `const yes = process.argv.includes('--yes')` aggiungere:

```js
// in CI le variabili arrivano dall'ambiente; in locale da .env
function loadEnv() {
  if (!process.env.VITE_SUPABASE_URL) process.loadEnvFile('.env')
}

function parseMaxNew() {
  const i = process.argv.indexOf('--max-new')
  const v = i > 0 ? process.argv[i + 1] : process.env.MAX_NEW
  if (v === undefined || v === '') return undefined
  const n = Number(v)
  if (!Number.isInteger(n) || n < 0) throw new Error(`--max-new non valido: ${v}`)
  return n
}
```

In `uploadPhase` sostituire `process.loadEnvFile('.env')` con `loadEnv()`.

Prima della riga `const phases = ...` aggiungere:

```js
async function syncPhase() {
  loadEnv()
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
  await runSync({
    supabase, yes, maxNew: parseMaxNew(),
    fetchRows: () => fetchCantiRows(API_URL),
    convertAll,
    check: (s) => { new ChordSheetJS.ChordProParser().parse(s.content).transpose(1) },
  })
}
```

Sostituire le ultime righe con:

```js
const phases = { fetch: fetchPhase, convert: convertPhase, upload: uploadPhase, sync: syncPhase }
if (!phases[cmd]) { console.error('uso: node scripts/import-canti.mjs fetch|convert|upload|sync [--yes] [--max-new n]'); process.exit(1) }
await phases[cmd]()
```

- [ ] **Step 2: Aggiungere lo script in `package.json`**

Dopo `"import:upload": "node scripts/import-canti.mjs upload"` (aggiungere la virgola):

```json
    "import:upload": "node scripts/import-canti.mjs upload",
    "import:sync": "node scripts/import-canti.mjs sync"
```

- [ ] **Step 3: Verificare la suite**

Run: `npm test`
Expected: PASS (tutti i test, vecchi e nuovi).

- [ ] **Step 4: Dry-run reale (sola lettura, richiede `.env` locale)**

Run: `npm run import:sync`
Expected: riga tipo `API: ~1527; in DB: ~1527; nuovi: 0; saltati: 0` e `dry-run: 0 canti da inserire, nessuna scrittura`. Exit code 0. Se `nuovi` è > 50 o l'errore è RLS in lettura, fermarsi e riportare l'output: non proseguire.

- [ ] **Step 5: Commit**

```bash
git add scripts/import-canti.mjs package.json
git commit -m "feat: comando import:sync per importare i canti nuovi

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Workflow GitHub Actions e documentazione

**Files:**
- Create: `.github/workflows/sync-canti.yml`
- Modify: `CLAUDE.md` (sezione "Aggiornamento: canzoni su Supabase")

**Interfaces:**
- Consumes (Task 3): `npm run import:sync -- --yes`, env `MAX_NEW`.

- [ ] **Step 1: Creare il workflow**

```yaml
name: Sync canti

on:
  schedule:
    - cron: '0 6 * * *'
  workflow_dispatch:
    inputs:
      max_new:
        description: 'Tetto di canti nuovi (vuoto = 50)'
        required: false
        default: ''

permissions:
  contents: read

concurrency:
  group: sync-canti
  cancel-in-progress: false

jobs:
  sync:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run import:sync -- --yes
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
          MAX_NEW: ${{ inputs.max_new }}
```

- [ ] **Step 2: Validare la sintassi YAML**

Run: `node -e "const y=require('node:fs').readFileSync('.github/workflows/sync-canti.yml','utf8'); if(/\t/.test(y)) throw new Error('tab nel YAML'); console.log('ok')"`
Expected: `ok`. (Se è installato `actionlint`, eseguire anche `actionlint .github/workflows/sync-canti.yml`.)

- [ ] **Step 3: Aggiornare `CLAUDE.md`**

In coda alla sezione "Aggiornamento: canzoni su Supabase (import canticristiani)" aggiungere:

```markdown
- Sync periodico: `npm run import:sync [-- --yes] [-- --max-new n]` scarica l'API, converte tutto e inserisce solo i canti il cui `id_canti` (suffisso dell'id) non è già in DB tra quelli col tag `canticristiani`. Senza `--yes` è un dry-run. Rifiuta di scrivere se l'API ha meno di 1000 canti o i nuovi superano 50. Non aggiorna mai i canti esistenti.
- Workflow `.github/workflows/sync-canti.yml`: ogni giorno 06:00 UTC + avvio manuale (input `max_new`). Secret del repo richiesti: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. I workflow schedulati girano solo dal branch di default; GitHub li disattiva dopo 60 giorni senza attività nel repo (repo pubblici): si riattivano da Actions o con un commit.
```

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/sync-canti.yml CLAUDE.md
git commit -m "feat: workflow giornaliero sync canti e documentazione

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 5: Passi manuali dell'utente (non automatizzabili)**

1. Repo GitHub → Settings → Secrets and variables → Actions: creare `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (stessi valori di `.env`).
2. Fare merge su `main` e `git push`.
3. Actions → "Sync canti" → Run workflow (senza input). Atteso: job verde con `nuovi: 0` (o i canti realmente nuovi).
