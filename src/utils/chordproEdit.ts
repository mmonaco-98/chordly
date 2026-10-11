export interface Edit {
  value: string
  selStart: number
  selEnd: number
}

export type SectionKind = 'verse' | 'chorus' | 'bridge'

/** Inserisce `text` nella posizione `start`, senza toccare la selezione esistente. */
export function insertAt(value: string, start: number, text: string, cursorOffset = text.length): Edit {
  const pos = start + cursorOffset
  return { value: value.slice(0, start) + text + value.slice(start), selStart: pos, selEnd: pos }
}

/** Racchiude la selezione tra `before` e `after`; senza selezione il cursore finisce in mezzo. */
export function wrapSelection(value: string, start: number, end: number, before: string, after: string): Edit {
  const selected = value.slice(start, end)
  const next = value.slice(0, start) + before + selected + after + value.slice(end)
  return selected
    ? { value: next, selStart: start + before.length, selEnd: start + before.length + selected.length }
    : { value: next, selStart: start + before.length, selEnd: start + before.length }
}

/** Avvolge le righe selezionate in `{start_of_x}` / `{end_of_x}`, ognuna su riga propria. */
export function wrapSection(value: string, start: number, end: number, kind: SectionKind): Edit {
  const open = `{start_of_${kind}}\n`
  const close = `{end_of_${kind}}\n`
  const lead = start > 0 && value[start - 1] !== '\n' ? '\n' : ''
  const selected = value.slice(start, end).replace(/\n+$/, '')
  const body = selected ? `${selected}\n` : '\n'
  const text = `${lead}${open}${body}${close}`
  const next = value.slice(0, start) + text + value.slice(end)
  const cursor = start + lead.length + open.length + (selected ? selected.length : 0)
  return { value: next, selStart: cursor, selEnd: cursor }
}

/** Accordi presenti nel testo, dal più usato al meno usato (a parità, ordine di comparsa). */
export function usedChords(content: string, limit = 12): string[] {
  const counts = new Map<string, number>()
  for (const m of content.matchAll(/\[([^\]\n]+)\]/g)) {
    const chord = m[1].trim()
    if (chord) counts.set(chord, (counts.get(chord) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([chord]) => chord)
}
