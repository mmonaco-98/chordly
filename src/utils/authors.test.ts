import { describe, it, expect } from 'vitest'
import {
  EMPTY_ALIASES, compareKey, splitAuthors, makeCanon, applyCanon, joinAuthors,
  resolveAuthors, parseAuthorsInput, parseAuthorsColumn, hyphenAmbiguities, splitWarnings, normalizeList,
  type Aliases,
} from './authors.mjs'

const aliases: Aliases = {
  overrides: {
    'Avolio-Capacchione-La Rocca': ['Avolio', 'Capacchione', 'La Rocca'],
    'Jean-Paul Lécot': ['Jean-Paul Lécot'],
  },
  names: { 'M. Giombini': 'Marcello Giombini' },
}

describe('compareKey', () => {
  it('ignora maiuscole, accenti, punteggiatura e spazi', () => {
    expect(compareKey('Taizè')).toBe(compareKey('Taize'))
    expect(compareKey('RNS')).toBe(compareKey('rns'))
    expect(compareKey('M. Giombini')).toBe(compareKey('m.giombini'))
  })
  it('vuota per sola punteggiatura', () => {
    expect(compareKey('---')).toBe('')
  })
})

describe('splitAuthors', () => {
  it('segnaposto, vuoto, null e undefined → []', () => {
    for (const v of ['', '  ', '-', '--', '---', null, undefined]) expect(splitAuthors(v)).toEqual([])
  })
  it('spezza su ogni separatore sicuro', () => {
    expect(splitAuthors('A Rossi, B Bianchi')).toEqual(['A Rossi', 'B Bianchi'])
    expect(splitAuthors('A Rossi / B Bianchi')).toEqual(['A Rossi', 'B Bianchi'])
    expect(splitAuthors('A Rossi; B Bianchi')).toEqual(['A Rossi', 'B Bianchi'])
    expect(splitAuthors('A Rossi - B Bianchi')).toEqual(['A Rossi', 'B Bianchi'])
    expect(splitAuthors('A Rossi – B Bianchi')).toEqual(['A Rossi', 'B Bianchi'])
    expect(splitAuthors('Roberta Torresi e Paolo Bisonni')).toEqual(['Roberta Torresi', 'Paolo Bisonni'])
  })
  it('separatori misti', () => {
    expect(splitAuthors('RnS - De Luca, Aguila')).toEqual(['RnS', 'De Luca', 'Aguila'])
  })
  it('non spezza dentro i nomi (e iniziale, trattino senza spazi)', () => {
    expect(splitAuthors('Ernest Sands - Paolo Iotti')).toEqual(['Ernest Sands', 'Paolo Iotti'])
    expect(splitAuthors('Jean-Paul Lécot')).toEqual(['Jean-Paul Lécot'])
    expect(splitAuthors('Negrini-Frigerio')).toEqual(['Negrini-Frigerio'])
  })
  it('usa gli override per i trattini senza spazi', () => {
    expect(splitAuthors('Avolio-Capacchione-La Rocca', aliases)).toEqual(['Avolio', 'Capacchione', 'La Rocca'])
    expect(splitAuthors('Jean-Paul Lécot', aliases)).toEqual(['Jean-Paul Lécot'])
  })
  it('collassa spazi anche non-breaking', () => {
    expect(splitAuthors('Marco  Frisina ')).toEqual(['Marco Frisina'])
  })
  it('stesso autore due volte con casing diverso → uno solo', () => {
    expect(splitAuthors('RnS - RNS')).toEqual(['RnS'])
  })
  it('applica gli alias per nome (chiave di confronto)', () => {
    expect(splitAuthors('M. Giombini - Gen Verde', aliases)).toEqual(['Marcello Giombini', 'Gen Verde'])
    expect(splitAuthors('m.giombini', aliases)).toEqual(['Marcello Giombini'])
  })
})

describe('splitAuthors: parentesi', () => {
  it('non spezza dentro le parentesi', () => {
    expect(splitAuthors('RnS (G. Sanfratello - G. Cucuzza)')).toEqual(['RnS (G. Sanfratello - G. Cucuzza)'])
    expect(splitAuthors('Maria Napolitano (Testo) e Tania Pierannunzi (musica e arrangiamento)'))
      .toEqual(['Maria Napolitano (Testo)', 'Tania Pierannunzi (musica e arrangiamento)'])
  })
})

describe('normalizeList', () => {
  it('applica alias e deduplica senza rispezzare', () => {
    expect(normalizeList(['Simon e Garfunkel', 'M. Giombini', 'simon e garfunkel'], aliases))
      .toEqual(['Simon e Garfunkel', 'Marcello Giombini'])
  })
})

describe('splitWarnings', () => {
  it('segnala i casi dubbi con il motivo', () => {
    expect(splitWarnings('Comunione e Liberazione')).toEqual(['e'])
    expect(splitWarnings('Comunione E Liberazione')).toEqual(['e'])
    expect(splitWarnings('Walker & Deflorian')).toEqual(['&'])
    expect(splitWarnings('RnS (G. Sanfratello')).toEqual(['parentesi'])
    expect(splitWarnings('M. Emberti- A.M. Galliano')).toEqual(['trattino con spazio da un solo lato'])
    expect(splitWarnings('RnS -De Luca')).toEqual(['trattino con spazio da un solo lato'])
  })
  it('niente per i casi chiari, gli override e i segnaposto', () => {
    expect(splitWarnings('Rossi, Bianchi')).toEqual([])
    expect(splitWarnings('RnS - De Luca')).toEqual([])
    expect(splitWarnings('Comunione e Liberazione', { overrides: { 'Comunione e Liberazione': ['Comunione e Liberazione'] }, names: {} })).toEqual([])
    expect(splitWarnings('---')).toEqual([])
    expect(splitWarnings(null)).toEqual([])
  })
})

describe('makeCanon / applyCanon', () => {
  it('sceglie la forma più frequente', () => {
    const canon = makeCanon(['RnS', 'RNS', 'RnS'])
    expect(canon.get(compareKey('RNS'))).toBe('RnS')
  })
  it('a parità, la prima in ordine alfabetico', () => {
    expect(makeCanon(['Taizè', 'Taize']).get('taize')).toBe('Taize')
  })
  it('alias e override battono la frequenza', () => {
    const canon = makeCanon(['marcello giombini', 'marcello giombini', 'AVOLIO'], aliases)
    expect(canon.get('marcellogiombini')).toBe('Marcello Giombini')
    expect(canon.get('avolio')).toBe('Avolio')
  })
  it('applyCanon unifica e deduplica mantenendo l\'ordine', () => {
    const canon = makeCanon(['RnS', 'RnS', 'RNS'])
    expect(applyCanon(['RNS', 'De Luca', 'rns'], canon)).toEqual(['RnS', 'De Luca'])
  })
})

describe('joinAuthors', () => {
  it('unisce con ", "', () => {
    expect(joinAuthors(['A', 'B'])).toBe('A, B')
    expect(joinAuthors([])).toBe('')
  })
})

describe('resolveAuthors', () => {
  it('preferisce authors', () => {
    expect(resolveAuthors(['A', 'B'], 'x')).toEqual(['A', 'B'])
  })
  it('ripiega su artist se authors manca o è vuoto', () => {
    expect(resolveAuthors(undefined, 'Rossi')).toEqual(['Rossi'])
    expect(resolveAuthors(null, ' Rossi ')).toEqual(['Rossi'])
    expect(resolveAuthors([], 'Rossi')).toEqual(['Rossi'])
  })
  it('artist vuoto o segnaposto → []', () => {
    expect(resolveAuthors([], '')).toEqual([])
    expect(resolveAuthors(undefined, '---')).toEqual([])
    expect(resolveAuthors(undefined, undefined)).toEqual([])
  })
})

describe('parseAuthorsInput', () => {
  const canon = makeCanon(['RnS', 'RnS', 'RNS'])
  it('spezza su virgola e slash, unifica con il catalogo', () => {
    expect(parseAuthorsInput('RNS, De Luca / Aguila', canon)).toEqual(['RnS', 'De Luca', 'Aguila'])
  })
  it('non spezza il trattino', () => {
    expect(parseAuthorsInput('Jean-Paul Lécot', canon)).toEqual(['Jean-Paul Lécot'])
  })
  it('vuoto o segnaposto → []', () => {
    expect(parseAuthorsInput('', canon)).toEqual([])
    expect(parseAuthorsInput(' , ---', canon)).toEqual([])
  })
})

describe('parseAuthorsColumn', () => {
  it('legge un array JSON di stringhe', () => {
    expect(parseAuthorsColumn('["a","b"]')).toEqual(['a', 'b'])
    expect(parseAuthorsColumn('[]')).toEqual([])
  })
  it('valori malformati → []', () => {
    for (const v of ['', 'null', '{"a":1}', 'non json', undefined, null]) expect(parseAuthorsColumn(v)).toEqual([])
  })
  it('scarta gli elementi non stringa', () => {
    expect(parseAuthorsColumn('[1,"a"]')).toEqual(['a'])
  })
})

describe('hyphenAmbiguities', () => {
  it('segnala il trattino senza spazi non risolto', () => {
    expect(hyphenAmbiguities('Negrini-Frigerio', aliases)).toEqual(['Negrini-Frigerio'])
    expect(hyphenAmbiguities('RnS - M. Emberti Gialloreti-C. Rossi', aliases)).toEqual(['M. Emberti Gialloreti-C. Rossi'])
  })
  it('niente se risolto da override o assente', () => {
    expect(hyphenAmbiguities('Avolio-Capacchione-La Rocca', aliases)).toEqual([])
    expect(hyphenAmbiguities('Rossi, Bianchi', aliases)).toEqual([])
    expect(hyphenAmbiguities('---', aliases)).toEqual([])
    expect(hyphenAmbiguities(null, aliases)).toEqual([])
  })
  it('EMPTY_ALIASES è utilizzabile come default', () => {
    expect(hyphenAmbiguities('Negrini-Frigerio', EMPTY_ALIASES)).toEqual(['Negrini-Frigerio'])
  })
})
