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
