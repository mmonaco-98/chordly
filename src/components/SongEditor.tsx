import { useState, useEffect, useRef, useDeferredValue, useMemo, useCallback } from 'react'
import { flushSync } from 'react-dom'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, ChevronDown, Save, AlertCircle } from 'lucide-react'
import { useCreateSong, useUpdateSong } from '../hooks/useSongs'
import { useSongs } from '../hooks/useSongs'
import { useFontSize } from '../hooks/useFontSize'
import { useChordNotation } from '../hooks/useChordNotation'
import type { Song } from '../types'
import { ContentToolbar } from './ContentToolbar'
import { ChordSheet } from './ChordSheet'
import { DiscardChangesModal } from './DiscardChangesModal'
import { ChordEditPopover } from './ChordEditPopover'
import { joinAuthors, makeCanon, parseAuthorsInput, resolveAuthors } from '../utils/authors.mjs'
import { insertAt, usedChords, wrapSection, wrapSelection } from '../utils/chordproEdit'
import type { Edit, SectionKind } from '../utils/chordproEdit'
import { buildSourceMap, replaceChord } from '../utils/chordproMap'
import { lineToY, yToLine } from '../utils/scrollMap'
import type { Anchor } from '../utils/scrollMap'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

interface Fields {
  title: string
  artist: string
  key: string
  tags: string
  id: string
  content: string
}

const EMPTY: Fields = { title: '', artist: '', key: '', tags: '', id: '', content: '' }

function fieldsFromSong(song: Song): Fields {
  return {
    title: song.title,
    artist: joinAuthors(resolveAuthors(song.authors, song.artist)),
    key: song.key ?? '',
    tags: song.tags?.join(', ') ?? '',
    id: song.id,
    content: song.content,
  }
}

type Pane = 'write' | 'preview'

// Con i pannelli affiancati (CSS: min-width 900px) scorrono insieme.
const SPLIT_QUERY = '(min-width: 900px)'
// Finestra in cui si ignora l'evento di scroll causato dalla sincronizzazione stessa.
const ECHO_MS = 120

export function SongEditor() {
  const navigate = useNavigate()
  const { id: songId } = useParams<{ id: string }>()
  const isEditMode = !!songId
  const songs = useSongs()
  const editingSong = isEditMode ? songs.find(s => s.id === songId) : null
  const { create, isPending: isCreating, error: createError } = useCreateSong()
  const { update, isPending: isUpdating, error: updateError } = useUpdateSong()
  const { fontSize } = useFontSize()
  const { notation } = useChordNotation()

  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [key, setKey] = useState('')
  const [tags, setTags] = useState('')
  const [id, setId] = useState('')
  const [content, setContent] = useState('')
  const [hasManuallyEditedId, setHasManuallyEditedId] = useState(false)
  const [initial, setInitial] = useState<Fields | null>(isEditMode ? null : EMPTY)
  const [pane, setPane] = useState<Pane>('write')
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [chordEdit, setChordEdit] = useState<{ index: number; rect: DOMRect } | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const previewPaneRef = useRef<HTMLDivElement>(null)
  const ignoreScroll = useRef({ text: 0, preview: 0 })
  const populated = useRef(false)

  // Il refresh in background di useSongs cambia editingSong: popolare una sola volta
  // evita di sovrascrivere ciò che l'utente sta scrivendo.
  useEffect(() => {
    if (isEditMode && editingSong && !populated.current) {
      populated.current = true
      const f = fieldsFromSong(editingSong)
      setTitle(f.title)
      setArtist(f.artist)
      setKey(f.key)
      setTags(f.tags)
      setId(f.id)
      setContent(f.content)
      setHasManuallyEditedId(true)
      setInitial(f)
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

  const dirty =
    initial !== null &&
    (title !== initial.title ||
      artist !== initial.artist ||
      key !== initial.key ||
      tags !== initial.tags ||
      id !== initial.id ||
      content !== initial.content)

  useEffect(() => {
    if (!dirty) return
    function warn(e: BeforeUnloadEvent) {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const previewContent = useDeferredValue(content)
  const chords = usedChords(previewContent)
  const sourceMap = useMemo(() => buildSourceMap(previewContent), [previewContent])

  function handleIdChange(e: React.ChangeEvent<HTMLInputElement>) {
    setId(e.target.value)
    setHasManuallyEditedId(true)
  }

  function handleBack() {
    if (dirty) setConfirmLeave(true)
    else navigate(-1)
  }

  function applyEdit(build: (start: number, end: number) => Edit) {
    const textarea = textareaRef.current
    if (!textarea) return
    const edit = build(textarea.selectionStart, textarea.selectionEnd)
    setContent(edit.value)
    requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(edit.selStart, edit.selEnd)
    })
  }

  function handleChord(chord: string) {
    applyEdit((start) =>
      chord ? insertAt(content, start, `[${chord}]`) : insertAt(content, start, '[]', 1),
    )
  }

  function handleSection(kind: SectionKind) {
    applyEdit((start, end) => wrapSection(content, start, end, kind))
  }

  function handleComment() {
    applyEdit((start, end) => wrapSelection(content, start, end, '{comment: ', '}'))
  }

  function handleLyricsTap(index: number, offset: number) {
    const pair = sourceMap[index]
    const textarea = textareaRef.current
    if (!pair || !textarea || content !== previewContent) return
    const pos = Math.min(pair.lyricStart + offset, pair.lyricEnd)
    // Su mobile la textarea è nascosta finché non si passa a "Scrivi".
    flushSync(() => setPane('write'))
    textarea.focus()
    textarea.setSelectionRange(pos, pos)
    const line = textarea.value.slice(0, pos).split('\n').length - 1
    const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight)
    textarea.scrollTop = Math.max(0, line * lineHeight - textarea.clientHeight / 2)
  }

  function previewAnchors(pane: HTMLElement): Anchor[] {
    const origin = pane.getBoundingClientRect().top - pane.scrollTop
    const seen = new Set<number>()
    const anchors: Anchor[] = []
    pane.querySelectorAll<HTMLElement>('.column[data-pair]').forEach((col) => {
      const pair = sourceMap[Number(col.dataset.pair)]
      if (!pair || seen.has(pair.line)) return
      seen.add(pair.line)
      const row = col.closest('.row') ?? col
      anchors.push({ line: pair.line, y: row.getBoundingClientRect().top - origin })
    })
    return anchors.sort((a, b) => a.line - b.line)
  }

  function syncPreviewToText() {
    const textarea = textareaRef.current
    const pane = previewPaneRef.current
    if (!textarea || !pane || !window.matchMedia(SPLIT_QUERY).matches) return
    if (performance.now() < ignoreScroll.current.text) return
    const textMax = textarea.scrollHeight - textarea.clientHeight
    const paneMax = pane.scrollHeight - pane.clientHeight
    const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight)
    const anchors = previewAnchors(pane)
    const target =
      textarea.scrollTop <= 0 ? 0
      : textarea.scrollTop >= textMax - 1 ? paneMax
      // Senza ancore (mappa non allineata al testo) si scorre in proporzione.
      : anchors.length === 0 ? (textarea.scrollTop / textMax) * paneMax
      : lineToY(anchors, textarea.scrollTop / lineHeight)
    ignoreScroll.current.preview = performance.now() + ECHO_MS
    pane.scrollTop = target
  }

  function syncTextToPreview() {
    const textarea = textareaRef.current
    const pane = previewPaneRef.current
    if (!textarea || !pane || !window.matchMedia(SPLIT_QUERY).matches) return
    if (performance.now() < ignoreScroll.current.preview) return
    const textMax = textarea.scrollHeight - textarea.clientHeight
    const paneMax = pane.scrollHeight - pane.clientHeight
    const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight)
    const anchors = previewAnchors(pane)
    const target =
      pane.scrollTop <= 0 ? 0
      : pane.scrollTop >= paneMax - 1 ? textMax
      : anchors.length === 0 ? (pane.scrollTop / paneMax) * textMax
      : yToLine(anchors, pane.scrollTop) * lineHeight
    ignoreScroll.current.text = performance.now() + ECHO_MS
    textarea.scrollTop = target
  }

  function handleChordTap(index: number, rect: DOMRect) {
    setChordEdit({ index, rect })
  }

  const closeChordEdit = useCallback(() => setChordEdit(null), [])

  function handleChordApply(chord: string) {
    const pair = chordEdit ? sourceMap[chordEdit.index] : null
    setChordEdit(null)
    // La mappa si basa sul testo dell'anteprima: se nel frattempo è cambiato, non si tocca nulla.
    if (!pair || content.slice(pair.chordStart, pair.chordEnd) !== `[${pair.chord}]`) return
    setContent(replaceChord(content, pair, chord))
  }

  async function handleSubmit() {
    const canon = makeCanon(songs.flatMap((s) => resolveAuthors(s.authors, s.artist)))
    const authors = parseAuthorsInput(artist, canon)
    const song: Song = {
      id,
      title,
      artist: joinAuthors(authors),
      authors,
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

  const tagCount = tags.split(',').filter(t => t.trim()).length
  const detailsSummary = [key.trim(), tagCount > 0 ? `${tagCount} tag` : ''].filter(Boolean).join(' · ')

  return (
    <div className="song-editor">
      <header className="song-editor__header">
        <button
          className="icon-btn icon-btn--accent"
          onClick={handleBack}
          aria-label="Annulla"
        >
          <ChevronLeft size={22} />
        </button>
        <h1 className="song-editor__title">{isEditMode ? 'Modifica canzone' : 'Nuova canzone'}</h1>
        <button
          className="song-editor__save"
          onClick={handleSubmit}
          disabled={!isValid || !dirty || isPending}
        >
          <Save size={18} />
          {isPending ? 'Salvo…' : 'Salva'}
        </button>
      </header>

      {error && (
        <div className="song-editor__error song-editor__error--save" role="alert">
          <AlertCircle size={16} />
          <span>Errore salvataggio: {error.message}</span>
        </div>
      )}

      <section className="song-editor__meta" aria-label="Dati della canzone">
        <div className="song-editor__meta-main">
          <div className="song-editor__field">
            <label className="song-editor__label" htmlFor="title">Titolo</label>
            <input
              id="title"
              className="song-editor__input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoComplete="off"
              required
            />
          </div>
          <div className="song-editor__field">
            <label className="song-editor__label" htmlFor="artist">Autore</label>
            <input
              id="artist"
              className="song-editor__input"
              type="text"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              autoComplete="off"
              required
            />
          </div>
        </div>

        <button
          type="button"
          className="song-editor__details-toggle"
          aria-expanded={detailsOpen}
          aria-controls="song-editor-details"
          onClick={() => setDetailsOpen(o => !o)}
        >
          <span>Dettagli</span>
          {detailsSummary && <span className="song-editor__details-summary">{detailsSummary}</span>}
          <ChevronDown size={18} className="song-editor__details-chevron" />
        </button>

        {detailsOpen && (
          <div id="song-editor-details" className="song-editor__details">
            <div className="song-editor__field">
              <label className="song-editor__label" htmlFor="key">Tonalità</label>
              <input
                id="key"
                className="song-editor__input"
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="Am"
                autoComplete="off"
              />
            </div>
            <div className="song-editor__field">
              <label className="song-editor__label" htmlFor="tags">Tag</label>
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
              <label className="song-editor__label" htmlFor="id">ID (slug)</label>
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
        )}
      </section>

      <div className="song-editor__tabs" role="tablist" aria-label="Vista">
        <button
          role="tab"
          id="tab-write"
          aria-selected={pane === 'write'}
          aria-controls="pane-write"
          className="song-editor__tab"
          onClick={() => setPane('write')}
        >
          Scrivi
        </button>
        <button
          role="tab"
          id="tab-preview"
          aria-selected={pane === 'preview'}
          aria-controls="pane-preview"
          className="song-editor__tab"
          onClick={() => setPane('preview')}
        >
          Anteprima
        </button>
      </div>

      <div className="song-editor__panes" data-pane={pane}>
        <div
          id="pane-write"
          role="tabpanel"
          aria-labelledby="tab-write"
          className="song-editor__pane song-editor__pane--write"
        >
          <ContentToolbar
            chords={chords}
            onChord={handleChord}
            onSection={handleSection}
            onComment={handleComment}
          />
          <textarea
            id="content"
            ref={textareaRef}
            className="song-editor__textarea song-editor__textarea--chordpro"
            aria-label="Testo e accordi in formato ChordPro"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onScroll={syncPreviewToText}
            placeholder={'{title: Titolo}\n{key: C}\n\n[C]Testo della [G]canzone...'}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
          />
        </div>

        <div
          ref={previewPaneRef}
          onScroll={syncTextToPreview}
          id="pane-preview"
          role="tabpanel"
          aria-labelledby="tab-preview"
          className="song-editor__pane song-editor__pane--preview"
        >
          {previewContent.trim() ? (
            <div className="song-editor__preview" style={{ fontSize: `${fontSize}px` }}>
              <ChordSheet
                content={previewContent}
                notation={notation}
                interactive={false}
                pairCount={sourceMap.length}
                onChordTap={handleChordTap}
                onLyricsTap={handleLyricsTap}
              />
            </div>
          ) : (
            <p className="song-editor__preview-empty">
              Scrivi il testo con gli accordi tra parentesi quadre, ad esempio [Am]. L'anteprima compare qui.
            </p>
          )}
        </div>
      </div>

      {chordEdit && sourceMap[chordEdit.index] && (
        <ChordEditPopover
          key={chordEdit.index}
          anchor={chordEdit.rect}
          chord={sourceMap[chordEdit.index].chord}
          suggestions={chords}
          onApply={handleChordApply}
          onDelete={() => handleChordApply('')}
          onClose={closeChordEdit}
        />
      )}

      <DiscardChangesModal
        isOpen={confirmLeave}
        onKeepEditing={() => setConfirmLeave(false)}
        onDiscard={() => navigate(-1)}
      />
    </div>
  )
}
