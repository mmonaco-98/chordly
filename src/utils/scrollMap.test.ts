import { describe, expect, it } from 'vitest'
import { lineToY, yToLine } from './scrollMap'

const anchors = [
  { line: 1, y: 40 },
  { line: 3, y: 100 },
  { line: 7, y: 300 },
]

describe('lineToY', () => {
  it('interpola tra due ancore', () => {
    expect(lineToY(anchors, 2)).toBe(70)
    expect(lineToY(anchors, 5)).toBe(200)
  })

  it('coincide sulle ancore', () => {
    expect(lineToY(anchors, 3)).toBe(100)
  })

  it('prima della prima ancora scala da zero', () => {
    expect(lineToY(anchors, 0)).toBe(0)
    expect(lineToY(anchors, 0.5)).toBe(20)
  })

  it('oltre l\'ultima si ferma sull\'ultima', () => {
    expect(lineToY(anchors, 20)).toBe(300)
  })

  it('senza ancore dà 0', () => {
    expect(lineToY([], 4)).toBe(0)
  })
})

describe('yToLine', () => {
  it('è l\'inversa di lineToY', () => {
    for (const line of [0, 0.5, 1, 2, 3, 5, 7]) {
      expect(yToLine(anchors, lineToY(anchors, line))).toBeCloseTo(line)
    }
  })
})
