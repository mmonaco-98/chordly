# Network-First Caching Design

**Data:** 2026-05-07  
**Stato:** Approvato

## Obiettivo

Modificare la strategia di caching dell'app da "cache-first con refresh TTL" a "network-first con fallback cache" per tutte le entità (canzoni, playlist, trasposizioni).

## Comportamento Attuale

- `useSongs` legge dalla cache locale
- Controlla se è passata 1 ora (TTL)
- Se scaduta, fa refresh da BE in background
- In caso di errore, resta sulla cache

## Comportamento Desiderato

1. **Sempre network-first** — ogni mount tenta di recuperare dati da BE
2. **Fallback cache** — se BE fallisce (offline/errore), usa la cache
3. **Rendering immediato** — mostra subito la cache se disponibile, aggiorna silenziosamente quando BE risponde
4. **Nessun TTL** — rimuovi logica di refresh temporizzato
5. **Aggiornamento sempre** — sovrascrivi cache e stato ogni volta che BE risponde, senza controlli di uguaglianza

## Architettura

### Hook Pattern

```typescript
export function useSongs(): Song[] {
  const songs = useSyncExternalStore(
    (listener) => subscribe(SONGS_KEY, listener),
    () => getSnapshot<Song[]>(SONGS_KEY, []),
    () => getSnapshot<Song[]>(SONGS_KEY, []),
  );

  useEffect(() => {
    // Network-first: tenta sempre BE
    void refreshSongs()
      .then((data) => {
        // BE risposto → cache e stato aggiornati da refreshSongs
      })
      .catch(() => {
        // BE fallito → resta su cache, nessun errore a UI
      });
  }, []);

  return songs;
}
```

### Modifiche Richieste

| File | Cambiamento |
|------|-------------|
| `hooks/useSongs.ts` | Rimuovi `shouldRefresh()` e TTL, fetch BE sempre al mount |
| `hooks/usePlaylists.ts` | Stessa logica |
| `hooks/useTranspositions.ts` | Stessa logica (creare se non esiste) |

### File Non Modificati

- `api/songsRepo.ts` — `refreshSongs()` già gestisce errore BE
- `api/playlistsRepo.ts` — `refreshPlaylists()` già gestisce errore BE
- `api/transpositionsRepo.ts` — `refreshTranspositions()` già gestisce errore BE
- `api/cacheStore.ts` — nessuna modifica necessaria

## Flusso Utente

1. **Apre app** → vede subito dati in cache (se esistono)
2. **App aggiorna** — fetch BE silenzioso in background
3. **BE risponde** — UI si aggiorna con dati nuovi
4. **Offline/Errore** — UI resta su cache, nessun errore visibile

## Testing

- [ ] Avvio app con cache → verifica rendering immediato
- [ ] Avvio app senza cache → verifica fetch BE
- [ ] Offline → verifica fallback su cache
- [ ] BE lento → verifica UI non si blocca

## Note

- La strategia network-first garantisce dati sempre freschi quando possibile
- La cache come fallback garantisce UX offline senza errori
- Nessun loading state → UX più fluida
