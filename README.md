# Chordly PWA

Personal PWA for browsing song lyrics and chords, installable on iPhone and usable offline. Uses Supabase for data sync across devices.

## Stack

- **Vite 6** + **React 18** + **TypeScript** (strict mode)
- **vite-plugin-pwa 0.21** — service worker, manifest, offline via Workbox precache
- **chordsheetjs v14** — ChordPro parsing and transposition
- **react-router-dom v6** — routing `/` → `/song/:id` → `/playlist/:id` → `/settings`
- **@dnd-kit/core + @dnd-kit/sortable** — drag & drop for playlist reordering
- **@supabase/supabase-js** — direct database access with RLS policies

## Architecture overview

Chordly uses a serverless architecture with direct Supabase access:

- **Frontend** — React PWA with Supabase client in `src/api/supabaseClient.ts`
- **Backend** — Supabase Postgres with Row Level Security for access control

What lives where:

| Data | Where | Why |
|---|---|---|
| Songs | Supabase (`songs` table) | shared across devices, no rebuild needed |
| Playlists | Supabase (`playlists` table) | shared across devices |
| Per-song transpositions | Supabase (`transpositions` table) | shared across devices |
| Theme, font size, chord notation, autoscroll speed | `localStorage` (per device) | personal preferences |
| Offline cache of all the above | `localStorage` (`cache:*` keys) | PWA keeps working offline |

## Configuration

Create a `.env` file at the project root:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Get these values from your Supabase dashboard → Settings → API. The anon key is safe to expose in the frontend — access is controlled by Row Level Security policies.

## Commands

```bash
npm install
npm run dev      # local development
npm run build    # production build (tsc + vite build)
npx serve dist   # test PWA/service worker locally
node generate-icons.mjs  # regenerate PNG icons in public/icons/
```

## Deployment

Deploy the built `dist/` folder to any static hosting (Vercel, Netlify, etc.). Set the environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in your hosting platform.

## Project structure

```
src/
├── api/
│   ├── supabaseClient.ts     # Supabase client singleton
│   ├── auth.ts               # Supabase auth helpers
│   ├── cacheStore.ts         # in-memory + localStorage cache with pub/sub
│   ├── songsRepo.ts          # Supabase songs table operations
│   ├── playlistsRepo.ts      # Supabase playlists table operations
│   └── transpositionsRepo.ts # Supabase transpositions table operations
├── songs/
│   └── *.json                # local backup (not bundled, use Supabase dashboard for adding)
├── components/
│   ├── SongList.tsx          # list with search + tag filter + ⚙ → /settings
│   ├── SongCard.tsx          # single entry, navigates to /song/:id
│   ├── SongView.tsx          # song page, transpose, fontSize, autoscroll, PDF export
│   ├── PlaylistView.tsx      # playlist page with drag & drop (dnd-kit)
│   ├── AddSongsModal.tsx     # multi-select picker for adding songs to a playlist
│   ├── PlaylistModal.tsx     # quick add-to-playlist modal from SongView
│   ├── Settings.tsx          # theme, notation, fontSize, cache
│   ├── TagDrawer.tsx         # side drawer for tag filtering + playlist nav
│   ├── ChordSheet.tsx        # renders ChordPro via HtmlDivFormatter
│   └── SplashScreen.tsx
├── hooks/
│   ├── useSongs.ts           # backed by songsRepo + cacheStore
│   ├── usePlaylists.ts       # backed by playlistsRepo + cacheStore
│   ├── useTranspose.ts       # backed by transpositionsRepo + cacheStore
│   ├── useTheme.ts           # localStorage (per device)
│   ├── useFontSize.ts        # localStorage (per device)
│   ├── useChordNotation.ts   # localStorage (per device)
│   └── useAutoScroll.ts      # localStorage (per device)
├── types.ts                  # Song + Playlist interfaces
├── App.tsx
├── main.tsx
└── index.css
```

## Adding a song

Songs are stored in Supabase — they are not bundled with the frontend. Add songs via the app UI or directly in Supabase dashboard.

### Via Supabase Dashboard

1. Go to your Supabase project → Table Editor → `songs` table
2. Click "Insert" → "New row"
3. Fill in the fields:
   - `id`: unique slug (e.g., `song-title`)
   - `title`: song title
   - `artist`: artist name
   - `song_key`: musical key (e.g., `Am`, `C`, `G`)
   - `bpm`: optional tempo
   - `tags`: JSON array as string (e.g., `["italiana", "cristiana"]`)
   - `content`: ChordPro format with chords in `[ ]` before lyrics
   - `updated_at`: Unix timestamp (e.g., `Date.now()`)

The new song appears immediately on next refresh of the frontend.

The `tags` field is optional but recommended. A song can have multiple tags: `["italiana", "cristiana"]`. Tag labels are defined in `TAG_LABELS` inside `src/components/TagDrawer.tsx`.

The `content` field uses **ChordPro** format: chords in `[ ]` inline before the word.

## Playlists

- A special **Favorites** playlist (`__fav__`) is created lazily on first use.
- Custom playlists are created from the side drawer.
- Each playlist has its own page (`/playlist/:id`) with drag & drop reordering.
- All mutations go through `playlistsRepo`: cache is updated and synced to Supabase.

## Offline behaviour

- **Reads** always hit the cache first (`localStorage cache:*`) and return immediately. A background Supabase fetch then refreshes the cache; subscribers re-render via `useSyncExternalStore`.
- **Writes** update the cache and sync to Supabase. If the device is offline, changes are kept locally until the next reconnect.
- Theme / fontSize / notation / autoscroll are per-device, stored in plain `localStorage`.

## Theme

- Toggle (☀/☾) available in SongList, SongView, and Settings.
- `useTheme` reads from `localStorage` on mount and writes `data-theme` on `<html>`.
- CSS: `:root` = dark defaults, `[data-theme="light"]` overrides all vars.

| Variable        | Dark          | Light         |
|-----------------|---------------|---------------|
| `--bg`          | `#0f0f1a`     | `#f5f5fa`     |
| `--surface`     | `#1a1a2e`     | `#ffffff`     |
| `--surface-2`   | `#252540`     | `#e8e8f5`     |
| `--text`        | `#e8e8f0`     | `#1a1a2e`     |
| `--text-muted`  | `#8888aa`     | `#555577`     |
| `--chord`       | `#f4c55a`     | `#b8680a`     |

## Settings page

`/settings` centralises:
- **Theme** (dark/light)
- **Chord notation** (international `C D E…` ↔ italian `Do Re Mi…`)
- **Song font size** (12–26 px, live preview)

## Notes

- Songs are loaded from Supabase on first load and cached in `localStorage`.
- chordsheetjs includes jsPDF, so the bundle is ~2 MB. Acceptable for personal use.
- PNG icons in `public/icons/` are generated by `generate-icons.mjs` (pure Node.js, no external deps).
- Deploy to Vercel or any static hosting — set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables.
