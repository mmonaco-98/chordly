import ChordSheetJS from 'chordsheetjs'
import { describe, expect, it } from 'vitest'
import { buildSourceMap, replaceChord } from './chordproMap'

function columnCount(content: string): number {
  const sheet = new ChordSheetJS.ChordProParser().parse(content)
  const html = new ChordSheetJS.HtmlDivFormatter({ normalizeChords: false }).format(sheet)
  return (html.match(/class="column"/g) ?? []).length
}

const SAMPLES: Record<string, string> = {
  semplice: 'Ciao [Am]mondo [F]bello',
  'solo accordo e fine riga': '[C]\n[G]Fine[D]',
  'solo testo': 'Solo testo',
  direttive: '{title: T}\n{start_of_chorus}\n[Am]uno\n{comment: Rit.}\n[F]due\n{end_of_chorus}',
  'commenti e righe vuote': '# nota\n\n[Am]uno\n\n\n[F]due\n',
  indentata: '  [Am]uno [F]due',
  'spazio tra accordi': '[Am] [F]x',
  crlf: '[Am]uno\r\n[F]due\r\n',
  'spazi finali': 'Ciao [Am]mondo  \n',
  'più parole dopo un accordo': '[Am]Ciao [F]mondo bello',
  'spazi multipli': '[A]a  b   c',
  'testo prima dell accordo': 'lead words [A]x y',
  'spazio subito dopo l accordo': '[A] mondo',
  'solo spazi': '[A]  ',
  'accordo con testo vuoto in mezzo': '[A]a [B] b',
  tabulazione: '[A]a\tb',
  apostrofo: "[A]l'ho visto",
  'direttiva con accordi sulla stessa riga': '{comment: Intro:} [D]   [Gm]\n[A]x',
  'direttiva attaccata agli accordi': '{comment: Intro:}[F]   [C]',
  'direttiva con testo libero': '{comment: x} testo libero',
  'direttiva preceduta da spazio': ' {end_of_chorus}\n[A]x',
  'commento con rientro': ' # nota\n[A]x',
  'annotazione a metà testo': '[E]che è ve[*7]nuta giù dal cie[A]lo.',
  'annotazione a fine riga': '[C]cammineremo insieme a [D]Te.   [*7]',
  'annotazione sola': '[*cambio accordi]',
  'annotazione dopo testo': 'a[*x]b c',
}

describe('buildSourceMap', () => {
  for (const [name, src] of Object.entries(SAMPLES)) {
    it(`ha tante coppie quante le colonne di chordsheetjs: ${name}`, () => {
      expect(buildSourceMap(src)).toHaveLength(columnCount(src))
    })
  }

  it('registra le posizioni di accordo e testo', () => {
    const src = 'Ciao [Am]mondo\n[F]x'
    const [lead, am, f] = buildSourceMap(src)
    expect(lead).toMatchObject({ chord: '', lyricStart: 0, lyricEnd: 5 })
    expect(src.slice(am.chordStart, am.chordEnd)).toBe('[Am]')
    expect(src.slice(am.lyricStart, am.lyricEnd)).toBe('mondo')
    expect(f.chord).toBe('F')
    expect(src.slice(f.lyricStart, f.lyricEnd)).toBe('x')
  })

  it('divide il testo dopo la prima parola, come chordsheetjs', () => {
    const src = '[A]mondo  bello e brutto'
    const [first, rest] = buildSourceMap(src)
    expect(src.slice(first.lyricStart, first.lyricEnd)).toBe('mondo  ')
    expect(first.chord).toBe('A')
    expect(rest.chord).toBe('')
    expect(src.slice(rest.lyricStart, rest.lyricEnd)).toBe('bello e brutto')
  })

  it('un\'annotazione è una colonna senza accordo e il suo testo non si divide', () => {
    const src = 've[*7]nuta giù'
    const pairs = buildSourceMap(src)
    expect(pairs).toHaveLength(2)
    expect(pairs[1].chord).toBe('')
    expect(src.slice(pairs[1].lyricStart, pairs[1].lyricEnd)).toBe('nuta giù')
  })

  it('ignora direttive e commenti', () => {
    expect(buildSourceMap('{title: x}\n# c\n[A]b')).toHaveLength(1)
  })
})

describe('replaceChord', () => {
  const src = 'Ciao [Am]mondo [F]bello'
  const pairs = buildSourceMap(src)

  it('cambia un accordo', () => {
    expect(replaceChord(src, pairs[1], 'Dm7')).toBe('Ciao [Dm7]mondo [F]bello')
  })

  it('con accordo vuoto lo elimina lasciando il testo', () => {
    expect(replaceChord(src, pairs[2], '')).toBe('Ciao [Am]mondo bello')
  })
})
