import { useState, useEffect, useRef, useCallback, useDeferredValue, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Menu, Settings, Settings2, Plus, RotateCcw } from "lucide-react";
import { SongCard } from "./SongCard";
import { FilterCombobox } from "./FilterCombobox";
import { TagDrawer, labelForTag } from "./TagDrawer";
import { usePlaylists } from "../hooks/usePlaylists";
import { useTapToBlur } from "../hooks/useTapToBlur";
import { useSongs } from "../hooks/useSongs";
import {
  filterAndGroup,
  filtersFromParams,
  filtersToParams,
  uniqueAuthors,
  type ListFilters,
} from "../utils/listGroups";

export function SongList() {
  const songs = useSongs();
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => filtersFromParams(params), [params]);
  const { query, author, tag: activeTag } = filters;
  const updateFilters = useCallback(
    (patch: Partial<ListFilters>) =>
      setParams(filtersToParams({ ...filters, ...patch }), { replace: true }),
    [filters, setParams],
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const activeLetterRef = useRef<string | null>(null);
  const isDragging = useRef(false);
  const btnRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const tooltipRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();
  const searchTapToBlur = useTapToBlur();

  const { playlists, createPlaylist, deletePlaylist, reorderPlaylists } = usePlaylists();

  const deferredQuery = useDeferredValue(query);
  const allTags = useMemo(
    () => [...new Set(songs.flatMap((s) => s.tags ?? []))].sort(),
    [songs],
  );
  const { filtered, groups } = useMemo(
    () => filterAndGroup(songs, { ...filters, query: deferredQuery }),
    [songs, filters, deferredQuery],
  );
  const hasFilters = !!(author || activeTag);
  const activeFilterCount = (author ? 1 : 0) + (activeTag ? 1 : 0);
  const [filtersOpen, setFiltersOpen] = useState(hasFilters);
  const authorOptions = useMemo(
    () => uniqueAuthors(songs).map((a) => ({ value: a, label: a })),
    [songs],
  );
  const tagOptions = useMemo(
    () => allTags.map((t) => ({ value: t, label: labelForTag(t) })),
    [allTags],
  );
  const navState = useMemo(
    () => ({ source: "list" as const, ...filters }),
    [filters],
  );

  const showSidebar = !query && groups.length > 1;

  const scrollToLetter = (
    letter: string,
    behavior: ScrollBehavior = "smooth",
  ) => {
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
      else if (clientY > lastRect.bottom)
        found = entries[entries.length - 1][0];
    }
    if (found !== activeLetterRef.current) {
      activeLetterRef.current = found;
      setActiveLetter(found);
      if (found) scrollToLetter(found, "smooth");
    }
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      isDragging.current = true;
      setSidebarVisible(true);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      e.currentTarget.setPointerCapture(e.pointerId);
      if (tooltipRef.current) tooltipRef.current.style.top = `${e.clientY}px`;
      updateActiveLetter(e.clientY);
    },
    [updateActiveLetter],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!isDragging.current) return;
      if (tooltipRef.current) tooltipRef.current.style.top = `${e.clientY}px`;
      updateActiveLetter(e.clientY);
    },
    [updateActiveLetter],
  );

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
        playlists={playlists}
        onCreatePlaylist={createPlaylist}
        onDeletePlaylist={deletePlaylist}
        onReorderPlaylists={reorderPlaylists}
      />

      <header className="song-list__header">
        <div className="song-list__header-row">
          <button
            className="icon-btn"
            onClick={() => setDrawerOpen(true)}
            aria-label="Apri menu"
          >
            <Menu size={20} />
          </button>
          <h1 className="song-list__title">Chordly</h1>
          <div style={{ display: "flex", gap: "0.25rem" }}>
            <button
              className="icon-btn"
              onClick={() => navigate("/song/new")}
              aria-label="Aggiungi canzone"
            >
              <Plus size={20} />
            </button>
            <button
              className="icon-btn"
              onClick={() => navigate("/settings")}
              aria-label="Impostazioni"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
        <div className="song-list__search-row">
          <input
            className="song-list__search"
            type="search"
            placeholder="Cerca canzone o artista..."
            value={query}
            onChange={(e) => updateFilters({ query: e.target.value })}
            aria-label="Cerca canzone"
            {...searchTapToBlur}
          />
          <button
            className={`icon-btn song-list__filters-toggle${filtersOpen ? " song-list__filters-toggle--open" : ""}`}
            onClick={() => setFiltersOpen((o) => !o)}
            aria-expanded={filtersOpen}
            aria-controls="song-list-filters"
            aria-label="Filtri"
          >
            <Settings2 size={18} />
            {activeFilterCount > 0 && (
              <span className="song-list__filters-badge">{activeFilterCount}</span>
            )}
          </button>
        </div>
        <div
          id="song-list-filters"
          className={`song-list__filters-collapse${filtersOpen ? " song-list__filters-collapse--open" : ""}`}
        >
          <div className="song-list__filters-clip">
        <div className="song-list__filters">
          <FilterCombobox
            label="Autore"
            allLabel="Tutti gli autori"
            options={authorOptions}
            value={author}
            onChange={(v) => updateFilters({ author: v })}
          />
          <FilterCombobox
            label="Raccolta"
            allLabel="Tutte le raccolte"
            options={tagOptions}
            value={activeTag}
            onChange={(v) => updateFilters({ tag: v })}
          />
          <button
            className="icon-btn song-list__reset"
            onClick={() => updateFilters({ author: null, tag: null })}
            disabled={!hasFilters}
            aria-label="Azzera filtri autore e raccolta"
          >
            <RotateCcw size={18} />
          </button>
        </div>
          </div>
        </div>
      </header>

      <ul className="song-list__list" role="list">
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
                    <SongCard song={song} navState={navState} />
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
