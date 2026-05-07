import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  X,
  Music,
  Heart,
  Trash2,
  Plus,
  Check,
  GripVertical,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Playlist } from "../types";
import { FAVORITES_ID, FAVORITES_NAME } from "../hooks/usePlaylists";

interface SortablePlaylistItemProps {
  playlist: Playlist;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

function SortablePlaylistItem({
  playlist,
  onSelect,
  onDelete,
}: SortablePlaylistItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: playlist.id });

  const style = {
    transform: CSS.Transform.toString(
      transform ? { ...transform, x: 0, scaleX: 1 } : null,
    ),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <li ref={setNodeRef} style={style}>
      <div className="tag-drawer__item-row">
        <button
          className="tag-drawer__item-grip"
          {...attributes}
          {...listeners}
          aria-label="Trascina per riordinare"
          tabIndex={0}
        >
          <GripVertical size={16} />
        </button>
        <button
          className="tag-drawer__item tag-drawer__item--flex"
          onClick={() => onSelect(playlist.id)}
        >
          {playlist.name}
          {playlist.songIds.length > 0 && (
            <span className="tag-drawer__count">{playlist.songIds.length}</span>
          )}
        </button>
        <button
          className="tag-drawer__item-delete"
          onClick={() => onDelete(playlist.id)}
          aria-label={`Elimina playlist ${playlist.name}`}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </li>
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
  tags: string[];
  activeTag: string | null;
  onSelectTag: (tag: string | null) => void;
  playlists: Playlist[];
  onCreatePlaylist: (name: string) => void;
  onDeletePlaylist: (id: string) => void;
  onReorderPlaylists: (newIds: string[]) => void;
}

const TAG_LABELS: Record<string, string> = {
  italiana: "Musica italiana",
  straniera: "Musica straniera",
  cristiana: "Musica cristiana",
  pop: "Pop",
  rock: "Rock",
  folk: "Folk",
};

function labelForTag(tag: string): string {
  return TAG_LABELS[tag] ?? tag.charAt(0).toUpperCase() + tag.slice(1);
}

export function TagDrawer({
  open,
  onClose,
  tags,
  activeTag,
  onSelectTag,
  playlists,
  onCreatePlaylist,
  onDeletePlaylist,
  onReorderPlaylists,
}: Props) {
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const navigate = useNavigate();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = customPlaylists.map((p) => p.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    onReorderPlaylists(arrayMove(ids, oldIndex, newIndex));
  };

  const handleSelectTag = (tag: string | null) => {
    onSelectTag(tag);
    onClose();
  };

  const handleSelectPlaylist = (id: string) => {
    navigate(`/playlist/${id}`);
    onClose();
  };

  const handleCreatePlaylist = () => {
    const trimmed = newPlaylistName.trim();
    if (!trimmed) return;
    onCreatePlaylist(trimmed);
    setNewPlaylistName("");
    setCreatingPlaylist(false);
  };

  const favorites = playlists.find((p) => p.id === FAVORITES_ID);
  const customPlaylists = playlists.filter((p) => p.id !== FAVORITES_ID);

  return (
    <div
      className={`tag-drawer${open ? " tag-drawer--open" : ""}`}
      aria-hidden={!open}
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
    >
      <div className="tag-drawer__backdrop" onClick={onClose} />
      <aside className="tag-drawer__panel">
        <div className="tag-drawer__header">
          <span className="tag-drawer__title">Menu</span>
          <button
            className="icon-btn"
            onClick={onClose}
            aria-label="Chiudi menu"
          >
            <X size={20} />
          </button>
        </div>
        <div className="tag-drawer__content">
          {/* Canzonieri */}
          <div>
            <p className="tag-drawer__section-header">Raccolte</p>
            <ul className="tag-drawer__list" role="list">
              <li>
                <button
                  className={`tag-drawer__item${activeTag === null ? " tag-drawer__item--active" : ""}`}
                  onClick={() => handleSelectTag(null)}
                >
                  <Music size={18} strokeWidth={2} />
                  Tutti
                </button>
              </li>
              {tags.map((tag) => (
                <li key={tag}>
                  <button
                    className={`tag-drawer__item${activeTag === tag ? " tag-drawer__item--active" : ""}`}
                    onClick={() => handleSelectTag(tag)}
                  >
                    {labelForTag(tag)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          {/* Playlist personali */}
          <div>
            <p className="tag-drawer__section-header tag-drawer__section-header--spaced">
              Playlist personali
            </p>
            <ul className="tag-drawer__list" role="list">
              {/* Preferiti (sempre visibile) */}
              <li>
                <button
                  className="tag-drawer__item"
                  onClick={() => handleSelectPlaylist(FAVORITES_ID)}
                >
                  <Heart
                    size={18}
                    strokeWidth={2}
                    fill={
                      favorites && favorites.songIds.length > 0
                        ? "currentColor"
                        : "none"
                    }
                  />
                  {FAVORITES_NAME}
                  {favorites && favorites.songIds.length > 0 && (
                    <span className="tag-drawer__count">
                      {favorites.songIds.length}
                    </span>
                  )}
                </button>
              </li>

              {/* Custom playlists (draggable) */}
              {customPlaylists.length > 0 && (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={customPlaylists.map((p) => p.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {customPlaylists.map((p) => (
                      <SortablePlaylistItem
                        key={p.id}
                        playlist={p}
                        onSelect={handleSelectPlaylist}
                        onDelete={onDeletePlaylist}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              )}

              {/* Crea nuova playlist */}
              <li>
                {creatingPlaylist ? (
                  <div className="tag-drawer__create">
                    <input
                      className="tag-drawer__create-input"
                      type="text"
                      placeholder="Nome playlist..."
                      value={newPlaylistName}
                      onChange={(e) => setNewPlaylistName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCreatePlaylist();
                      }}
                      autoFocus
                    />
                    <button
                      className="tag-drawer__create-confirm"
                      onClick={handleCreatePlaylist}
                      disabled={!newPlaylistName.trim()}
                      aria-label="Conferma"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      className="tag-drawer__create-cancel"
                      onClick={() => {
                        setCreatingPlaylist(false);
                        setNewPlaylistName("");
                      }}
                      aria-label="Annulla"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <button
                    className="tag-drawer__item tag-drawer__item--add"
                    onClick={() => setCreatingPlaylist(true)}
                  >
                    <Plus size={18} strokeWidth={2} />
                    Nuova playlist
                  </button>
                )}
              </li>
            </ul>
          </div>
        </div>
      </aside>
    </div>
  );
}

export { labelForTag };
