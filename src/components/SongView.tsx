import { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, Sun, Moon,
  SlidersHorizontal, X,
  Minus, Plus, RotateCcw,
  ZoomOut, ZoomIn,
  Play, Pause,
  Heart, ListPlus,
} from 'lucide-react'
import songs from '../songs'
import { useTranspose } from '../hooks/useTranspose'
import { useTheme } from '../hooks/useTheme'
import { useFontSize } from '../hooks/useFontSize'
import { useChordNotation } from '../hooks/useChordNotation'
import { useAutoScroll, SCROLL_MIN, SCROLL_MAX } from '../hooks/useAutoScroll'
import { usePlaylists } from '../hooks/usePlaylists'
import { convertChord } from '../utils/convertChord'
import { ChordSheet } from './ChordSheet'
import { PlaylistModal } from './PlaylistModal'
import type { Song } from '../types'

type NavState =
  | { source: 'list'; tag: string | null }
  | { source: 'playlist'; playlistId: string }

export function SongView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { playlists } = usePlaylists()
  const song = songs.find((s) => s.id === id)

  const navState = (location.state as NavState | null) ?? null

  const navList = useMemo<Song[]>(() => {
    if (!navState) return []
    if (navState.source === 'list') {
      const tag = navState.tag
      return songs
        .filter((s) => !tag || s.tags?.includes(tag))
        .sort((a, b) => a.title.localeCompare(b.title, 'it'))
    }
    if (navState.source === 'playlist') {
      const playlist = playlists.find((p) => p.id === navState.playlistId)
      if (!playlist) return []
      return playlist.songIds
        .map((sid) => songs.find((s) => s.id === sid))
        .filter((s): s is Song => s !== undefined)
    }
    return []
  }, [navState, playlists])

  const currentIndex = navList.findIndex((s) => s.id === id)
  const prevSong = currentIndex > 0 ? navList[currentIndex - 1] : null
  const nextSong = currentIndex < navList.length - 1 ? navList[currentIndex + 1] : null

  if (!song) {
    return (
      <div className="song-view song-view--not-found">
        <button className="icon-btn icon-btn--accent" onClick={() => navigate(-1)}>
          <ChevronLeft size={22} />
        </button>
        <p>Canzone non trovata.</p>
      </div>
    )
  }

  return (
    <SongViewContent
      key={song.id}
      song={song}
      onBack={() => navigate(-1)}
      prevSong={prevSong}
      nextSong={nextSong}
      navState={navState}
    />
  )
}

function SongViewContent({
  song,
  onBack,
  prevSong,
  nextSong,
  navState,
}: {
  song: Song
  onBack: () => void
  prevSong: Song | null
  nextSong: Song | null
  navState: NavState | null
}) {
  const navigate = useNavigate()
  const { transposed, semitones, up, down, reset } = useTranspose(song)
  const { theme, toggleTheme } = useTheme()
  const { fontSize, increase, decrease } = useFontSize()
  const { notation } = useChordNotation()
  const { isScrolling, speed, toggle: toggleScroll, increaseSpeed, decreaseSpeed } = useAutoScroll()
  const { customPlaylists, toggleFavorite, isFavorite, toggleSong, isSongInPlaylist, createPlaylist } = usePlaylists()
  const [controlsOpen, setControlsOpen] = useState(false)
  const [playlistModalOpen, setPlaylistModalOpen] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(true)
  const controlsOpenRef = useRef(controlsOpen)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { controlsOpenRef.current = controlsOpen }, [controlsOpen])

  const scheduleHide = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    if (controlsOpenRef.current) return
    hideTimerRef.current = setTimeout(() => setControlsVisible(false), 3000)
  }, [])

  const showControls = useCallback(() => {
    setControlsVisible(true)
    scheduleHide()
  }, [scheduleHide])

  useEffect(() => {
    scheduleHide()
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current) }
  }, [song.id, scheduleHide])

  useEffect(() => {
    if (controlsOpen) {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    } else {
      scheduleHide()
    }
  }, [controlsOpen, scheduleHide])

  useEffect(() => {
    if (isScrolling) {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
      setControlsOpen(false)
      setControlsVisible(false)
    }
  }, [isScrolling])

  useEffect(() => {
    window.addEventListener('pointerdown', showControls)
    return () => window.removeEventListener('pointerdown', showControls)
  }, [showControls])

  useLayoutEffect(() => { window.scrollTo(0, 0) }, [])

  const displayKey = notation === 'italian' ? convertChord(song.key, 'italian') : song.key
  const keyLabel = semitones === 0
    ? displayKey
    : `${displayKey} ${semitones > 0 ? '+' : ''}${semitones}`

  const songIsFavorite = isFavorite(song.id)
  const hasBadge = semitones !== 0 || isScrolling || songIsFavorite

  const goToPrev = () => prevSong && navigate(`/song/${prevSong.id}`, { state: navState, replace: true })
  const goToNext = () => nextSong && navigate(`/song/${nextSong.id}`, { state: navState, replace: true })

  const showNav = prevSong !== null || nextSong !== null

  return (
    <div className="song-view">
      <header className="song-view__header">
        <button className="icon-btn icon-btn--accent" onClick={onBack} aria-label="Torna alla lista">
          <ChevronLeft size={22} />
        </button>
        <div className="song-view__meta">
          <h1 className="song-view__title">{song.title}</h1>
          <p className="song-view__artist">
            {song.artist}
            <span className="song-view__key">{keyLabel}</span>
            {song.bpm && <span className="song-view__bpm">{song.bpm} BPM</span>}
          </p>
        </div>
        <button
          className="icon-btn"
          onClick={toggleTheme}
          aria-label="Cambia tema"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </header>

      <main className="song-view__content" style={{ fontSize: `${fontSize}px` }}>
        <ChordSheet content={transposed} notation={notation} />
      </main>

      {playlistModalOpen && (
        <PlaylistModal
          songId={song.id}
          customPlaylists={customPlaylists}
          onToggle={(playlistId) => toggleSong(playlistId, song.id)}
          onCreate={(name) => {
            const p = createPlaylist(name)
            toggleSong(p.id, song.id)
          }}
          onClose={() => setPlaylistModalOpen(false)}
          isSongInPlaylist={isSongInPlaylist}
        />
      )}

      {/* Navigazione prev/next */}
      {showNav && (
        <div className={`song-nav${!controlsVisible ? ' controls--hidden' : ''}`}>
          <button
            className="song-nav__btn"
            onClick={goToPrev}
            disabled={!prevSong}
            aria-label="Canzone precedente"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            className="song-nav__btn"
            onClick={goToNext}
            disabled={!nextSong}
            aria-label="Canzone successiva"
          >
            <ChevronRight size={22} />
          </button>
        </div>
      )}

      {/* FAB espandibile */}
      <div className={`fab-container${!controlsVisible ? ' controls--hidden' : ''}`}>
        <div className={`fab__panel${controlsOpen ? ' fab__panel--open' : ''}`} aria-hidden={!controlsOpen}>
          {/* Sezione tonalità */}
          <div className="fab__section">
            <span className="fab__label">Tonalità</span>
            <div className="fab__row">
              <button className="fab__control-btn" onClick={down} aria-label="Semitono giù">
                <Minus size={16} />
              </button>
              <span className="fab__value">{keyLabel}</span>
              <button className="fab__control-btn" onClick={up} aria-label="Semitono su">
                <Plus size={16} />
              </button>
              <button
                className="fab__reset-btn"
                onClick={reset}
                aria-label="Ripristina tonalità"
                style={{ opacity: semitones !== 0 ? 1 : 0.2, pointerEvents: semitones !== 0 ? 'auto' : 'none' }}
              >
                <RotateCcw size={15} />
              </button>
            </div>
          </div>

          <div className="fab__divider" />

          {/* Sezione fontSize */}
          <div className="fab__section">
            <span className="fab__label">Testo</span>
            <div className="fab__row">
              <button className="fab__control-btn" onClick={decrease} disabled={fontSize <= 12} aria-label="Riduci testo">
                <ZoomOut size={16} />
              </button>
              <span className="fab__value">{fontSize}px</span>
              <button className="fab__control-btn" onClick={increase} disabled={fontSize >= 26} aria-label="Ingrandisci testo">
                <ZoomIn size={16} />
              </button>
            </div>
          </div>

          <div className="fab__divider" />

          {/* Sezione autoscroll */}
          <div className="fab__section">
            <span className="fab__label">Autoscroll</span>
            <div className="fab__row">
              <button className="fab__control-btn" onClick={decreaseSpeed} disabled={speed <= SCROLL_MIN} aria-label="Rallenta">
                <Minus size={16} />
              </button>
              <span className="fab__value">{speed}</span>
              <button className="fab__control-btn" onClick={increaseSpeed} disabled={speed >= SCROLL_MAX} aria-label="Accelera">
                <Plus size={16} />
              </button>
              <button
                className={`fab__control-btn${isScrolling ? ' fab__control-btn--active' : ''}`}
                onClick={toggleScroll}
                aria-label={isScrolling ? 'Pausa autoscroll' : 'Avvia autoscroll'}
              >
                {isScrolling ? <Pause size={16} /> : <Play size={16} />}
              </button>
            </div>
          </div>

          <div className="fab__divider" />

          {/* Sezione playlist */}
          <div className="fab__section">
            <span className="fab__label">Playlist</span>
            <div className="fab__row">
              <button
                className={`fab__control-btn${songIsFavorite ? ' fab__control-btn--active' : ''}`}
                onClick={() => toggleFavorite(song.id)}
                aria-label={songIsFavorite ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
              >
                <Heart size={16} fill={songIsFavorite ? 'currentColor' : 'none'} />
              </button>
              <span className="fab__value" style={{ flex: 1, textAlign: 'left' }}>Preferiti</span>
              <button
                className="fab__control-btn"
                onClick={() => setPlaylistModalOpen(true)}
                aria-label="Aggiungi a playlist"
              >
                <ListPlus size={16} />
              </button>
            </div>
          </div>
        </div>

        <button
          className={`fab${controlsOpen ? ' fab--open' : ''}`}
          onClick={() => setControlsOpen((o) => !o)}
          aria-label={controlsOpen ? 'Chiudi controlli' : 'Apri controlli'}
          aria-expanded={controlsOpen}
        >
          {controlsOpen ? <X size={22} /> : <SlidersHorizontal size={22} />}
          {hasBadge && !controlsOpen && <span className="fab__badge" aria-hidden="true" />}
        </button>
      </div>
    </div>
  )
}
