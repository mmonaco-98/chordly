import { useState } from 'react'
import { X, Check } from 'lucide-react'
import { useSongs } from '../hooks/useSongs'

interface AddSongsModalProps {
  existingSongIds: string[]
  onConfirm: (selectedIds: string[]) => void
  onClose: () => void
}

export function AddSongsModal({ existingSongIds, onConfirm, onClose }: AddSongsModalProps) {
  const songs = useSongs()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [query, setQuery] = useState('')

  const q = query.toLowerCase()
  const filtered = songs
    .filter(
      (s) =>
        s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q)
    )
    .sort((a, b) => a.title.localeCompare(b.title, 'it'))

  const toggleSelect = (songId: string) => {
    setSelectedIds((prev) =>
      prev.includes(songId) ? prev.filter((id) => id !== songId) : [...prev, songId]
    )
  }

  const handleConfirm = () => {
    if (selectedIds.length > 0) onConfirm(selectedIds)
  }

  return (
    <div className="add-songs-modal">
      <div className="add-songs-modal__panel">
        <header className="add-songs-modal__header">
          <button className="icon-btn" onClick={onClose} aria-label="Chiudi">
            <X size={20} />
          </button>
          <span className="add-songs-modal__title">Aggiungi canzoni</span>
          <div className="add-songs-modal__spacer" />
        </header>

        <div className="add-songs-modal__search-row">
          <input
            className="add-songs-modal__search"
            type="search"
            placeholder="Cerca..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
        </div>

        <ul className="add-songs-modal__list" role="list">
          {filtered.map((song) => {
            const isExisting = existingSongIds.includes(song.id)
            const selIndex = selectedIds.indexOf(song.id)
            const isSelected = selIndex !== -1

            return (
              <li key={song.id}>
                <button
                  className={[
                    'add-songs-modal__song',
                    isSelected ? 'add-songs-modal__song--selected' : '',
                    isExisting ? 'add-songs-modal__song--existing' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => !isExisting && toggleSelect(song.id)}
                  disabled={isExisting}
                  aria-pressed={isSelected}
                >
                  <div className="add-songs-modal__song-text">
                    <span className="add-songs-modal__song-title">{song.title}</span>
                    <span className="add-songs-modal__song-artist">{song.artist}</span>
                  </div>
                  {isExisting ? (
                    <Check size={16} className="add-songs-modal__song-existing-check" />
                  ) : isSelected ? (
                    <span className="add-songs-modal__song-badge">{selIndex + 1}</span>
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>

        <div className="add-songs-modal__footer">
          <span className="add-songs-modal__footer-count">
            {selectedIds.length === 0
              ? 'Nessuna canzone selezionata'
              : `${selectedIds.length} ${selectedIds.length === 1 ? 'canzone' : 'canzoni'} selezionate`}
          </span>
          <button
            className="add-songs-modal__confirm-btn"
            onClick={handleConfirm}
            disabled={selectedIds.length === 0}
          >
            Aggiungi
          </button>
        </div>
      </div>
    </div>
  )
}
