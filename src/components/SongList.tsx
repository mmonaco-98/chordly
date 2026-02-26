import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Settings2, X } from "lucide-react";
import songs from "../songs";
import { SongCard } from "./SongCard";
import { TagDrawer, labelForTag } from "./TagDrawer";
import { usePlaylists } from "../hooks/usePlaylists";

interface LetterGroup {
  letter: string;
  items: typeof songs;
}

export function SongList() {
  const [query, setQuery] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const activeLetterRef = useRef<string | null>(null);
  const isDragging = useRef(false);
  const btnRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const tooltipRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();

  const { playlists, createPlaylist, deletePlaylist } = usePlaylists();

  const allTags = [...new Set(songs.flatMap((s) => s.tags ?? []))].sort();

  const filtered = songs
    .filter((s) => {
      if (activeTag && !s.tags?.includes(activeTag)) return false;
      const q = query.toLowerCase();
      return (
        s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => a.title.localeCompare(b.title, "it"));

  const groups: LetterGroup[] = [];
  for (const song of filtered) {
    const letter = song.title[0].toUpperCase();
    const last = groups[groups.length - 1];
    if (last && last.letter === letter) {
      last.items.push(song);
    } else {
      groups.push({ letter, items: [song] });
    }
  }

  const showSidebar = !query && groups.length > 1;

  const scrollToLetter = (letter: string, behavior: ScrollBehavior = "smooth") => {
    document
      .getElementById(`letter-${letter}`)
      ?.scrollIntoView({ behavior, block: "start" });
  };

  const startHideTimer = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setSidebarVisible(false), 3000);
  }, []);

  // Sidebar: ricompare allo scroll, si nasconde solo dopo una selezione
  useEffect(() => {
    if (!showSidebar) return;

    setSidebarVisible(true);

    const handleScroll = () => {
      setSidebarVisible(true);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [showSidebar]);

  const updateActiveLetter = useCallback((clientY: number) => {
    const entries = [...btnRefs.current.entries()];
    if (entries.length === 0) return;

    let found: string | null = null;
    for (const [letter, btn] of entries) {
      const rect = btn.getBoundingClientRect();
      if (clientY >= rect.top && clientY <= rect.bottom) {
        found = letter;
        break;
      }
    }
    if (!found) {
      const firstRect = entries[0][1].getBoundingClientRect();
      const lastRect = entries[entries.length - 1][1].getBoundingClientRect();
      if (clientY < firstRect.top) found = entries[0][0];
      else if (clientY > lastRect.bottom) found = entries[entries.length - 1][0];
    }
    if (found !== activeLetterRef.current) {
      activeLetterRef.current = found;
      setActiveLetter(found);
      if (found) scrollToLetter(found, "smooth");
    }
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    isDragging.current = true;
    setSidebarVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    e.currentTarget.setPointerCapture(e.pointerId);
    if (tooltipRef.current) tooltipRef.current.style.top = `${e.clientY}px`;
    updateActiveLetter(e.clientY);
  }, [updateActiveLetter]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (!isDragging.current) return;
    if (tooltipRef.current) tooltipRef.current.style.top = `${e.clientY}px`;
    updateActiveLetter(e.clientY);
  }, [updateActiveLetter]);

  const handlePointerUp = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (activeLetterRef.current) {
      scrollToLetter(activeLetterRef.current);
      activeLetterRef.current = null;
      setActiveLetter(null);
    }
    startHideTimer();
  }, [startHideTimer]);

  const handlePointerCancel = useCallback(() => {
    isDragging.current = false;
    activeLetterRef.current = null;
    setActiveLetter(null);
    startHideTimer();
  }, [startHideTimer]);

  return (
    <div className="song-list">
      <TagDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        tags={allTags}
        activeTag={activeTag}
        onSelectTag={setActiveTag}
        playlists={playlists}
        onCreatePlaylist={createPlaylist}
        onDeletePlaylist={deletePlaylist}
      />

      <header className="song-list__header">
        <div className="song-list__header-row">
          <button
            className="icon-btn"
            onClick={() => setDrawerOpen(true)}
            aria-label="Apri canzonieri"
          >
            <Menu size={20} />
          </button>
          <h1 className="song-list__title">Chordly</h1>
          <div style={{ display: "flex", gap: "0.25rem" }}>
            <button
              className="icon-btn"
              onClick={() => navigate("/settings")}
              aria-label="Impostazioni"
            >
              <Settings2 size={20} />
            </button>
          </div>
        </div>
        <input
          className="song-list__search"
          type="search"
          placeholder="Cerca canzone o artista..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Cerca canzone"
        />
        <div className="song-list__pills">
          {activeTag && (
            <div className="active-tag-pill">
              <span>{labelForTag(activeTag)}</span>
              <button
                onClick={() => setActiveTag(null)}
                aria-label="Rimuovi filtro canzoniere"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      </header>

      <ul
        className="song-list__list"
        role="list"
      >
        {filtered.length === 0 ? (
          <li className="song-list__empty">Nessuna canzone trovata</li>
        ) : (
          groups.map(({ letter, items }) => (
            <li key={letter}>
              <div
                id={`letter-${letter}`}
                className="song-list__letter-heading"
              >
                {letter}
              </div>
              <ul role="list" className="song-list__letter-group">
                {items.map((song) => (
                  <li key={song.id}>
                    <SongCard song={song} navState={{ source: 'list', tag: activeTag }} />
                  </li>
                ))}
              </ul>
            </li>
          ))
        )}
      </ul>

      {showSidebar && (
        <>
        <div
          ref={tooltipRef}
          className={`alpha-sidebar__tooltip${activeLetter ? " alpha-sidebar__tooltip--visible" : ""}`}
          aria-hidden="true"
        >
          {activeLetter ?? ""}
        </div>
        <nav
          className={`alpha-sidebar${sidebarVisible ? "" : " alpha-sidebar--hidden"}`}
          aria-label="Indice alfabetico"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          style={{ touchAction: "none" }}
        >
          {groups.map(({ letter }) => (
            <button
              key={letter}
              ref={(el) => {
                if (el) btnRefs.current.set(letter, el);
                else btnRefs.current.delete(letter);
              }}
              className={`alpha-sidebar__btn${activeLetter === letter ? " alpha-sidebar__btn--active" : ""}`}
              aria-label={`Vai alla lettera ${letter}`}
            >
              {letter}
            </button>
          ))}
        </nav>
        </>
      )}
    </div>
  );
}
