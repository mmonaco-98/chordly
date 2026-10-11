/** Una riga del sorgente e la posizione verticale (px) in cui compare nell'anteprima. */
export interface Anchor {
  line: number
  y: number
}

/** Posizione nell'anteprima corrispondente a una riga (anche frazionaria) del sorgente. */
export function lineToY(anchors: Anchor[], line: number): number {
  if (anchors.length === 0) return 0
  const first = anchors[0]
  if (line <= first.line) return first.line > 0 ? first.y * (line / first.line) : first.y
  for (let i = 1; i < anchors.length; i++) {
    const a = anchors[i - 1]
    const b = anchors[i]
    if (line <= b.line) return a.y + ((b.y - a.y) * (line - a.line)) / (b.line - a.line)
  }
  return anchors[anchors.length - 1].y
}

/** Riga (frazionaria) del sorgente corrispondente a una posizione dell'anteprima. */
export function yToLine(anchors: Anchor[], y: number): number {
  if (anchors.length === 0) return 0
  const first = anchors[0]
  if (y <= first.y) return first.y > 0 ? first.line * (y / first.y) : first.line
  for (let i = 1; i < anchors.length; i++) {
    const a = anchors[i - 1]
    const b = anchors[i]
    if (y <= b.y) return b.y === a.y ? a.line : a.line + ((b.line - a.line) * (y - a.y)) / (b.y - a.y)
  }
  return anchors[anchors.length - 1].line
}
