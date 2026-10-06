import { convertChordIt, keyOfChord } from './convertChordIt.mjs'

const RENAME = {
  start_chorus: 'start_of_chorus', soc: 'start_of_chorus', start_of_chorus: 'start_of_chorus',
  end_chorus: 'end_of_chorus', eoc: 'end_of_chorus', end_of_chorus: 'end_of_chorus',
  start_bridge: 'start_of_bridge', end_bridge: 'end_of_bridge',
}
// strofa implicita: nessuna direttiva
const SILENT = new Set(['start_verse', 'end_verse', 'sov', 'eov', 'start_verse_num', 'end_verse_num', 'end_verve'])

export function slugify(s) {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function bigCollections(rows, min = 5) {
  const count = new Map()
  for (const r of rows) {
    const k = (r.raccolta ?? '').trim()
    if (k) count.set(k, (count.get(k) ?? 0) + 1)
  }
  return new Set([...count].filter(([, n]) => n >= min).map(([k]) => k))
}

export function convertCanto(raw, opts = {}) {
  const report = { unknownChords: [], droppedDirectives: [], noChords: false }
  const hasChords = (raw.accordi ?? '').trim() !== ''
  const source = hasChords ? raw.accordi : (raw.testo ?? '')
  report.noChords = !hasChords

  let firstChord = ''
  const lines = source.replace(/\r\n?/g, '\n').replace(/ /g, ' ').split('\n')
  const out = []
  for (const line of lines) {
    let hadDirective = false
    let l = line.replace(/\{([^}]*)\}/g, (_m, body) => {
      hadDirective = true
      const sep = body.search(/[:/]/)
      const name = (sep === -1 ? body : body.slice(0, sep)).trim().toLowerCase()
      const arg = sep === -1 ? '' : body.slice(sep + 1).trim()
      if (RENAME[name]) return `{${RENAME[name]}}`
      if (SILENT.has(name)) return ''
      if (name === 'c' || name === 'comment') return arg ? `{comment: ${arg}}` : ''
      report.droppedDirectives.push(name)
      return ''
    })
    l = l.replace(/\[([^\]]*)\]/g, (_m, token) => {
      const { chord, ok } = convertChordIt(token.trim())
      if (!ok) { report.unknownChords.push(token); return `[${token}]` }
      if (!firstChord) firstChord = chord
      return `[${chord}]`
    })
    l = l.replace(/\s+$/, '')
    if (hadDirective && l.trim() === '' && line.trim() !== '') continue
    out.push(l)
  }

  const content = out.join('\n').replace(/\n{3,}/g, '\n\n').trim()
  const collection = (raw.raccolta ?? '').trim()
  const tags = ['canticristiani']
  if (collection && opts.bigCollections?.has(collection)) tags.push(collection)

  return {
    song: {
      id: `${slugify(raw.titolo)}-${raw.id_canti}`,
      title: raw.titolo.trim(),
      artist: (raw.autore ?? '').trim(),
      key: firstChord ? keyOfChord(firstChord) : '',
      content,
      tags,
    },
    report,
  }
}
