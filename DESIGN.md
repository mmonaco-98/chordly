---
name: Chordly
description: Canzoniere personale per suonare dal vivo, blu-ardesia notturno con accordi azzurri.
colors:
  bg-dark: "#10151b"
  surface-dark: "#18212b"
  surface-2-dark: "#232f3c"
  accent-dark: "#2f8fe0"
  accent-light-dark: "#4ba6f0"
  on-accent-dark: "#06121d"
  text-dark: "#eaf0f6"
  text-muted-dark: "#8d9cac"
  bg-light: "#f2f5f9"
  surface-light: "#ffffff"
  surface-2-light: "#e2e9f1"
  accent-light-theme: "#1b78c9"
  accent-strong-light: "#1769b2"
  on-accent-light: "#ffffff"
  text-light: "#121c27"
  text-muted-light: "#53657a"
  danger: "#dc2626"
typography:
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "1.6rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.5px"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "1.2rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.6
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "0.72rem"
    fontWeight: 700
    letterSpacing: "0.08em"
  chord:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "0.74em"
    fontWeight: 700
    letterSpacing: "0.04em"
  mono:
    fontFamily: "Courier New, Courier, monospace"
    fontSize: "0.85rem"
    lineHeight: 1.6
rounded:
  sm: "6px"
  md: "10px"
  lg: "12px"
  xl: "16px"
  pill: "999px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1rem"
  xl: "1.25rem"
components:
  song-card:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.text-dark}"
    rounded: "{rounded.lg}"
    padding: "0.9rem 1rem"
  song-card-hover:
    backgroundColor: "{colors.surface-2-dark}"
  button-accent:
    backgroundColor: "{colors.accent-dark}"
    textColor: "{colors.on-accent-dark}"
    rounded: "{rounded.lg}"
    padding: "0.65rem 1.25rem"
  input-search:
    backgroundColor: "{colors.bg-dark}"
    textColor: "{colors.text-dark}"
    rounded: "{rounded.lg}"
    padding: "0.6rem 1rem"
  dock-button:
    textColor: "{colors.accent-light-dark}"
    rounded: "{rounded.md}"
    size: "2.75rem"
  key-chip:
    backgroundColor: "{colors.accent-dark}"
    textColor: "{colors.accent-light-dark}"
    rounded: "{rounded.sm}"
    padding: "0.2rem 0.5rem"
---

# Design System: Chordly

## Overview

**Creative North Star: "Il Leggio Notturno"**

Un leggio al buio: superfici blu-ardesia che si ritraggono, e gli accordi azzurri come unica voce luminosa. Il canto è il protagonista; l'interfaccia serve a trovarlo in fretta e a restare fuori dai piedi mentre si suona. Il sistema nasce scuro (tema predefinito) e ha una controparte chiara con la stessa gerarchia.

La densità è media, pensata per iPhone con una mano libera. I comandi sono grandi, con angoli morbidi e un leggero scalare al tocco. Il colore è usato con parsimonia: un solo accento azzurro, più rosso solo per l'azione distruttiva.

**Key Characteristics:**
- Tema dark di default, light via `data-theme="light"`; stesse variabili, valori diversi.
- Un solo accento (azzurro), usato per titoli, accordi, stato attivo.
- Header e dock traslucidi con blur, bordi sottili da 1px.
- Target a 44px, feedback al tocco con `scale(0.92–0.98)`.

## Colors

Palette fredda e monocromatica: ardesia scura più un azzurro luminoso. Le variabili vivono in `src/index.css` (`:root` e `[data-theme="light"]`); i valori nel frontmatter sono normativi.

### Primary
- **Azzurro Accordo** (#4ba6f0 dark / #1769b2 light, `--accent-light` e `--chord`): titoli, accordi, icone attive, testo dei chip. È la voce principale.
- **Azzurro Azione** (#2f8fe0 dark / #1b78c9 light, `--accent`): riempimento dei bottoni primari, bordi attivi e focus, filetto del ritornello.

### Neutral
- **Notte Profonda** (#10151b dark / #f2f5f9 light, `--bg`): sfondo pagina e campi di input.
- **Ardesia** (#18212b / #ffffff, `--surface`): card, pannelli, header (con alpha).
- **Ardesia Chiara** (#232f3c / #e2e9f1, `--surface-2`): hover, bordi, divisori, pulsanti secondari.
- **Bianco Gelo** (#eaf0f6 / #121c27, `--text`): testo principale.
- **Grigio Nebbia** (#8d9cac / #53657a, `--text-muted`): artista, label, testo secondario.
- **Rosso Elimina** (#dc2626, `--danger`; hover/active #b91c1c `--danger-strong`): solo azioni distruttive.

### Named Rules
**The One Voice Rule.** L'azzurro è l'unico colore di accento. Compare su accordi, titoli e stato attivo; le superfici restano neutre.
**The Mixed Tint Rule.** Le tinte d'accento su sfondo si ottengono con `color-mix(in srgb, var(--accent) N%, ...)` (8–16%), mai con un secondo colore.

## Typography

**Font:** font di sistema (-apple-system, BlinkMacSystemFont, Segoe UI, Roboto), nessun webfont: scelta deliberata per velocità e offline.
**Mono:** Courier New, solo in anteprima impostazioni ed editor ChordPro.

**Character:** sans geometrica e neutra, pesi alti (600–700) per leggere bene da lontano, senza serif né display.

### Hierarchy
- **Headline** (700, 1.6rem, letter-spacing -0.5px): titolo "Chordly" nella lista.
- **Title** (700, 1.2rem, 1.25): titolo canzone in header, in azzurro, su una riga con ellissi.
- **Body** (600, 1rem): titoli di card e voci di lista; testi canzone a 500.
- **Label** (700, 0.72rem, maiuscolo, 0.08em): intestazioni di sezione, lettere della lista, etichette campo.
- **Chord** (700, 0.74em rispetto al testo, 0.04em): accordi sopra il testo; la dimensione testo canzone è regolabile 12–26 px.

### Named Rules
**The Chord Above Rule.** Gli accordi stanno sempre sopra la sillaba, più piccoli e più luminosi del testo, mai in linea.

## Layout

Colonna singola full-width su telefono con gutter da 1rem; da 768px la lista a lettere passa a due colonne. Pagine a `min-height: 100dvh` con header sticky in alto (rispetta `env(safe-area-inset-top)`) e, in SongView, dock fisso in basso (`safe-area-inset-bottom`). Ritmo di spaziatura su multipli di 0.25rem (0.5, 0.75, 1, 1.25rem). Il contenuto canzone ha 7rem di padding in basso per non finire sotto il dock. Una sidebar alfabetica fissa a destra permette di saltare tra le lettere.

## Elevation & Depth

Profondità tonale: bg → surface → surface-2, separati da bordi da 1px. Le ombre compaiono solo su elementi flottanti. Gli header sticky e il dock usano trasparenza (`rgba(surface, .88–.94)`) con `backdrop-filter: blur(14px)`.

### Shadow Vocabulary
- **Pannello flottante** (`box-shadow: 0 12px 32px rgba(0,0,0,.35)`): pannello "altro" sopra il dock.
- **Tooltip e dropdown** (`0 8px 32px rgba(0,0,0,.3)` / `0 8px 24px rgba(0,0,0,.35)`): tooltip accordo, combobox, elemento trascinato.
- **Modale** (`0 12px 40px rgba(0,0,0,.4)`): conferma elimina.

### Named Rules
**The Flat-At-Rest Rule.** A riposo le superfici sono piatte; l'ombra indica solo che qualcosa sta sopra il contenuto.

## Shapes

Angoli morbidi e coerenti: 12px (`--radius`) per card, input, bottoni; 10px per bottoni icona e dock; 14–16px per gruppi e pannelli; 6–8px per chip e campi piccoli; pillole (999px) per badge e contatori. I bottoni di controllo tondi (50%) per +/−. Il ritornello è una fascia con filetto sinistro da 3px e angoli arrotondati solo a destra.

## Components

### Buttons
- **Shape:** 12px (`--radius`); circolari per +/− (2.2–2.5rem).
- **Primary:** fondo `--accent`, testo `--on-accent`, 700, padding 0.65rem 1.25rem.
- **Hover / Active:** `:active` scala 0.92–0.98 e schiarisce verso `--accent-light`; `:hover` solo con `@media (hover: hover)`.
- **Ghost / Icon:** `.icon-btn` 2.25rem, `--text-muted`, fondo `--surface-2` al tocco.
- **Disabled:** opacità 0.3–0.5.

### Chips
- **Key chip:** testo azzurro, fondo accent 14–16%, raggio 6–8px, maiuscolo 0.75rem; capo/bpm sono contorni neutri senza riempimento.
- **Toggle filtro:** bordo 1.5px neutro; attivo con bordo e testo azzurri e fondo accent 16%.

### Cards / Containers
- **Song card:** fondo `--surface`, raggio 12px, padding 0.9rem 1rem; hover (solo puntatore) fondo `--surface-2` con bordo `--accent`; chiave a destra come chip.
- **Settings section:** surface con bordo `--surface-2`, raggio 12px.

### Inputs / Fields
- **Style:** fondo `--bg`, bordo 1.5px `--surface-2`, raggio 12px, testo 1rem (evita lo zoom iOS).
- **Focus:** il bordo diventa `--accent`, senza anello esterno.

### Navigation
- Header sticky traslucido con bordo inferiore; pulsante indietro e azioni come `.icon-btn`. Il drawer playlist scorre da sinistra (280px, backdrop 50% nero). Il dock di SongView raggruppa i controlli in gruppi con fondo `--bg`, bordo e raggio 14px, con maschera di sfumatura a destra per indicare lo scroll.

### Chord Sheet (signature)
Accordi azzurri 700 sopra il testo 500; ritornello con fondo accent 8% su surface, filetto sinistro 3px ed etichetta "RIT." in label maiuscolo. Toccando un accordo si apre un tooltip con il diagramma (surface, raggio 12px, ombra) con navigazione tra le diteggiature. La stampa passa a bianco/nero con accordi bruni.

## Do's and Don'ts

### Do:
- **Do** usare solo le variabili (`--bg`, `--surface`, `--surface-2`, `--accent`, `--chord`, `--text`, `--text-muted`) e verificare ogni schermata in dark e light.
- **Do** tenere i target tattili ad almeno 44px sulle azioni primarie e rispettare le safe area iOS.
- **Do** lasciare `:hover` dentro `@media (hover: hover)` e dare sempre un feedback `:active`.
- **Do** mantenere gli input a 16px o più per evitare lo zoom di iOS.
- **Do** rispettare `prefers-reduced-motion` per le animazioni di pannelli e collapse.

### Don't:
- **Don't** introdurre un secondo colore d'accento oltre all'azzurro (il rosso è riservato alle azioni distruttive).
- **Don't** usare ombre sulle superfici a riposo, né bordi laterali colorati diversi dal filetto del ritornello.
- **Don't** mettere gli accordi in linea con il testo o ridurre il contrasto di accordi e testi sotto la leggibilità dal vivo.
- **Don't** rendere decorativo ciò che serve a suonare: niente animazioni lunghe, niente elementi che coprano il testo.
