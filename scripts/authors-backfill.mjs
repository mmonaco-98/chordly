// Uso: node scripts/authors-backfill.mjs report | apply | restore [--yes]
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'
import { loadAliases } from './lib/loadAliases.mjs'
import { planBackfill, fetchBackfillRows, updateRows } from './lib/authorsBackfill.mjs'

const DIR = new URL('./data/', import.meta.url)
const REPORT = new URL('authors-report.json', DIR)
const BACKUP = new URL('artist-backup.json', DIR)
const ALIASES = new URL('./authors-aliases.json', import.meta.url)

const cmd = process.argv[2]
const yes = process.argv.includes('--yes')

function connect() {
  if (!process.env.VITE_SUPABASE_URL) process.loadEnvFile('.env')
  return createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
}

async function readBackup() {
  try { return JSON.parse(await readFile(BACKUP, 'utf8')) } catch (e) {
    if (e.code === 'ENOENT') return {}
    throw e
  }
}

async function plan() {
  const supabase = connect()
  const [rows, aliases, backup] = await Promise.all([fetchBackfillRows(supabase), loadAliases(ALIASES), readBackup()])
  return { supabase, backup, ...planBackfill(rows, aliases, backup) }
}

function printReport({ changes, report }) {
  console.log(`righe: ${report.rows}; autori distinti: ${report.authors}; senza autore: ${report.noAuthor}`)
  console.log(`righe da aggiornare: ${changes.length}`)
  console.log(`"-" senza spazi da risolvere: ${report.unresolvedHyphens.length} (aggiungere override in scripts/authors-aliases.json)`)
  console.log(`gruppi di varianti unificate: ${report.variantGroups.length}; possibili alias per cognome: ${report.possibleAliases.length}`)
}

async function reportPhase() {
  const result = await plan()
  await mkdir(DIR, { recursive: true })
  await writeFile(REPORT, JSON.stringify(result.report, null, 2))
  printReport(result)
  console.log('report scritto in scripts/data/authors-report.json')
}

async function applyPhase() {
  const result = await plan()
  printReport(result)
  if (!yes) { console.log('dry-run: nessuna scrittura. Rilanciare con --yes'); return }
  const backup = { ...result.backup }
  for (const c of result.changes) if (!(c.id in backup)) backup[c.id] = c.oldArtist // il backup esistente non si sovrascrive
  await mkdir(DIR, { recursive: true })
  await writeFile(BACKUP, JSON.stringify(backup, null, 2))
  const updates = result.changes.map((c) => ({ id: c.id, values: { authors: JSON.stringify(c.authors), artist: c.artist } }))
  await updateRows(result.supabase, updates, Date.now())
  console.log(`aggiornate ${updates.length} righe (backup di artist in scripts/data/artist-backup.json)`)
}

async function restorePhase() {
  const backup = await readBackup()
  const ids = Object.keys(backup)
  console.log(`righe da ripristinare dal backup: ${ids.length}`)
  if (!yes) { console.log('dry-run: nessuna scrittura. Rilanciare con --yes'); return }
  const updates = ids.map((id) => ({ id, values: { artist: backup[id], authors: '[]' } }))
  await updateRows(connect(), updates, Date.now())
  console.log('artist ripristinato; authors azzerato')
}

const phases = { report: reportPhase, apply: applyPhase, restore: restorePhase }
if (!phases[cmd]) { console.error('uso: node scripts/authors-backfill.mjs report|apply|restore [--yes]'); process.exit(1) }
await phases[cmd]()
