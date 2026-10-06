import { describe, it, expect } from 'vitest'
import { convertChordIt, keyOfChord } from './convertChordIt.mjs'

const c = (t) => convertChordIt(t).chord

describe('convertChordIt', () => {
  it('note base, case-insensitive', () => {
    expect(c('DO')).toBe('C')
    expect(c('Sol')).toBe('G')
    expect(c('re')).toBe('D')
    expect(c('SI')).toBe('B')
    expect(c('fa')).toBe('F')
  })
  it('alterazioni', () => {
    expect(c('FA#')).toBe('F#')
    expect(c('SIb')).toBe('Bb')
    expect(c('Sib')).toBe('Bb')
    expect(c('MIb')).toBe('Eb')
  })
  it('minore: trattino, trattini unicode, m', () => {
    expect(c('RE-')).toBe('Dm')
    expect(c('FA#-')).toBe('F#m')
    expect(c('FA#‑')).toBe('F#m')
    expect(c('MI–')).toBe('Em')
    expect(c('SIm')).toBe('Bm')
    expect(c('MI-7')).toBe('Em7')
  })
  it('settime, maj7, sus4, aug, add', () => {
    expect(c('SOL7')).toBe('G7')
    expect(c('DO7+')).toBe('Cmaj7')
    expect(c('RE+7')).toBe('Dmaj7')
    expect(c('SOL4')).toBe('Gsus4')
    expect(c('LA4/7')).toBe('A7sus4')
    expect(c('Si7/4')).toBe('B7sus4')
    expect(c('RE5+')).toBe('Daug')
    expect(c('Soladd9')).toBe('Gadd9')
    expect(c('MI-7+')).toBe('Emmaj7')
  })
  it('basso', () => {
    expect(c('RE/FA#')).toBe('D/F#')
    expect(c('Sol7+/Si')).toBe('Gmaj7/B')
    expect(c('RE/FA#-')).toBe('D/F#m')
  })
  it('non riconosciuti: invariati e ok=false', () => {
    for (const t of ['7', '4', '/7', '(LA)', 'SOL LA  RE', 'La2\\5', 'La6/9', '']) {
      const r = convertChordIt(t)
      expect(r.chord).toBe(t)
      expect(r.ok).toBe(false)
    }
  })
  it('ok=true per i riconosciuti', () => {
    expect(convertChordIt('DO7+').ok).toBe(true)
  })
})

describe('keyOfChord', () => {
  it('radice + minore', () => {
    expect(keyOfChord('Am7')).toBe('Am')
    expect(keyOfChord('Cmaj7')).toBe('C')
    expect(keyOfChord('Bb')).toBe('Bb')
    expect(keyOfChord('F#m')).toBe('F#m')
    expect(keyOfChord('Emmaj7')).toBe('Em')
    expect(keyOfChord('D/F#')).toBe('D')
  })
})
