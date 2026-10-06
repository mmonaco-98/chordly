import { describe, it, expect } from 'vitest'
import { mergeSongs, rowToSong } from './songsMerge'
import type { Song } from '../types'

const s = (id: string, title = id): Song => ({ id, title, artist: '', key: '', content: '', tags: [] })

describe('mergeSongs', () => {
  it('sostituisce per id e aggiunge i nuovi', () => {
    const r = mergeSongs([s('a', 'old'), s('b')], [s('a', 'new'), s('c')], new Set(['a', 'b', 'c']))
    expect(r.map((x) => x.id).sort()).toEqual(['a', 'b', 'c'])
    expect(r.find((x) => x.id === 'a')!.title).toBe('new')
  })
  it('rimuove gli id cancellati in remoto', () => {
    const r = mergeSongs([s('a'), s('b')], [], new Set(['a']))
    expect(r.map((x) => x.id)).toEqual(['a'])
  })
})

describe('rowToSong', () => {
  it('mappa colonne DB e tags JSON, bpm null -> assente', () => {
    const song = rowToSong({ id: 'x', title: 'T', artist: 'A', song_key: 'Am', bpm: null, content: 'c', tags: '["canticristiani"]' })
    expect(song).toEqual({ id: 'x', title: 'T', artist: 'A', key: 'Am', content: 'c', tags: ['canticristiani'] })
  })
  it('content array -> stringa', () => {
    expect(rowToSong({ id: 'x', title: 'T', artist: '', song_key: '', bpm: null, content: ['a', 'b'], tags: '[]' }).content).toBe('a\nb')
  })
})

import { missingIds } from './songsMerge'

describe('missingIds', () => {
  it('id remoti non presenti né in locale né tra i cambiati', () => {
    const r = missingIds([s('a')], [s('b')], new Set(['a', 'b', 'c', 'd']))
    expect(r.sort()).toEqual(['c', 'd'])
  })
  it('nessuno mancante', () => {
    expect(missingIds([s('a')], [], new Set(['a']))).toEqual([])
  })
})
