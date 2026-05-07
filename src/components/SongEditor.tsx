import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Save, AlertCircle } from 'lucide-react'
import { useCreateSong, useUpdateSong } from '../hooks/useSongs'
import { useSongs } from '../hooks/useSongs'
import type { Song } from '../types'
import { ContentToolbar } from './ContentToolbar'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function SongEditor() {
  const navigate = useNavigate()
  const { id: songId } = useParams<{ id: string }>()
  const isEditMode = !!songId
  const songs = useSongs()
  const editingSong = isEditMode ? songs.find(s => s.id === songId) : null
  const { create, isPending: isCreating, error: createError } = useCreateSong()
  const { update, isPending: isUpdating, error: updateError } = useUpdateSong()
  
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [key, setKey] = useState('')
  const [tags, setTags] = useState('')
  const [id, setId] = useState('')
  const [content, setContent] = useState('')
  const [hasManuallyEditedId, setHasManuallyEditedId] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isEditMode && editingSong) {
      setTitle(editingSong.title)
      setArtist(editingSong.artist)
      setKey(editingSong.key ?? '')
      setTags(editingSong.tags?.join(', ') ?? '')
      setId(editingSong.id)
      setContent(editingSong.content)
      setHasManuallyEditedId(true)
    }
  }, [isEditMode, editingSong])

  useEffect(() => {
    if (!hasManuallyEditedId && title && !isEditMode) {
      setId(slugify(title))
    }
  }, [title, hasManuallyEditedId, isEditMode])

  const isValid = title.trim() !== '' && artist.trim() !== '' && content.trim() !== ''
  const isPending = isEditMode ? isUpdating : isCreating
  const error = isEditMode ? updateError : createError

  function handleIdChange(e: React.ChangeEvent<HTMLInputElement>) {
    setId(e.target.value)
    setHasManuallyEditedId(true)
  }

  function handleInsert(text: string, cursorOffset: number) {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const before = content.substring(0, start)
    const after = content.substring(end)
    const newContent = before + text + after

    setContent(newContent)

    requestAnimationFrame(() => {
      const newPos = start + cursorOffset
      textarea.focus()
      textarea.setSelectionRange(newPos, newPos)
    })
  }

  async function handleSubmit() {
    const song: Song = {
      id,
      title,
      artist,
      key,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      content,
    }
    try {
      if (isEditMode) {
        await update(song)
        navigate(-1)
      } else {
        await create(song)
        navigate('/')
      }
    } catch {
      // error già gestito dall'hook
    }
  }

  return (
    <div className="song-editor">
      <header className="song-editor__header">
        <button
          className="icon-btn icon-btn--accent"
          onClick={() => navigate(-1)}
          aria-label="Annulla"
        >
          <ChevronLeft size={22} />
        </button>
        <h1 className="song-editor__title">{isEditMode ? 'Modifica Canzone' : 'Nuova Canzone'}</h1>
        <button
          className="icon-btn icon-btn--accent"
          onClick={handleSubmit}
          disabled={!isValid || isPending}
          aria-label="Salva"
        >
          <Save size={20} />
        </button>
      </header>

      {error && (
        <div className="song-editor__error song-editor__error--save">
          <AlertCircle size={16} />
          <span>Errore salvataggio: {error.message}</span>
        </div>
      )}

      <div className="song-editor__form">
        <div className="song-editor__form-row">
          <div className="song-editor__column">
            <div className="song-editor__field">
              <label className="song-editor__label" htmlFor="title">
                Title
              </label>
              <input
                id="title"
                className="song-editor__input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoComplete="off"
              />
            </div>

            <div className="song-editor__field">
              <label className="song-editor__label" htmlFor="artist">
                Artist
              </label>
              <input
                id="artist"
                className="song-editor__input"
                type="text"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                autoComplete="off"
              />
            </div>

            <div className="song-editor__field">
              <label className="song-editor__label" htmlFor="key">
                Key
              </label>
              <input
                id="key"
                className="song-editor__input"
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                autoComplete="off"
              />
            </div>

            <div className="song-editor__field">
              <label className="song-editor__label" htmlFor="tags">
                Tags
              </label>
              <input
                id="tags"
                className="song-editor__input"
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="italiana, cristiana"
                autoComplete="off"
              />
            </div>

            <div className="song-editor__field">
              <label className="song-editor__label" htmlFor="id">
                ID Slug
              </label>
              <input
                id="id"
                className="song-editor__input"
                type="text"
                value={id}
                onChange={handleIdChange}
                autoComplete="off"
              />
            </div>
          </div>

          <div className="song-editor__column song-editor__column--content">
            <div className="song-editor__field">
              <label className="song-editor__label" htmlFor="content">
                Content
              </label>
              <ContentToolbar onInsert={handleInsert} />
              <textarea
                id="content"
                ref={textareaRef}
                className="song-editor__textarea song-editor__textarea--chordpro"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="{title: Titolo}&#10;{artist: Artista}&#10;{key: C}&#10;&#10;[C]Testo della canzone..."
                spellCheck={false}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
