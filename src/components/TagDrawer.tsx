import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Music, Heart, Trash2, Plus, Check } from 'lucide-react'
import type { Playlist } from '../types'
import { FAVORITES_ID, FAVORITES_NAME } from '../hooks/usePlaylists'

interface Props {
  open: boolean
  onClose: () => void
  tags: string[]
  activeTag: string | null
  onSelectTag: (tag: string | null) => void
  playlists: Playlist[]
  onCreatePlaylist: (name: string) => void
  onDeletePlaylist: (id: string) => void
}

const TAG_LABELS: Record<string, string> = {
  italiana: 'Musica italiana',
  straniera: 'Musica straniera',
  cristiana: 'Musica cristiana',
  pop: 'Pop',
  rock: 'Rock',
  folk: 'Folk',
}

function labelForTag(tag: string): string {
  return TAG_LABELS[tag] ?? tag.charAt(0).toUpperCase() + tag.slice(1)
}

export function TagDrawer({
  open, onClose,
  tags, activeTag, onSelectTag,
  playlists,
  onCreatePlaylist, onDeletePlaylist,
}: Props) {
  const [creatingPlaylist, setCreatingPlaylist] = useState(false)
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const navigate = useNavigate()

  const handleSelectTag = (tag: string | null) => {
    onSelectTag(tag)
    onClose()
  }

  const handleSelectPlaylist = (id: string) => {
    navigate(`/playlist/${id}`)
    onClose()
  }

  const handleCreatePlaylist = () => {
    const trimmed = newPlaylistName.trim()
    if (!trimmed) return
    onCreatePlaylist(trimmed)
    setNewPlaylistName('')
    setCreatingPlaylist(false)
  }

  const favorites = playlists.find((p) => p.id === FAVORITES_ID)
  const customPlaylists = playlists.filter((p) => p.id !== FAVORITES_ID)

  return (
    <div
      className={`tag-drawer${open ? ' tag-drawer--open' : ''}`}
      aria-hidden={!open}
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
    >
      <div className="tag-drawer__backdrop" onClick={onClose} />
      <aside className="tag-drawer__panel">
        <div className="tag-drawer__header">
          <span className="tag-drawer__title">Menu</span>
          <button className="icon-btn" onClick={onClose} aria-label="Chiudi menu">
            <X size={20} />
          </button>
        </div>

        {/* Canzonieri */}
        <p className="tag-drawer__section-header">Canzonieri</p>
        <ul className="tag-drawer__list" role="list">
          <li>
            <button
              className={`tag-drawer__item${activeTag === null ? ' tag-drawer__item--active' : ''}`}
              onClick={() => handleSelectTag(null)}
            >
              <Music size={18} strokeWidth={2} />
              Tutti
            </button>
          </li>
          {tags.map((tag) => (
            <li key={tag}>
              <button
                className={`tag-drawer__item${activeTag === tag ? ' tag-drawer__item--active' : ''}`}
                onClick={() => handleSelectTag(tag)}
              >
                {labelForTag(tag)}
              </button>
            </li>
          ))}
        </ul>

        {/* Playlist personali */}
        <p className="tag-drawer__section-header tag-drawer__section-header--spaced">Playlist personali</p>
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
                fill={favorites && favorites.songIds.length > 0 ? 'currentColor' : 'none'}
              />
              {FAVORITES_NAME}
              {favorites && favorites.songIds.length > 0 && (
                <span className="tag-drawer__count">{favorites.songIds.length}</span>
              )}
            </button>
          </li>

          {/* Custom playlists */}
          {customPlaylists.map((p) => (
            <li key={p.id}>
              <div className="tag-drawer__item-row">
                <button
                  className="tag-drawer__item tag-drawer__item--flex"
                  onClick={() => handleSelectPlaylist(p.id)}
                >
                  {p.name}
                  {p.songIds.length > 0 && (
                    <span className="tag-drawer__count">{p.songIds.length}</span>
                  )}
                </button>
                <button
                  className="tag-drawer__item-delete"
                  onClick={() => onDeletePlaylist(p.id)}
                  aria-label={`Elimina playlist ${p.name}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}

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
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreatePlaylist() }}
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
                  onClick={() => { setCreatingPlaylist(false); setNewPlaylistName('') }}
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
      </aside>
    </div>
  )
}

export { labelForTag }
