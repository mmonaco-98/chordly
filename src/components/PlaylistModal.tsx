import { useState } from 'react'
import { X, Check, Plus } from 'lucide-react'
import type { Playlist } from '../types'

interface Props {
  songId: string
  customPlaylists: Playlist[]
  onToggle: (playlistId: string) => void
  onCreate: (name: string) => void
  onClose: () => void
  isSongInPlaylist: (playlistId: string, songId: string) => boolean
}

export function PlaylistModal({ songId, customPlaylists, onToggle, onCreate, onClose, isSongInPlaylist }: Props) {
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreate = () => {
    const trimmed = newName.trim()
    if (!trimmed) return
    onCreate(trimmed)
    setNewName('')
    setCreating(false)
  }

  return (
    <div className="playlist-modal playlist-modal--open" role="dialog" aria-modal="true" aria-label="Gestisci playlist">
      <div className="playlist-modal__backdrop" onClick={onClose} />
      <div className="playlist-modal__panel">
        <div className="playlist-modal__header">
          <span className="playlist-modal__title">Aggiungi a playlist</span>
          <button className="icon-btn" onClick={onClose} aria-label="Chiudi">
            <X size={20} />
          </button>
        </div>

        <ul className="playlist-modal__list" role="list">
          {customPlaylists.length === 0 && !creating && (
            <li className="playlist-modal__empty">Nessuna playlist. Creane una!</li>
          )}
          {customPlaylists.map((p) => {
            const inPlaylist = isSongInPlaylist(p.id, songId)
            return (
              <li key={p.id}>
                <button
                  className={`playlist-modal__item${inPlaylist ? ' playlist-modal__item--active' : ''}`}
                  onClick={() => onToggle(p.id)}
                >
                  <span className="playlist-modal__item-name">{p.name}</span>
                  {inPlaylist && <Check size={16} />}
                </button>
              </li>
            )
          })}
        </ul>

        {creating ? (
          <div className="playlist-modal__create">
            <input
              className="playlist-modal__input"
              type="text"
              placeholder="Nome playlist..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
              autoFocus
            />
            <button
              className="playlist-modal__create-btn"
              onClick={handleCreate}
              disabled={!newName.trim()}
            >
              Crea
            </button>
            <button
              className="icon-btn"
              onClick={() => { setCreating(false); setNewName('') }}
              aria-label="Annulla"
            >
              <X size={18} />
            </button>
          </div>
        ) : (
          <button className="playlist-modal__add-btn" onClick={() => setCreating(true)}>
            <Plus size={16} />
            Nuova playlist
          </button>
        )}
      </div>
    </div>
  )
}
