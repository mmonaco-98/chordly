import { describe, it, expect } from 'vitest'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { loadAliases } from './loadAliases.mjs'

describe('loadAliases', () => {
  it('legge overrides e names, con default se mancano', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'aliases-'))
    const file = join(dir, 'a.json')
    await writeFile(file, JSON.stringify({ overrides: { 'A-B': ['A', 'B'] } }))
    expect(await loadAliases(pathToFileURL(file))).toEqual({ overrides: { 'A-B': ['A', 'B'] }, names: {} })
  })
  it('file assente → alias vuoti', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'aliases-'))
    expect(await loadAliases(pathToFileURL(join(dir, 'nope.json')))).toEqual({ overrides: {}, names: {} })
  })
  it('JSON non valido → errore', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'aliases-'))
    const file = join(dir, 'bad.json')
    await writeFile(file, '{')
    await expect(loadAliases(pathToFileURL(file))).rejects.toThrow()
  })
})
