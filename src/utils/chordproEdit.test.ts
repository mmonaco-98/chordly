import { describe, expect, it } from 'vitest'
import { insertAt, usedChords, wrapSection, wrapSelection } from './chordproEdit'

describe('insertAt', () => {
  it('inserisce senza perdere il testo e posiziona il cursore', () => {
    const e = insertAt('ciao mondo', 5, '[]', 1)
    expect(e.value).toBe('ciao []mondo')
    expect([e.selStart, e.selEnd]).toEqual([6, 6])
  })

  it('di default il cursore va dopo il testo inserito', () => {
    expect(insertAt('ab', 1, '[Am]').selStart).toBe(5)
  })
})

describe('wrapSelection', () => {
  it('avvolge la selezione e la lascia selezionata', () => {
    const e = wrapSelection('una frase', 4, 9, '{comment: ', '}')
    expect(e.value).toBe('una {comment: frase}')
    expect(e.value.slice(e.selStart, e.selEnd)).toBe('frase')
  })

  it('senza selezione mette il cursore in mezzo', () => {
    const e = wrapSelection('', 0, 0, '{comment: ', '}')
    expect(e.value).toBe('{comment: }')
    expect(e.selStart).toBe(10)
  })
})

describe('wrapSection', () => {
  it('avvolge le righe selezionate', () => {
    const e = wrapSection('riga 1\nriga 2\n', 0, 13, 'chorus')
    expect(e.value).toBe('{start_of_chorus}\nriga 1\nriga 2\n{end_of_chorus}\n\n')
  })

  it('senza selezione crea una sezione vuota col cursore dentro', () => {
    const e = wrapSection('', 0, 0, 'bridge')
    expect(e.value).toBe('{start_of_bridge}\n\n{end_of_bridge}\n')
    expect(e.selStart).toBe('{start_of_bridge}\n'.length)
  })

  it('va a capo se il cursore è a metà riga', () => {
    const e = wrapSection('abc', 3, 3, 'verse')
    expect(e.value.startsWith('abc\n{start_of_verse}')).toBe(true)
  })
})

describe('usedChords', () => {
  it('ordina per frequenza, poi per comparsa, senza duplicati', () => {
    const content = '[Am]a [F]b [C]c [Am]d [C]e [G]f'
    expect(usedChords(content)).toEqual(['Am', 'C', 'F', 'G'])
  })

  it('ignora direttive e parentesi vuote', () => {
    expect(usedChords('{title: x}\n[]a [ ]b [D]c')).toEqual(['D'])
  })

  it('rispetta il limite', () => {
    expect(usedChords('[A][B][C]', 2)).toEqual(['A', 'B'])
  })
})
