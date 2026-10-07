import { describe, it, expect } from 'vitest'
import { convertCanto, slugify, bigCollections } from './convertCanto.mjs'

const raw = (over = {}) => ({
  id_canti: '4', titolo: 'Acclamate al Signore', autore: ' Marco Frisina ',
  raccolta: 'Tu sarai profeta',
  accordi: '{start_chorus}{copy/rit}\n[RE]Accla[SI-]mate al\n{end_chorus}\n\n{start_verse_num}\n[SOL7+]Ricono\n{end_verse_num}',
  testo: 'Acclamate', ...over,
})

describe('slugify', () => {
  it('minuscolo, senza accenti/punteggiatura', () => {
    expect(slugify("È l'alba, o Signore!")).toBe('e-l-alba-o-signore')
  })
})

describe('convertCanto', () => {
  it('mappa campi base', () => {
    const { song } = convertCanto(raw())
    expect(song.id).toBe('acclamate-al-signore-4')
    expect(song.title).toBe('Acclamate al Signore')
    expect(song.artist).toBe('Marco Frisina')
    expect(song.key).toBe('D')
    expect(song.tags).toEqual(['canticristiani'])
  })
  it('authors: separa, normalizza e deriva artist', () => {
    const { song } = convertCanto(raw({ autore: ' RnS - De Luca, Aguila ' }))
    expect(song.authors).toEqual(['RnS', 'De Luca', 'Aguila'])
    expect(song.artist).toBe('RnS, De Luca, Aguila')
  })
  it('autore mancante o segnaposto: authors vuoto, artist vuoto', () => {
    for (const autore of [undefined, null, '', '---']) {
      const { song } = convertCanto(raw({ autore }))
      expect(song.authors).toEqual([])
      expect(song.artist).toBe('')
    }
  })
  it('usa gli override della mappa alias', () => {
    const aliases = { overrides: { 'Avolio-Capacchione-La Rocca': ['Avolio', 'Capacchione', 'La Rocca'] }, names: {} }
    const { song } = convertCanto(raw({ autore: 'Avolio-Capacchione-La Rocca' }), { aliases })
    expect(song.authors).toEqual(['Avolio', 'Capacchione', 'La Rocca'])
  })
  it('tag raccolta solo se grande', () => {
    const big = new Set(['Tu sarai profeta'])
    expect(convertCanto(raw(), { bigCollections: big }).song.tags).toEqual(['canticristiani', 'Tu sarai profeta'])
  })
  it('converte accordi e direttive, spazi non-breaking', () => {
    const { song } = convertCanto(raw())
    expect(song.content).toBe(
      '{start_of_chorus}\n[D]Accla[Bm]mate al\n{end_of_chorus}\n\n[Gmaj7]Ricono',
    )
    expect(song.content).not.toContain(' ')
  })
  it('{c:..} -> {comment: ..}, bridge, soc/eoc', () => {
    const { song } = convertCanto(raw({ accordi: '{c:Intro:}\n{soc}\n[DO]a\n{eoc}\n{start_bridge}\n[LA]b\n{end_bridge}' }))
    expect(song.content).toBe('{comment: Intro:}\n{start_of_chorus}\n[C]a\n{end_of_chorus}\n{start_of_bridge}\n[A]b\n{end_of_bridge}')
  })
  it('tiene le righe dei blocchi start_chord, scarta solo la direttiva', () => {
    const { song } = convertCanto(raw({ accordi: '{start_chord} \n[LA]  |[DO#-]  |\n{end_chord}' }))
    expect(song.content).toBe('[A]  |[C#m]  |')
  })
  it('riporta accordi sconosciuti e direttive scartate', () => {
    const { song, report } = convertCanto(raw({ accordi: '{replay/m1}\n[7]a [La2\\5]b {foo:x}' }))
    expect(song.content).toBe('[*7]a [*La2\\5]b')
    expect(report.unknownChords).toEqual(['7', 'La2\\5'])
    expect(report.droppedDirectives).toEqual(['replay', 'foo'])
  })
  it('fallback su testo se accordi vuoto; key vuota', () => {
    const { song, report } = convertCanto(raw({ accordi: '', testo: '{start_chorus}\nSolo testo\n{end_chorus}' }))
    expect(song.content).toBe('{start_of_chorus}\nSolo testo\n{end_of_chorus}')
    expect(song.key).toBe('')
    expect(report.noChords).toBe(true)
  })
  it('key = primo accordo (minore compreso)', () => {
    expect(convertCanto(raw({ accordi: '[LA-]a [MI]b' })).song.key).toBe('Am')
  })
  it('autore vuoto -> stringa vuota', () => {
    expect(convertCanto(raw({ autore: '' })).song.artist).toBe('')
  })
})

describe('copy/paste e parentesi', () => {
  it('paste riempie il ritornello con il blocco copiato', () => {
    const { song } = convertCanto(raw({ accordi: '{start_chorus}{copy/rit}\n[DO]a\n{end_chorus}\n{start_verse}\nb\n{end_verse}\n{start_chorus}{paste/rit}\n{end_chorus}' }))
    expect(song.content).toBe('{start_of_chorus}\n[C]a\n{end_of_chorus}\nb\n{start_of_chorus}\n[C]a\n{end_of_chorus}')
  })
  it('paste senza copy: scartato e riportato', () => {
    const { report } = convertCanto(raw({ accordi: '{start_chorus}{paste/zzz}\n{end_chorus}' }))
    expect(report.droppedDirectives).toContain('paste')
  })
  it('[ non chiusa diventa (', () => {
    expect(convertCanto(raw({ accordi: 'a [Mi4me.\n[DO]b' })).song.content).toBe('a (Mi4me.\n[C]b')
  })
})

describe('bigCollections', () => {
  it('solo raccolte con >= min canti, trim, ignora vuote', () => {
    const rows = [
      ...Array(5).fill({ raccolta: ' A ' }),
      ...Array(4).fill({ raccolta: 'B' }),
      ...Array(9).fill({ raccolta: '' }),
    ]
    expect([...bigCollections(rows, 5)]).toEqual(['A'])
  })
})
