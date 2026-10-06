import { describe, it, expect } from 'vitest'
import {
  extractCantoId, pickNewSongs, assertSane, splitParsable, fetchCantiRows, convertAll,
  listCantiIds, insertSongs, runSync,
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
  it('troppi pochi canti dall\'API', () => {
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

function fakeSupabase(existing = []) {
  const upserts = []
  const likes = []
  return {
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
  it('troppe righe inconvertibili (schema API cambiato): lancia, nessuna scrittura', async () => {
    const db = fakeSupabase([])
    const convertAll = (rows) => ({ songs: [], skipped: rows.map((r) => ({ id: r.id_canti, error: 'titolo vuoto' })) })
    await expect(runSync({ supabase: db, ...base({ convertAll }) })).rejects.toThrow(/inconvertibili/)
    expect(db.upserts).toEqual([])
  })
  it('errore Supabase in lettura: lancia', async () => {
    const db = { from: () => { const q = { select: () => q, like: () => q, order: () => q, range: async () => ({ data: null, error: { message: 'rls' } }) }; return q } }
    await expect(runSync({ supabase: db, ...base() })).rejects.toThrow(/rls/)
  })
})
