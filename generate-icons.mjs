/**
 * Generates minimal PWA icons using pure Node.js (no external deps).
 * Creates solid-color PNG files with a simple music note drawn in pixels.
 */
import { createWriteStream } from 'fs'
import { deflateSync } from 'zlib'

function crc32(buf) {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[i] = c
  }
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type)
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const payload = Buffer.concat([typeBytes, data])
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(payload))
  return Buffer.concat([len, payload, crcBuf])
}

function makePng(size) {
  // Background colour: #1a1a2e → R=26 G=26 B=46
  // Accent colour: #f4c55a → R=244 G=197 B=90
  const bg = [26, 26, 46]
  const accent = [244, 197, 90]

  // Build raw pixel rows (RGBA, filter byte 0 prepended per row)
  const rows = []
  for (let y = 0; y < size; y++) {
    const row = [0] // filter type None
    for (let x = 0; x < size; x++) {
      // Draw a simple circle accent in the centre (radius = 35% of size)
      const cx = size / 2, cy = size / 2, r = size * 0.35
      const dx = x - cx, dy = y - cy
      const inside = dx * dx + dy * dy < r * r
      // Rounded rect mask
      const margin = size * 0.12
      const rx = size * 0.16
      const inRect = x > margin && x < size - margin && y > margin && y < size - margin
      // Simple music note mark: vertical bar on right, filled oval
      const noteOvalCx = size * 0.44, noteOvalCy = size * 0.58, noteOvalR = size * 0.13
      const noteStemX1 = size * 0.56, noteStemX2 = size * 0.60
      const noteStemY1 = size * 0.25, noteStemY2 = size * 0.58
      const inNoteOval = (x - noteOvalCx) ** 2 / (noteOvalR * 1.3) ** 2 + (y - noteOvalCy) ** 2 / (noteOvalR * 0.9) ** 2 < 1
      const inNoteStem = x >= noteStemX1 && x <= noteStemX2 && y >= noteStemY1 && y <= noteStemY2
      const isNote = inNoteOval || inNoteStem

      const color = isNote ? accent : bg
      row.push(color[0], color[1], color[2], 255)
    }
    rows.push(Buffer.from(row))
  }

  const rawData = Buffer.concat(rows)
  const compressed = deflateSync(rawData, { level: 6 })

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(size, 0)
  ihdrData.writeUInt32BE(size, 4)
  ihdrData[8] = 8  // bit depth
  ihdrData[9] = 2  // colour type RGB (no alpha, but we send RGBA below — use 6)
  ihdrData[9] = 6  // RGBA
  ihdrData[10] = 0 // compression
  ihdrData[11] = 0 // filter
  ihdrData[12] = 0 // interlace
  ihdrData.writeUInt32BE(size, 0)
  ihdrData.writeUInt32BE(size, 4)

  return Buffer.concat([sig, chunk('IHDR', ihdrData), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))])
}

const sizes = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
]

for (const { name, size } of sizes) {
  const buf = makePng(size)
  const ws = createWriteStream(`public/icons/${name}`)
  ws.write(buf)
  ws.end()
  console.log(`Generated public/icons/${name} (${size}x${size})`)
}
