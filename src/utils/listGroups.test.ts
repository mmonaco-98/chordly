import { describe, it, expect } from 'vitest'
import { groupLetter, filterAndGroup, filtersFromParams, filtersToParams, uniqueAuthors, uniqueTags } from './listGroups'
import type { Song } from '../types'

const s = (id: string, title: string, tags: string[] = [], artist = '', authors?: string[]): Song => ({
  id, title, artist, authors: authors ?? (artist.trim() ? [artist.trim()] : []), key: '', content: '', tags,
})
const none = { query: '', author: null, tag: null, inText: false }

describe('groupLetter', () => {
  it('lettere, accenti, cifre, simboli, vuoto', () => {
    expect(groupLetter('Alleluia')).toBe('A')
    expect(groupLetter("è l'alba")).toBe('E')
    expect(groupLetter('"Gloria"')).toBe('#')
    expect(groupLetter('1000 voci')).toBe('#')
    expect(groupLetter('')).toBe('#')
  })
})

describe('filterAndGroup', () => {
  const songs = [s('1', 'Zeta', ['x']), s('2', 'alfa'), s('3', '"Beta"')]
  it('ordina in italiano e raggruppa, # per ultimo', () => {
    const { groups } = filterAndGroup(songs, none)
    expect(groups.map((g) => g.letter)).toEqual(['A', 'Z', '#'])
  })
  it('filtra per query e tag', () => {
    expect(filterAndGroup(songs, { ...none, query: 'zet' }).filtered.map((x) => x.id)).toEqual(['1'])
    expect(filterAndGroup(songs, { ...none, tag: 'x' }).filtered.map((x) => x.id)).toEqual(['1'])
  })
})

describe('filterAndGroup per autore', () => {
  const songs = [s('1', 'Uno', ['a'], 'Rossi'), s('2', 'Due', ['b'], 'Rossi'), s('3', 'Tre', ['a'], 'Bianchi')]
  it('filtra per autore esatto', () => {
    expect(filterAndGroup(songs, { ...none, author: 'Rossi' }).filtered.map((x) => x.id)).toEqual(['2', '1'])
  })
  it('combina autore, raccolta e query', () => {
    expect(filterAndGroup(songs, { ...none, query: 'un', author: 'Rossi', tag: 'a' }).filtered.map((x) => x.id)).toEqual(['1'])
    expect(filterAndGroup(songs, { ...none, author: 'Bianchi', tag: 'b' }).filtered).toEqual([])
  })
})

describe('uniqueAuthors', () => {
  it('distinti, per occorrenze decrescenti, a parità alfabetico, senza vuoti', () => {
    const songs = [s('1', 'a', [], 'Zucchero'), s('2', 'b', [], 'Álvaro'), s('3', 'c', [], 'Zucchero'), s('4', 'd', [], ' '), s('5', 'e', [], 'Bano')]
    expect(uniqueAuthors(songs)).toEqual(['Zucchero', 'Álvaro', 'Bano'])
  })
})

describe('uniqueTags', () => {
  it('per occorrenze decrescenti, a parità alfabetico', () => {
    const songs = [s('1', 'a', ['b', 'a']), s('2', 'b', ['c', 'b']), s('3', 'c', ['b'])]
    expect(uniqueTags(songs)).toEqual(['b', 'a', 'c'])
  })
})

describe('filtri <-> query param', () => {
  it('roundtrip', () => {
    const f = { query: 'ciao', author: 'Rossi', tag: 'italiana', inText: true }
    expect(filtersFromParams(filtersToParams(f))).toEqual(f)
  })
  it('omette i valori vuoti', () => {
    expect(filtersToParams(none).toString()).toBe('')
    expect(filtersFromParams(new URLSearchParams())).toEqual(none)
  })
})

describe('autori multipli', () => {
  const songs = [
    s('1', 'Uno', [], 'RnS, De Luca', ['RnS', 'De Luca']),
    s('2', 'Due', [], 'RnS', ['RnS']),
  ]
  it('uniqueAuthors elenca ogni autore singolarmente', () => {
    expect(uniqueAuthors(songs)).toEqual(['RnS', 'De Luca'])
  })
  it('il filtro autore trova le canzoni dove compare tra più autori', () => {
    expect(filterAndGroup(songs, { ...none, author: 'De Luca' }).filtered.map((x) => x.id)).toEqual(['1'])
    expect(filterAndGroup(songs, { ...none, author: 'RnS' }).filtered.map((x) => x.id)).toEqual(['2', '1'])
  })
  it('la ricerca testuale non cerca più in artist', () => {
    expect(filterAndGroup(songs, { ...none, query: 'luca' }).filtered).toEqual([])
  })
  it('cache senza authors (precedente al deploy): ripiega su artist, senza crash', () => {
    const old = { ...s('1', 'a', [], 'Rossi'), authors: undefined as unknown as string[] }
    expect(uniqueAuthors([old])).toEqual(['Rossi'])
    expect(filterAndGroup([old], { ...none, author: 'Rossi' }).filtered).toHaveLength(1)
  })
  it('cache senza authors con artist segnaposto → nessun autore', () => {
    const old = { ...s('1', 'a', [], '---'), authors: undefined as unknown as string[] }
    expect(uniqueAuthors([old])).toEqual([])
  })
})

describe('ricerca nel testo', () => {
  const withContent = (id: string, title: string, content: string): Song => ({ ...s(id, title), content })
  const songs = [
    withContent('1', 'Uno', '{title: Uno}\n{key: Am}\n\nci[Am]ao a[F]more'),
    withContent('2', 'Due', '[Am]altro [F]testo'),
  ]
  it('senza check cerca solo nel titolo', () => {
    expect(filterAndGroup(songs, { ...none, query: 'amore' }).filtered).toEqual([])
  })
  it('con check cerca nel testo ignorando accordi anche a metà parola', () => {
    expect(filterAndGroup(songs, { ...none, query: 'ciao amore', inText: true }).filtered.map((x) => x.id)).toEqual(['1'])
  })
  it('ignora accordi e direttive', () => {
    expect(filterAndGroup(songs, { ...none, query: 'am', inText: true }).filtered.map((x) => x.id)).toEqual(['1'])
    expect(filterAndGroup(songs, { ...none, query: 'key', inText: true }).filtered).toEqual([])
  })
  it('con check trova ancora per titolo', () => {
    expect(filterAndGroup(songs, { ...none, query: 'due', inText: true }).filtered.map((x) => x.id)).toEqual(['2'])
  })
  it('param intext omesso se spento', () => {
    expect(filtersToParams({ ...none, inText: true }).toString()).toBe('intext=1')
  })
})
