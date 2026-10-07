import { describe, it, expect } from 'vitest'
import { groupLetter, filterAndGroup, filtersFromParams, filtersToParams, uniqueAuthors } from './listGroups'
import type { Song } from '../types'

const s = (id: string, title: string, tags: string[] = [], artist = ''): Song => ({ id, title, artist, key: '', content: '', tags })
const none = { query: '', author: null, tag: null }

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
    expect(filterAndGroup(songs, { query: 'un', author: 'Rossi', tag: 'a' }).filtered.map((x) => x.id)).toEqual(['1'])
    expect(filterAndGroup(songs, { query: '', author: 'Bianchi', tag: 'b' }).filtered).toEqual([])
  })
})

describe('uniqueAuthors', () => {
  it('distinti, ordinati in italiano, senza vuoti', () => {
    const songs = [s('1', 'a', [], 'Zucchero'), s('2', 'b', [], 'Álvaro'), s('3', 'c', [], 'Zucchero'), s('4', 'd', [], ' ')]
    expect(uniqueAuthors(songs)).toEqual(['Álvaro', 'Zucchero'])
  })
})

describe('filtri <-> query param', () => {
  it('roundtrip', () => {
    const f = { query: 'ciao', author: 'Rossi', tag: 'italiana' }
    expect(filtersFromParams(filtersToParams(f))).toEqual(f)
  })
  it('omette i valori vuoti', () => {
    expect(filtersToParams(none).toString()).toBe('')
    expect(filtersFromParams(new URLSearchParams())).toEqual(none)
  })
})
