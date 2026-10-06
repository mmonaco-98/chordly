import { describe, it, expect } from 'vitest'
import { groupLetter, filterAndGroup } from './listGroups'
import type { Song } from '../types'

const s = (id: string, title: string, tags: string[] = []): Song => ({ id, title, artist: '', key: '', content: '', tags })

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
    const { groups } = filterAndGroup(songs, '', null)
    expect(groups.map((g) => g.letter)).toEqual(['A', 'Z', '#'])
  })
  it('filtra per query e tag', () => {
    expect(filterAndGroup(songs, 'zet', null).filtered.map((x) => x.id)).toEqual(['1'])
    expect(filterAndGroup(songs, '', 'x').filtered.map((x) => x.id)).toEqual(['1'])
  })
})
