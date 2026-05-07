interface ContentToolbarProps {
  onInsert: (text: string, cursorOffset: number) => void;
}

export function ContentToolbar({ onInsert }: ContentToolbarProps) {
  return (
    <div className="content-toolbar">
      <button
        type="button"
        className="content-toolbar__btn"
        onClick={() => onInsert("[]", 1)}
        aria-label="Inserisci accordo"
      >
        Chord
      </button>
      <button
        type="button"
        className="content-toolbar__btn"
        onClick={() => onInsert("{start_of_chorus}\n\n{end_of_chorus}\n", 18)}
        aria-label="Inserisci coro"
      >
        Chorus
      </button>
      <button
        type="button"
        className="content-toolbar__btn"
        onClick={() => onInsert("{comment: }", 10)}
        aria-label="Inserisci commento"
      >
        Comment
      </button>
    </div>
  );
}
