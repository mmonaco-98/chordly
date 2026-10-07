import { describe, it, expect } from 'vitest'
import { EMPTY_ALIASES } from '../../src/utils/authors.mjs'
import { planBackfill, fetchBackfillRows, updateRows } from './authorsBackfill.mjs'

const aliases = { overrides: { 'Avolio-Capacchione-La Rocca': ['Avolio', 'Capacchione', 'La Rocca'] }, names: {} }
const row = (id, artist, authors = '[]') => ({ id, artist, authors })
const rows = [
  row('1', 'RnS - De Luca, Aguila'),
  row('2', 'RNS'),
  row('3', 'RnS'),
  row('4', '---'),
  row('5', 'Avolio-Capacchione-La Rocca'),
  row('6', 'Negrini-Frigerio'),
]

describe('planBackfill', () => {
  it('spezza, unifica sulla forma più frequente e deriva artist', () => {
    const { changes } = planBackfill(rows, aliases)
    const by = Object.fromEntries(changes.map((c) => [c.id, c]))
    expect(by['1']).toMatchObject({ authors: ['RnS', 'De Luca', 'Aguila'], artist: 'RnS, De Luca, Aguila', oldArtist: 'RnS - De Luca, Aguila' })
    expect(by['2']).toMatchObject({ authors: ['RnS'], artist: 'RnS' })
    expect(by['4']).toMatchObject({ authors: [], artist: '' })
    expect(by['5'].authors).toEqual(['Avolio', 'Capacchione', 'La Rocca'])
    expect(by['6'].authors).toEqual(['Negrini-Frigerio'])
  })
  it('report: trattini irrisolti, varianti unificate, senza autore', () => {
    const { report } = planBackfill(rows, aliases)
    expect(report.rows).toBe(6)
    expect(report.noAuthor).toBe(1)
    expect(report.unresolvedHyphens).toEqual([{ raw: 'Negrini-Frigerio', rows: 1 }])
    expect(report.variantGroups).toEqual([
      { canonical: 'RnS', variants: [{ name: 'RNS', rows: 1 }, { name: 'RnS', rows: 2 }] },
    ])
  })
  it('report: possibili alias per cognome uguale', () => {
    const { report } = planBackfill([row('1', 'M. Giombini'), row('2', 'Marcello Giombini'), row('3', 'Rossi')], EMPTY_ALIASES)
    expect(report.possibleAliases).toEqual([['M. Giombini', 'Marcello Giombini']])
  })
  it('idempotente: rilanciato sui valori già scritti non cambia nulla', () => {
    const { changes } = planBackfill(rows, aliases)
    const written = rows.map((r) => {
      const c = changes.find((x) => x.id === r.id)
      return c ? row(r.id, c.artist, JSON.stringify(c.authors)) : r
    })
    expect(planBackfill(written, aliases).changes).toEqual([])
  })
  it('righe già scritte (authors non vuoto) non vengono rispezzate né perdono modifiche manuali', () => {
    const { changes } = planBackfill([
      row('1', 'Simon e Garfunkel', '["Simon e Garfunkel"]'),
      row('2', 'Marco Frisina', '["Marco Frisina"]'),
    ], EMPTY_ALIASES)
    expect(changes).toEqual([])
  })
  it('righe già scritte: forme riunificate e alias applicati', () => {
    const al = { overrides: {}, names: { 'M. Giombini': 'Marcello Giombini' } }
    const { changes } = planBackfill([
      row('1', 'RnS', '["RnS"]'), row('2', 'RnS', '["RnS"]'), row('3', 'RNS', '["RNS"]'),
      row('4', 'M. Giombini', '["M. Giombini"]'),
    ], al)
    const by = Object.fromEntries(changes.map((c) => [c.id, c]))
    expect(Object.keys(by).sort()).toEqual(['3', '4'])
    expect(by['3'].authors).toEqual(['RnS'])
    expect(by['4'].authors).toEqual(['Marcello Giombini'])
  })
  it('report: righe da verificare (e, &, parentesi, trattino su un lato)', () => {
    const { report } = planBackfill([row('1', 'Walker & Deflorian'), row('2', 'Comunione e Liberazione'), row('3', 'Rossi')], EMPTY_ALIASES)
    expect(report.toVerify).toEqual([
      { raw: 'Comunione e Liberazione', reasons: ['e'], rows: 1 },
      { raw: 'Walker & Deflorian', reasons: ['&'], rows: 1 },
    ])
  })
  it('authors malformato in DB conta come vuoto', () => {
    const { changes } = planBackfill([row('1', 'Rossi', 'non json')], EMPTY_ALIASES)
    expect(changes[0].authors).toEqual(['Rossi'])
  })
})

function fakeSelect(all) {
  const calls = []
  return {
    calls,
    from() {
      const q = {
        select(cols) { calls.push(cols); return q },
        order() { return q },
        range: async (a, b) => ({ data: all.slice(a, b + 1), error: null }),
      }
      return q
    },
  }
}

describe('fetchBackfillRows', () => {
  it('legge id, artist, authors e pagina', async () => {
    const all = Array.from({ length: 5 }, (_, i) => row(String(i), 'x'))
    const db = fakeSelect(all)
    expect(await fetchBackfillRows(db, 2)).toEqual(all)
    expect(db.calls[0]).toBe('id,artist,authors')
  })
  it('errore di lettura (colonna mancante) → messaggio con indicazione', async () => {
    const db = { from: () => ({ select() { return this }, order() { return this }, range: async () => ({ data: null, error: { message: 'column authors does not exist' } }) }) }
    await expect(fetchBackfillRows(db)).rejects.toThrow(/add-authors-column\.sql/)
  })
})

describe('updateRows', () => {
  function fakeUpdater(failId) {
    const calls = []
    return {
      calls,
      from(table) {
        return {
          update(values) {
            return { eq: async (col, id) => { calls.push({ table, values, col, id }); return { error: id === failId ? { message: 'boom' } : null } } }
          },
        }
      },
    }
  }
  it('aggiorna per id con updated_at crescente tra i lotti', async () => {
    const db = fakeUpdater()
    const updates = ['a', 'b', 'c'].map((id) => ({ id, values: { artist: id } }))
    await updateRows(db, updates, 1000, 2)
    expect(db.calls.map((c) => [c.id, c.values.updated_at])).toEqual([['a', 1000], ['b', 1001], ['c', 1002]])
    expect(db.calls[0]).toMatchObject({ table: 'songs', col: 'id', values: { artist: 'a' } })
  })
  it('lancia al primo errore', async () => {
    await expect(updateRows(fakeUpdater('b'), [{ id: 'a', values: {} }, { id: 'b', values: {} }], 1)).rejects.toThrow(/boom/)
  })
})
