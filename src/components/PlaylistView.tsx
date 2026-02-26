import { useParams, useNavigate } from 'react-router-dom'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { ChevronLeft, ChevronRight, GripVertical, Music2, Trash2 } from 'lucide-react'
import songs from '../songs'
import type { Song } from '../types'
import { usePlaylists, FAVORITES_ID, FAVORITES_NAME } from '../hooks/usePlaylists'

export function PlaylistView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { playlists, deletePlaylist, reorderSongs } = usePlaylists()

  const playlist =
    playlists.find((p) => p.id === id) ??
    (id === FAVORITES_ID ? { id: FAVORITES_ID, name: FAVORITES_NAME, songIds: [] } : null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  )

  if (!playlist) {
    return (
      <div className="playlist-view">
        <header className="playlist-view__header">
          <button className="icon-btn" onClick={() => navigate('/')} aria-label="Torna indietro">
            <ChevronLeft size={22} />
          </button>
          <div className="playlist-view__meta">
            <h1 className="playlist-view__title">Playlist non trovata</h1>
          </div>
        </header>
      </div>
    )
  }

  const playlistSongs = playlist.songIds
    .map((sid) => songs.find((s) => s.id === sid))
    .filter((s): s is Song => s !== undefined)

  const isFavorites = id === FAVORITES_ID

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = playlist.songIds.indexOf(active.id as string)
    const newIndex = playlist.songIds.indexOf(over.id as string)
    if (oldIndex === -1 || newIndex === -1) return
    reorderSongs(playlist.id, arrayMove(playlist.songIds, oldIndex, newIndex))
  }

  return (
    <div className="playlist-view">
      <header className="playlist-view__header">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Torna indietro">
          <ChevronLeft size={22} />
        </button>
        <div className="playlist-view__meta">
          <h1 className="playlist-view__title">{playlist.name}</h1>
          <p className="playlist-view__count">{playlistSongs.length} canzoni</p>
        </div>
        {!isFavorites && (
          <button
            className="icon-btn"
            onClick={() => { deletePlaylist(playlist.id); navigate('/') }}
            aria-label={`Elimina playlist ${playlist.name}`}
          >
            <Trash2 size={20} />
          </button>
        )}
      </header>

      {playlistSongs.length === 0 ? (
        <div className="playlist-view__empty">
          <Music2 size={40} className="playlist-view__empty-icon" />
          <p>Nessuna canzone in questa playlist.</p>
          <p className="playlist-view__empty-hint">
            Aggiungile dalla vista canzone con ♡ o ⊞
          </p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={playlist.songIds} strategy={verticalListSortingStrategy}>
            <ul className="playlist-view__list" role="list">
              {playlistSongs.map((song) => (
                <SortableSongItem
                  key={song.id}
                  song={song}
                  onTap={() => navigate(`/song/${song.id}`, { state: { source: 'playlist', playlistId: id } })}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}

function SortableSongItem({ song, onTap }: { song: Song; onTap: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: song.id })

  const style: React.CSSProperties = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0) scaleX(${transform.scaleX ?? 1}) scaleY(${transform.scaleY ?? 1})`
      : undefined,
    transition,
    zIndex: isDragging ? 10 : undefined,
    position: isDragging ? 'relative' : undefined,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`playlist-item${isDragging ? ' playlist-item--dragging' : ''}`}
    >
      <button
        className="playlist-item__handle"
        aria-label="Trascina per riordinare"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={20} />
      </button>
      <button className="playlist-item__body" onClick={onTap}>
        <div className="playlist-item__text">
          <span className="playlist-item__title">{song.title}</span>
          <span className="playlist-item__artist">{song.artist}</span>
        </div>
        <ChevronRight size={16} className="playlist-item__chevron" />
      </button>
    </li>
  )
}
