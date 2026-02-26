import ChordSheetJS from 'chordsheetjs'
import { convertChord } from '../utils/convertChord'
import type { ChordNotation } from '../utils/convertChord'

interface Props {
  content: string
  notation?: ChordNotation
}

function processHtml(html: string, notation: ChordNotation): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')

  doc.querySelectorAll('.row').forEach(row => {
    const cols = Array.from(row.querySelectorAll<HTMLElement>(':scope > .column'))
    for (let i = 0; i < cols.length - 1; i++) {
      const lyrics = cols[i].querySelector('.lyrics')?.textContent ?? ''
      if (lyrics.length > 0 && !/\s$/.test(lyrics)) {
        cols[i].classList.add('word-continues')
      }
    }
  })

  if (notation === 'italian') {
    doc.querySelectorAll('.chord').forEach(el => {
      const text = el.textContent ?? ''
      if (text) el.textContent = convertChord(text, 'italian')
    })
  }

  return doc.body.innerHTML
}

export function ChordSheet({ content, notation = 'international' }: Props) {
  let html = ''
  try {
    const parser = new ChordSheetJS.ChordProParser()
    const sheet = parser.parse(content)
    const formatter = new ChordSheetJS.HtmlDivFormatter()
    html = processHtml(formatter.format(sheet), notation)
  } catch {
    html = `<pre>${content}</pre>`
  }

  return (
    <div
      className="chord-sheet"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
