// Uso: node scripts/import-canti.mjs fetch | convert | upload [--yes]
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'
import { convertCanto, bigCollections } from './lib/convertCanto.mjs'

const API_URL = 'https://www.canticristiani.it/api/canti.json'
const DIR = new URL('./data/', import.meta.url)
const RAW = new URL('canti.raw.json', DIR)
const PREVIEW = new URL('songs.preview.json', DIR)
const REPORT = new URL('report.json', DIR)
const BATCH = 100

const cmd = process.argv[2]
const yes = process.argv.includes('--yes')

async function fetchPhase() {
  await mkdir(DIR, { recursive: true })
  const res = await fetch(API_URL)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  await writeFile(RAW, JSON.stringify(json.canti.data))
  console.log(`scaricati ${json.canti.data.length} canti`)
}

async function convertPhase() {
  const rows = JSON.parse(await readFile(RAW, 'utf8'))
  const big = bigCollections(rows, 5)
  const songs = []
  const unknown = {}
  const dropped = {}
  const noChords = []
  const ids = new Set()
  for (const raw of rows) {
    const { song, report } = convertCanto(raw, { bigCollections: big })
    if (!song.title || ids.has(song.id)) throw new Error(`titolo vuoto o id duplicato: ${song.id}`)
    ids.add(song.id)
    songs.push(song)
    for (const c of report.unknownChords) unknown[c] = (unknown[c] ?? 0) + 1
    for (const d of report.droppedDirectives) dropped[d] = (dropped[d] ?? 0) + 1
    if (report.noChords) noChords.push(song.id)
  }
  await writeFile(PREVIEW, JSON.stringify(songs, null, 2))
  await writeFile(REPORT, JSON.stringify({ total: songs.length, noChords, dropped, unknown }, null, 2))
  console.log(`convertiti ${songs.length}; senza accordi ${noChords.length}; accordi sconosciuti ${Object.keys(unknown).length} tipi`)
  console.log('direttive scartate:', dropped)
}

async function uploadPhase() {
  process.loadEnvFile('.env')
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
  const songs = JSON.parse(await readFile(PREVIEW, 'utf8'))
  const count = async () => {
    const { count, error } = await supabase.from('songs').select('id', { count: 'exact', head: true })
    if (error) throw error
    return count
  }
  const before = await count()
  console.log(`righe in DB prima: ${before}; da importare: ${songs.length}`)
  if (!yes) { console.log('dry-run: nessuna scrittura. Rilanciare con --yes'); return }
  const now = Date.now()
  for (let i = 0; i < songs.length; i += BATCH) {
    const rows = songs.slice(i, i + BATCH).map((s) => ({
      id: s.id, title: s.title, artist: s.artist, song_key: s.key, bpm: null,
      content: s.content, tags: JSON.stringify(s.tags), updated_at: now,
    }))
    const { error } = await supabase.from('songs').upsert(rows, { onConflict: 'id', ignoreDuplicates: true })
    if (error) throw new Error(`batch ${i}: ${error.message}`)
    console.log(`batch ${i / BATCH + 1}/${Math.ceil(songs.length / BATCH)} ok`)
  }
  console.log(`righe in DB dopo: ${await count()}`)
}

const phases = { fetch: fetchPhase, convert: convertPhase, upload: uploadPhase }
if (!phases[cmd]) { console.error('uso: node scripts/import-canti.mjs fetch|convert|upload [--yes]'); process.exit(1) }
await phases[cmd]()
