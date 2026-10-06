// Accordi in notazione italiana (DO, RE-, SOL7+, ...) -> internazionale (C, Dm, Gmaj7, ...).

const NOTES = { do: 'C', re: 'D', mi: 'E', fa: 'F', sol: 'G', la: 'A', si: 'B' }
const DASHES = /[‐-―−]/g
const ROOT = /^(sol|do|re|mi|fa|la|si)([#b♭♯]?)/i
// qualità ammessa dopo la conversione: m? maj? numero? sus? add? aug/dim?
const QUALITY_OK = /^m?(maj)?\d*(sus\d)?(add\d+)?(aug|dim)?$/

function parseNote(s) {
  const m = s.match(ROOT)
  if (!m) return null
  const acc = m[2] === '♭' ? 'b' : m[2] === '♯' ? '#' : m[2]
  return { note: NOTES[m[1].toLowerCase()] + acc, rest: s.slice(m[0].length) }
}

function convertQuality(rest) {
  let q = rest.replace(DASHES, '-')
  let minor = false
  if (q.startsWith('-')) { minor = true; q = q.slice(1) }
  else if (q.startsWith('m') && !q.startsWith('maj')) { minor = true; q = q.slice(1) }
  q = q.replace(/^4\/7$|^7\/4$/, '7sus4')
  q = q.replace(/^\+7/, 'maj7').replace(/^7\+/, 'maj7')
  q = q.replace(/^5\+$/, 'aug')
  q = q.replace(/^4$/, 'sus4')
  q = (minor ? 'm' : '') + q
  return QUALITY_OK.test(q) ? q : null
}

export function convertChordIt(token) {
  const fail = { chord: token, ok: false }
  // il basso si separa solo se '/' è seguito da una nota italiana ('4/7', '6/9' fanno parte della qualità)
  const bassMatch = token.match(/\/((?:sol|do|re|mi|fa|la|si)[#b♭♯]?.*)$/i)
  let main = token
  let bass = ''
  if (bassMatch) {
    main = token.slice(0, bassMatch.index)
    const b = parseNote(bassMatch[1])
    if (!b) return fail
    const bq = convertQuality(b.rest)
    if (bq === null) return fail
    bass = '/' + b.note + bq
  }
  const root = parseNote(main)
  if (!root) return fail
  const q = convertQuality(root.rest)
  if (q === null) return fail
  return { chord: root.note + q + bass, ok: true }
}

export function keyOfChord(chord) {
  const m = chord.match(/^([A-G][#b]?)(m(?!aj))?/)
  return m ? m[1] + (m[2] ?? '') : ''
}
