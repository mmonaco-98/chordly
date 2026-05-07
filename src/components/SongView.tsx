import {
  useState,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  SlidersHorizontal,
  X,
  Minus,
  Plus,
  RotateCcw,
  ZoomOut,
  ZoomIn,
  Play,
  Pause,
  Heart,
  ListPlus,
  Printer,
  Eye,
  EyeOff,
  Trash2,
  Pencil,
} from "lucide-react";
import { jsPDF } from "jspdf";
import ChordSheetJS, { ChordLyricsPair } from "chordsheetjs";
import { useSongs } from "../hooks/useSongs";
import { useDeleteSong } from "../hooks/useSongs";
import { useTranspose } from "../hooks/useTranspose";
import { useTheme } from "../hooks/useTheme";
import { useFontSize } from "../hooks/useFontSize";
import { useChordNotation } from "../hooks/useChordNotation";
import { useAutoScroll, SCROLL_MIN, SCROLL_MAX } from "../hooks/useAutoScroll";
import { usePlaylists } from "../hooks/usePlaylists";
import { convertChord } from "../utils/convertChord";
import { ChordSheet } from "./ChordSheet";
import { PlaylistModal } from "./PlaylistModal";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import type { Song } from "../types";
import { useCapo, toRoman } from "../hooks/useCapo";

type NavState =
  | { source: "list"; tag: string | null }
  | { source: "playlist"; playlistId: string };

export function SongView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { playlists } = usePlaylists();
  const songs = useSongs();
  const song = songs.find((s) => s.id === id);

  const navState = (location.state as NavState | null) ?? null;

  const navList = useMemo<Song[]>(() => {
    if (!navState) return [];
    if (navState.source === "list") {
      const tag = navState.tag;
      return songs
        .filter((s) => !tag || s.tags?.includes(tag))
        .sort((a, b) => a.title.localeCompare(b.title, "it"));
    }
    if (navState.source === "playlist") {
      const playlist = playlists.find((p) => p.id === navState.playlistId);
      if (!playlist) return [];
      return playlist.songIds
        .map((sid) => songs.find((s) => s.id === sid))
        .filter((s): s is Song => s !== undefined);
    }
    return [];
  }, [navState, playlists]);

  const currentIndex = navList.findIndex((s) => s.id === id);
  const prevSong = currentIndex > 0 ? navList[currentIndex - 1] : null;
  const nextSong =
    currentIndex < navList.length - 1 ? navList[currentIndex + 1] : null;

  if (!song) {
    return (
      <div className="song-view song-view--not-found">
        <button
          className="icon-btn icon-btn--accent"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft size={22} />
        </button>
        <p>Canzone non trovata.</p>
      </div>
    );
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
  );
}

function SongViewContent({
  song,
  onBack,
  prevSong,
  nextSong,
  navState,
}: {
  song: Song;
  onBack: () => void;
  prevSong: Song | null;
  nextSong: Song | null;
  navState: NavState | null;
}) {
  const navigate = useNavigate();
  const { transposed, semitones, up, down, reset } = useTranspose(song);
  const { capo, capoUp, capoDown, resetCapo } = useCapo(song);
  const { theme, toggleTheme } = useTheme();
  const { fontSize, increase, decrease } = useFontSize();
  const { notation } = useChordNotation();
  const {
    isScrolling,
    speed,
    toggle: toggleScroll,
    increaseSpeed,
    decreaseSpeed,
  } = useAutoScroll();
  const {
    customPlaylists,
    toggleFavorite,
    isFavorite,
    toggleSong,
    isSongInPlaylist,
    createPlaylist,
  } = usePlaylists();
  const { remove: deleteSong, isPending: isDeleting } = useDeleteSong();
  const [controlsOpen, setControlsOpen] = useState(false);
  const [hideBass, setHideBass] = useState(true);
  const [playlistModalOpen, setPlaylistModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsOpenRef = useRef(controlsOpen);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    controlsOpenRef.current = controlsOpen;
  }, [controlsOpen]);

  const scheduleHide = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (controlsOpenRef.current) return;
    hideTimerRef.current = setTimeout(() => setControlsVisible(false), 3000);
  }, []);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    scheduleHide();
  }, [scheduleHide]);

  useEffect(() => {
    scheduleHide();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [song.id, scheduleHide]);

  useEffect(() => {
    if (controlsOpen) {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    } else {
      scheduleHide();
    }
  }, [controlsOpen, scheduleHide]);

  useEffect(() => {
    if (isScrolling) {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      setControlsOpen(false);
      setControlsVisible(false);
    }
  }, [isScrolling]);

  useEffect(() => {
    window.addEventListener("pointerdown", showControls);
    return () => window.removeEventListener("pointerdown", showControls);
  }, [showControls]);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const displayKey =
    notation === "italian" ? convertChord(song.key, "italian") : song.key;
  const keyLabel =
    semitones === 0
      ? displayKey
      : `${displayKey} ${semitones > 0 ? "+" : ""}${semitones}`;

  const songIsFavorite = isFavorite(song.id);
  const hasBadge =
    semitones !== 0 || capo !== 0 || isScrolling || songIsFavorite;

  const goToPrev = () =>
    prevSong &&
    navigate(`/song/${prevSong.id}`, { state: navState, replace: true });
  const goToNext = () =>
    nextSong &&
    navigate(`/song/${nextSong.id}`, { state: navState, replace: true });

  const showNav = prevSong !== null || nextSong !== null;

  async function handleDelete() {
    try {
      await deleteSong(song.id)
      navigate('/')
    } catch {
      // error già gestito dall'hook
    }
  }

  function handleExportPdf() {
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    const ML = 15; // margin left
    const MR = 15; // margin right
    const PW = 210; // page width (A4)
    const PH = 297; // page height (A4)
    const MB = 20; // margin bottom
    const MT = 20; // margin top
    const COL_GAP = 8; // gap between columns in two-column mode

    const LABEL_RE = /^[A-Z]{2,6}\.?$/;
    const LABEL_OFFSET = 4;

    // --- Header ---
    let y = MT;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.setTextColor(30, 30, 30);
    pdf.text(song.title, ML, y);
    y += 8;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.setTextColor(80, 80, 80);
    const keyDisplay = convertChord(song.key, notation);
    const keyStr =
      semitones === 0
        ? keyDisplay
        : `${keyDisplay} ${semitones > 0 ? "+" : ""}${semitones}`;
    const parts = [song.artist, keyStr ? `Tonalità: ${keyStr}` : ""].filter(
      Boolean,
    );
    if (capo > 0) parts.push(`Capo ${toRoman(capo)}`);
    if (song.bpm) parts.push(`${song.bpm} BPM`);
    pdf.text(parts.join("  ·  "), ML, y);
    y += 8;

    pdf.setDrawColor(180, 180, 180);
    pdf.line(ML, y, PW - MR, y);
    y += 7;

    const headerEndY = y;
    const sheet = new ChordSheetJS.ChordProParser().parse(transposed);

    // --- Flatten all renderable lines with metadata ---
    type LineInfo = {
      line: (typeof sheet.paragraphs)[number]["lines"][number];
      paragraphIndex: number;
      isChorus: boolean;
      isLastInParagraph: boolean;
      height: number; // vertical space this line needs
      isLabel: boolean; // label like RIT — placed on previous line, no height
      labelText: string; // the label text if isLabel
      isComment: boolean; // non-label comment — takes height
      commentText: string;
    };
    const allLines: LineInfo[] = [];

    for (let pi = 0; pi < sheet.paragraphs.length; pi++) {
      const paragraph = sheet.paragraphs[pi];
      if (!paragraph.hasRenderableItems()) continue;
      const isChorus = paragraph.type === "chorus";
      const renderableLines: LineInfo[] = [];

      for (const line of paragraph.lines) {
        if (!line.hasRenderableItems()) continue;
        const pairs = line.items.filter(
          (item): item is ChordLyricsPair => item instanceof ChordLyricsPair,
        );

        if (pairs.length === 0) {
          const commentItem = line.items.find(
            (item: unknown) =>
              item !== null &&
              typeof item === 'object' &&
              'name' in item &&
              (item.name === 'comment' || item.name === 'c') &&
              'value' in item &&
              typeof item.value === 'string' &&
              item.value.trim(),
          );
          if (commentItem) {
            const commentText = (commentItem as { value: string }).value;
            if (LABEL_RE.test(commentText.trim())) {
              renderableLines.push({
                line,
                paragraphIndex: pi,
                isChorus,
                isLastInParagraph: false,
                height: 0,
                isLabel: true,
                labelText: commentText.trim(),
                isComment: false,
                commentText: "",
              });
            } else {
              renderableLines.push({
                line,
                paragraphIndex: pi,
                isChorus,
                isLastInParagraph: false,
                height: 5,
                isLabel: false,
                labelText: "",
                isComment: true,
                commentText,
              });
            }
          }
          continue;
        }

        const hasChords = pairs.some((p) => p.chords.trim() !== "");
        const hasLyrics = pairs.some((p) => (p.lyrics ?? "").trim() !== "");
        if (!hasChords && !hasLyrics) continue;
        const h = (hasChords ? 5 : 0) + (hasLyrics ? 5 : 0);
        renderableLines.push({
          line,
          paragraphIndex: pi,
          isChorus,
          isLastInParagraph: false,
          height: h,
          isLabel: false,
          labelText: "",
          isComment: false,
          commentText: "",
        });
      }

      // Mark last non-label line and add paragraph gap (4mm) to its height
      for (let i = renderableLines.length - 1; i >= 0; i--) {
        if (!renderableLines[i].isLabel) {
          renderableLines[i].isLastInParagraph = true;
          renderableLines[i].height += 4;
          break;
        }
      }

      allLines.push(...renderableLines);
    }

    const totalContentHeight = allLines.reduce((s, l) => s + l.height, 0);
    const availableHeight = PH - MB - headerEndY;
    const needsTwoColumns = totalContentHeight > availableHeight;

    // --- Compute max line width relative to textLeftBase (for label positioning) ---
    // Returns the widest line's right edge measured from textLeftBase=0
    let maxRelativeRight = 0;
    for (const info of allLines) {
      if (info.isLabel || info.isComment) continue;
      const pairs = info.line.items.filter(
        (item): item is ChordLyricsPair => item instanceof ChordLyricsPair,
      );
      if (pairs.length === 0) continue;
      const chorusIndent = info.isChorus ? 4 : 0;
      let cx = chorusIndent;
      for (const p of pairs) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        const lyricW = pdf.getTextWidth(p.lyrics ?? "");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8);
        const chordStr = convertChord(p.chords, notation).trim();
        const chordW = chordStr ? pdf.getTextWidth(chordStr) + 1 : 0;
        cx += Math.max(lyricW, chordW);
      }
      maxRelativeRight = Math.max(maxRelativeRight, cx);
    }

    // --- Render a single line at given position ---
    function renderLine(
      info: LineInfo,
      textLeftBase: number,
      curLabelX: number,
      ly: number,
      lastLineY: number,
    ): { newY: number; newLastLineY: number } {
      const textLeft = textLeftBase + (info.isChorus ? 4 : 0);

      if (info.isLabel) {
        if (lastLineY >= 0 && curLabelX > 0) {
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(8);
          pdf.setTextColor(100, 100, 100);
          pdf.text(info.labelText, curLabelX, lastLineY);
        }
        return { newY: ly, newLastLineY: lastLineY };
      }

      if (info.isComment) {
        pdf.setFont("helvetica", "italic");
        pdf.setFontSize(10);
        pdf.setTextColor(85, 85, 85);
        pdf.text(info.commentText, textLeft, ly);
        ly += 5;
        if (info.isLastInParagraph) ly += 4;
        return { newY: ly, newLastLineY: ly - 5 };
      }

      const pairs = info.line.items.filter(
        (item): item is ChordLyricsPair => item instanceof ChordLyricsPair,
      );
      const hasChords = pairs.some((p) => p.chords.trim() !== "");
      const hasLyrics = pairs.some((p) => (p.lyrics ?? "").trim() !== "");

      const colWidths: number[] = pairs.map((p) => {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        const lyricW = pdf.getTextWidth(p.lyrics ?? "");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8);
        const chordStr = convertChord(p.chords, notation).trim();
        const chordW = chordStr ? pdf.getTextWidth(chordStr) + 1 : 0;
        return Math.max(lyricW, chordW);
      });
      const xPos: number[] = [];
      let cx = textLeft;
      for (const w of colWidths) {
        xPos.push(cx);
        cx += w;
      }

      if (hasChords) {
        for (let i = 0; i < pairs.length; i++) {
          const chord = convertChord(pairs[i].chords, notation).trim();
          if (chord) {
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(8);
            pdf.setTextColor(180, 100, 10);
            pdf.text(chord, xPos[i], ly);
          }
        }
        ly += 5;
      }

      if (hasLyrics) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.setTextColor(30, 30, 30);
        for (let i = 0; i < pairs.length; i++) {
          const lyric = pairs[i].lyrics ?? "";
          if (lyric) pdf.text(lyric, xPos[i], ly);
        }
        ly += 5;
      }

      const newLastLineY = ly - 5;
      if (info.isLastInParagraph) ly += 4;
      return { newY: ly, newLastLineY };
    }

    if (!needsTwoColumns) {
      // --- Single-column rendering ---
      const labelX = ML + maxRelativeRight + LABEL_OFFSET;
      let lastLineY = -1;
      for (const info of allLines) {
        // Page break: check if this line fits (skip labels — they have 0 height)
        if (info.height > 0 && y + info.height > PH - MB) {
          pdf.addPage();
          y = MT;
          lastLineY = -1;
        }
        const result = renderLine(info, ML, labelX, y, lastLineY);
        y = result.newY;
        lastLineY = result.newLastLineY;
      }
    } else {
      // --- Two-column rendering ---
      const colWidth = (PW - ML - MR - COL_GAP) / 2;
      const col1Left = ML;
      const col2Left = ML + colWidth + COL_GAP;

      // Compute labelX per column: same relative offset, capped to column boundary
      const col1Right = col1Left + colWidth;
      const col2Right = col2Left + colWidth;
      const col1LabelX = Math.min(
        col1Left + maxRelativeRight + LABEL_OFFSET,
        col1Right - 10,
      );
      const col2LabelX = Math.min(
        col2Left + maxRelativeRight + LABEL_OFFSET,
        col2Right - 10,
      );

      // Fill column 1 completely, then overflow to column 2
      const maxY = PH - MB;
      let curY = headerEndY;
      let lastLineY = -1;
      let colIdx = 0; // 0 = col1, 1 = col2
      let curLeft = col1Left;
      let curLabelX = col1LabelX;

      for (const info of allLines) {
        // Labels have 0 height, always render with current line
        if (info.isLabel) {
          const result = renderLine(info, curLeft, curLabelX, curY, lastLineY);
          curY = result.newY;
          lastLineY = result.newLastLineY;
          continue;
        }

        // Check if line fits in current column
        if (curY + info.height > maxY) {
          if (colIdx === 0) {
            // Switch to column 2
            colIdx = 1;
            curY = headerEndY;
            lastLineY = -1;
            curLeft = col2Left;
            curLabelX = col2LabelX;
          } else {
            // Both columns full — new page, reset to col 1
            pdf.addPage();
            colIdx = 0;
            curY = MT;
            lastLineY = -1;
            curLeft = col1Left;
            curLabelX = col1LabelX;
          }
        }

        const result = renderLine(info, curLeft, curLabelX, curY, lastLineY);
        curY = result.newY;
        lastLineY = result.newLastLineY;
      }
    }

    const filename =
      song.title.replace(/[^a-z0-9]/gi, "_").toLowerCase() + ".pdf";
    pdf.save(filename);
  }

  return (
    <div className="song-view">
      <header className="song-view__header">
        <button
          className="icon-btn icon-btn--accent"
          onClick={onBack}
          aria-label="Torna alla lista"
        >
          <ChevronLeft size={22} />
        </button>
        <div className="song-view__meta">
          <h1 className="song-view__title">{song.title}</h1>
          <p className="song-view__artist">
            {song.artist}
            <span className="song-view__key">{keyLabel}</span>
            {capo > 0 && (
              <span className="song-view__capo">Capo {toRoman(capo)}</span>
            )}
            {song.bpm && <span className="song-view__bpm">{song.bpm} BPM</span>}
          </p>
        </div>
        <button
          className="icon-btn"
          onClick={handleExportPdf}
          aria-label="Esporta PDF"
        >
          <Printer size={20} />
        </button>
        <button
          className="icon-btn"
          onClick={toggleTheme}
          aria-label="Cambia tema"
        >
          {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </header>

      <main
        className="song-view__content"
        style={{ fontSize: `${fontSize}px` }}
      >
        <ChordSheet
          content={transposed}
          notation={notation}
          hideBass={hideBass}
        />
      </main>

      {playlistModalOpen && (
        <PlaylistModal
          songId={song.id}
          customPlaylists={customPlaylists}
          onToggle={(playlistId) => toggleSong(playlistId, song.id)}
          onCreate={(name) => {
            const p = createPlaylist(name);
            toggleSong(p.id, song.id);
          }}
          onClose={() => setPlaylistModalOpen(false)}
          isSongInPlaylist={isSongInPlaylist}
        />
      )}

      <DeleteConfirmModal
        songTitle={song.title}
        isOpen={deleteModalOpen}
        onConfirm={handleDelete}
        onCancel={() => setDeleteModalOpen(false)}
        isPending={isDeleting}
      />

      {/* Navigazione prev/next */}
      {showNav && controlsVisible && (
        <div className="song-nav">
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
      <div className="fab-container">
        {controlsOpen && (
          <div className="fab__panel fab__panel--open">
            {/* Sezione tonalità */}
            <div className="fab__section">
              <span className="fab__label">Tonalità</span>
              <div className="fab__row">
                <button
                  className="fab__control-btn"
                  onClick={down}
                  aria-label="Semitono giù"
                >
                  <Minus size={16} />
                </button>
                <span className="fab__value">{keyLabel}</span>
                <button
                  className="fab__control-btn"
                  onClick={up}
                  aria-label="Semitono su"
                >
                  <Plus size={16} />
                </button>
                <button
                  className="fab__reset-btn"
                  onClick={reset}
                  aria-label="Ripristina tonalità"
                  style={{
                    opacity: semitones !== 0 ? 1 : 0.2,
                    pointerEvents: semitones !== 0 ? "auto" : "none",
                  }}
                >
                  <RotateCcw size={15} />
                </button>
              </div>
            </div>

            <div className="fab__divider" />

            {/* Sezione capotasto */}
            <div className="fab__section">
              <span className="fab__label">Capotasto</span>
              <div className="fab__row">
                <button
                  className="fab__control-btn"
                  onClick={capoDown}
                  disabled={capo <= 0}
                  aria-label="Capotasto giù"
                >
                  <Minus size={16} />
                </button>
                <span className="fab__value">
                  {capo === 0 ? "—" : toRoman(capo)}
                </span>
                <button
                  className="fab__control-btn"
                  onClick={capoUp}
                  disabled={capo >= 12}
                  aria-label="Capotasto su"
                >
                  <Plus size={16} />
                </button>
                <button
                  className="fab__reset-btn"
                  onClick={resetCapo}
                  aria-label="Ripristina capotasto"
                  style={{
                    opacity: capo !== 0 ? 1 : 0.2,
                    pointerEvents: capo !== 0 ? "auto" : "none",
                  }}
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
                <button
                  className="fab__control-btn"
                  onClick={decrease}
                  disabled={fontSize <= 12}
                  aria-label="Riduci testo"
                >
                  <ZoomOut size={16} />
                </button>
                <span className="fab__value">{fontSize}px</span>
                <button
                  className="fab__control-btn"
                  onClick={increase}
                  disabled={fontSize >= 26}
                  aria-label="Ingrandisci testo"
                >
                  <ZoomIn size={16} />
                </button>
              </div>
            </div>

            <div className="fab__divider" />

            {/* Sezione nota basso */}
            <div className="fab__section">
              <span className="fab__label">Nota basso</span>
              <div className="fab__row">
                <button
                  className={`fab__control-btn${hideBass ? " fab__control-btn--active" : ""}`}
                  onClick={() => setHideBass((h) => !h)}
                  aria-label={
                    hideBass ? "Mostra nota basso" : "Nascondi nota basso"
                  }
                >
                  {hideBass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <span className="fab__value">
                  {hideBass ? "Nascosta" : "Visibile"}
                </span>
              </div>
            </div>

            <div className="fab__divider" />

            {/* Sezione autoscroll */}
            <div className="fab__section">
              <span className="fab__label">Autoscroll</span>
              <div className="fab__row">
                <button
                  className="fab__control-btn"
                  onClick={decreaseSpeed}
                  disabled={speed <= SCROLL_MIN}
                  aria-label="Rallenta"
                >
                  <Minus size={16} />
                </button>
                <span className="fab__value">{speed}</span>
                <button
                  className="fab__control-btn"
                  onClick={increaseSpeed}
                  disabled={speed >= SCROLL_MAX}
                  aria-label="Accelera"
                >
                  <Plus size={16} />
                </button>
                <button
                  className={`fab__control-btn${isScrolling ? " fab__control-btn--active" : ""}`}
                  onClick={toggleScroll}
                  aria-label={
                    isScrolling ? "Pausa autoscroll" : "Avvia autoscroll"
                  }
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
                  className={`fab__control-btn${songIsFavorite ? " fab__control-btn--active" : ""}`}
                  onClick={() => toggleFavorite(song.id)}
                  aria-label={
                    songIsFavorite
                      ? "Rimuovi dai preferiti"
                      : "Aggiungi ai preferiti"
                  }
                >
                  <Heart
                    size={16}
                    fill={songIsFavorite ? "currentColor" : "none"}
                  />
                </button>
                <span
                  className="fab__value"
                  style={{ flex: 1, textAlign: "left" }}
                >
                  Preferiti
                </span>
                <button
                  className="fab__control-btn"
                  onClick={() => setPlaylistModalOpen(true)}
                  aria-label="Aggiungi a playlist"
                >
                  <ListPlus size={16} />
                </button>
              </div>
            </div>

            <div className="fab__divider" />

            {/* Sezione gestione */}
            <div className="fab__section">
              <span className="fab__label">Gestione</span>
              <div className="fab__row">
                <button
                  className="fab__control-btn"
                  onClick={() => navigate(`/song/${song.id}/edit`)}
                  aria-label="Modifica canzone"
                >
                  <Pencil size={16} />
                </button>
                <span className="fab__value" style={{ flex: 1, textAlign: "left" }}>
                  Modifica
                </span>
                <button
                  className="fab__control-btn fab__control-btn--danger"
                  onClick={() => setDeleteModalOpen(true)}
                  disabled={isDeleting}
                  aria-label="Elimina canzone"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        <button
          className={`fab${controlsOpen ? " fab--open" : ""}`}
          onClick={() => setControlsOpen((o) => !o)}
          aria-label={controlsOpen ? "Chiudi controlli" : "Apri controlli"}
          aria-expanded={controlsOpen}
        >
          {controlsOpen ? <X size={22} /> : <SlidersHorizontal size={22} />}
          {hasBadge && !controlsOpen && (
            <span className="fab__badge" aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}
