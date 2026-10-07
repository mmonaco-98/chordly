# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Una sola persona, l'autore (uso personale), che consulta testi e accordi mentre suona o canta, principalmente su iPhone installato come PWA. Il job: trovare un canto in fretta e leggerlo con lo strumento in mano.

## Product Purpose

Chordly è un canzoniere personale: lista di canti con ricerca e filtri, pagina canzone con accordi in ChordPro, trasposizione e dimensione del testo regolabile, playlist, tema dark/light. Successo: aprire il canto giusto e suonarlo senza intoppi, anche senza rete.

## Positioning

È il repertorio curato dall'autore (import del catalogo canticristiani, editor, sync giornaliero, autori normalizzati), disponibile offline, senza account né pubblicità. Un'app generalista di accordi non può offrire un catalogo costruito su misura.

## Operating Context

- Installata su iPhone come PWA; cache locale su IndexedDB, service worker Workbox.
- Canzoni nella tabella Supabase `songs`, formato ChordPro, sincronizzazione incrementale su `updated_at`.
- Import e backfill tramite script (`import:*`, `authors:*`).

## Capabilities and Constraints

- Navigazione `/` → `/song/:id` → `/settings`; filtri (ricerca titolo, autore, raccolta, "cerca anche nel testo") nei query param.
- Prev/next scorre la lista filtrata; trasposizione in semitoni; fontSize 12–26 px.
- Stack: Vite 6, React 18, TypeScript strict, chordsheetjs v14, react-router v6.
- Interfaccia solo in italiano; nessuna i18n prevista.
- Non deciso: eventuale apertura ad altri utenti.

## Brand Commitments

Nome "Chordly"; icone PNG derivate dal logo Chordly (`public/icons/`). Temi dark e light già presenti.

## Evidence on Hand

Catalogo reale su Supabase e legacy in `src/songs/*.json`. Nessun testimonial, metrica o dato di utenti esterni: non inventarne.

## Product Principles

1. Leggibilità dal vivo prima dell'espressione: il canto è il protagonista, l'interfaccia si ritrae.
2. Offline sempre: nessuna funzione essenziale dipende dalla rete.
3. Repertorio personale e curato, non un catalogo generalista.
4. Operazioni veloci con una mano sola, su schermo piccolo.
