import { describe, it, expect } from 'vitest'
import { matchOptions } from './matchOptions'

const opts = [
  { value: 'a', label: 'Álvaro Soler' },
  { value: 'b', label: 'Zucchero' },
  { value: 'c', label: 'Max Álvarez' },
  { value: 'd', label: 'Alvaro Rossi' },
]

describe('matchOptions', () => {
  it('query vuota restituisce tutte le opzioni', () => {
    expect(matchOptions(opts, '')).toEqual(opts)
    expect(matchOptions(opts, '   ')).toEqual(opts)
  })

  it('ignora maiuscole e accenti', () => {
    expect(matchOptions(opts, 'ALVARO').map((o) => o.value)).toEqual(['a', 'd'])
  })

  it('mette i prefissi prima delle sottostringhe, mantenendo l\'ordine', () => {
    expect(matchOptions(opts, 'alv').map((o) => o.value)).toEqual(['a', 'd', 'c'])
  })

  it('nessun risultato', () => {
    expect(matchOptions(opts, 'xyz')).toEqual([])
  })
})
