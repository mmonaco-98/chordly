import { describe, it, expect, vi, beforeEach } from 'vitest'

const loadAll = vi.fn()
const saveAll = vi.fn()
vi.mock('./songsDb', () => ({ loadAll, saveAll }))

const legacy = [{ id: 'a', title: 'A', artist: '', key: '', content: '', tags: [] }]
let storage: Record<string, string>
const removeItem = vi.fn((k: string) => { delete storage[k] })

beforeEach(() => {
  vi.resetModules()
  loadAll.mockReset(); saveAll.mockReset(); removeItem.mockClear()
  storage = { 'cache:songs': JSON.stringify(legacy) }
  vi.stubGlobal('localStorage', { getItem: (k: string) => storage[k] ?? null, removeItem })
})

describe('initSongsStore: migrazione da localStorage', () => {
  it('salva su IndexedDB prima di rimuovere la chiave legacy', async () => {
    loadAll.mockResolvedValue({ songs: [], lastUpdatedAt: 0 })
    saveAll.mockResolvedValue(undefined)
    const { initSongsStore, getSongsSnapshot } = await import('./songsStore')
    await initSongsStore()
    expect(saveAll).toHaveBeenCalledWith(legacy, 0)
    expect(removeItem).toHaveBeenCalledWith('cache:songs')
    expect(getSongsSnapshot()).toEqual(legacy)
  })
  it('se IndexedDB fallisce, NON rimuove la chiave legacy', async () => {
    loadAll.mockRejectedValue(new Error('no idb'))
    saveAll.mockRejectedValue(new Error('no idb'))
    const { initSongsStore, getSongsSnapshot } = await import('./songsStore')
    await initSongsStore()
    expect(removeItem).not.toHaveBeenCalled()
    expect(getSongsSnapshot()).toEqual(legacy)
  })
})
