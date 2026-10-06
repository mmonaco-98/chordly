# Sync periodico canti da canticristiani.it — Design

## Obiettivo

Ogni giorno un job importa su Supabase i canti **nuovi** pubblicati su
`https://www.canticristiani.it/api/canti.json`, convertendoli con lo stesso
convertitore usato per l'import iniziale (~1500 canti). L'app client non cambia:
`refreshSongs` legge già in modo incrementale su `updated_at`.

## Decisioni concordate

- **Dove gira:** GitHub Actions (cron + `workflow_dispatch`).
- **Cosa importa:** solo canti nuovi. I canti già presenti non vengono mai
  modificati (regola esistente: "mai distruttivo", `ignoreDuplicates`). Le
  correzioni manuali su Supabase non si perdono; le modifiche upstream non arrivano.
- **Frequenza:** una volta al giorno, `0 6 * * *` (UTC).
- **Errori:** solo l'email standard di GitHub sui workflow falliti.
- **Credenziali:** `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` come secret del
  repo (le stesse dell'upload manuale). Presuppone che le policy RLS permettano
  l'insert con la chiave anon, come già avviene oggi.

## Flusso di `sync`

Nuovo sottocomando di `scripts/import-canti.mjs`: `npm run import:sync [-- --yes]`.

1. Scarica `canti.json` e converte **tutti** i canti con `convertCanto`
   (`bigCollections` richiede l'intero insieme per decidere i tag delle raccolte grandi).
2. Legge da Supabase gli id esistenti con tag `canticristiani` (paginato; il filtro
   evita che un canto creato a mano con id `...-7` blocchi il canto 7) ed estrae da ciascuno il suffisso
   numerico `id_canti` (`slug(titolo)-id_canti`). Il confronto è sul suffisso, non
   sull'id completo: un titolo cambiato upstream cambierebbe lo slug e creerebbe
   un duplicato.
3. Seleziona i canti con `id_canti` assente in DB.
4. Con `--yes` li inserisce a lotti da 100 con `upsert(..., { onConflict: 'id',
   ignoreDuplicates: true })` e `updated_at` strettamente crescente, partendo da
   `Date.now()`, così il cursore `gt` del client non salta righe. Senza `--yes` è un dry-run.
5. Stampa un riepilogo: canti nell'API, canti già in DB, canti aggiunti, canti
   saltati per errore di parsing.

## Guardie di sicurezza

Il job gira senza supervisione, quindi:

- Errore HTTP, struttura inattesa (`canti.data` non è un array) o meno di 1000
  canti → fallisce senza scrivere.
- Più di 50 canti nuovi → fallisce senza scrivere. Il tetto si alza lanciando il
  workflow a mano con l'input `max_new` (o `--max-new` da CLI).
- Un canto che non supera parse ChordPro + `transpose(1)` viene saltato e
  riportato nel log; gli altri proseguono.
- Un canto con titolo mancante/vuoto o id duplicato viene saltato e riportato nel
  log (non fa fallire il job, altrimenti un solo canto upstream rotto bloccherebbe
  per sempre gli import).

## Credenziali in CI

`process.loadEnvFile('.env')` lancia se il file manca. Nuovo comportamento: se
`process.env.VITE_SUPABASE_URL` è già impostata si usa l'ambiente; altrimenti si
carica `.env`. Vale anche per la fase `upload` esistente.

## Workflow `.github/workflows/sync-canti.yml`

- Trigger: `schedule` (`0 6 * * *`) e `workflow_dispatch` con input opzionale `max_new`.
- `permissions: contents: read`; `concurrency` per evitare esecuzioni sovrapposte.
- Passi: checkout, `setup-node` (Node 22), `npm ci`, `npm run import:sync -- --yes`.
- Limite noto: GitHub disattiva i workflow schedulati dopo 60 giorni senza attività
  nel repo (repo pubblici). Si riattiva con un commit o dal tab Actions.

## Struttura del codice

Logica pura in `scripts/lib/syncCanti.mjs`, testabile senza rete:

- `extractCantoId(id)` → suffisso numerico di `slug-id_canti`, o `null`.
- `pickNewSongs(songs, existingIds)` → canti da inserire.
- `assertSane({ rawCount, newCount, maxNew })` → lancia se violate le guardie.

Il comando `sync` in `import-canti.mjs` collega queste funzioni a fetch e Supabase.

## Test (vitest)

- Stesso `id_canti` con titolo diverso → non nuovo.
- `id_canti` assente in DB → nuovo.
- `assertSane`: pochi canti, struttura errata, troppi nuovi → errore; caso valido → ok.
- Canto non parsabile → saltato, gli altri proseguono.
- Senza `--yes` nessuna scrittura (client Supabase finto).

## Documentazione

Aggiornare `CLAUDE.md` (sezione "Aggiornamento: canzoni su Supabase") con
`import:sync`, i secret da configurare e il limite dei 60 giorni. `INSTALL.md`
riguarda l'installazione su iPhone e non va toccato.

## Fuori scope

Aggiornamento dei canti esistenti, notifiche oltre l'email di GitHub, modifiche
all'app client.
