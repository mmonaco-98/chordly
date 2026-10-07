import { readFile } from 'node:fs/promises'
import { EMPTY_ALIASES } from '../../src/utils/authors.mjs'

/** Legge scripts/authors-aliases.json; se il file non esiste usa alias vuoti. */
export async function loadAliases(url) {
  try {
    const json = JSON.parse(await readFile(url, 'utf8'))
    return { overrides: json.overrides ?? {}, names: json.names ?? {} }
  } catch (e) {
    if (e.code === 'ENOENT') return EMPTY_ALIASES
    throw e
  }
}
