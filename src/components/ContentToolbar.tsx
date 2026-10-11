import type { SectionKind } from "../utils/chordproEdit";

interface ContentToolbarProps {
  chords: string[];
  onChord: (chord: string) => void;
  onSection: (kind: SectionKind) => void;
  onComment: () => void;
}

const SECTIONS: { kind: SectionKind; label: string }[] = [
  { kind: "verse", label: "Strofa" },
  { kind: "chorus", label: "Ritornello" },
  { kind: "bridge", label: "Bridge" },
];

// Il mousedown sul bottone sposterebbe il focus fuori dalla textarea e farebbe perdere la selezione.
const keepFocus = (e: React.MouseEvent) => e.preventDefault();

export function ContentToolbar({ chords, onChord, onSection, onComment }: ContentToolbarProps) {
  return (
    <div className="content-toolbar" role="toolbar" aria-label="Strumenti di scrittura">
      <div className="content-toolbar__row">
        <button
          type="button"
          className="content-toolbar__btn content-toolbar__btn--chord"
          onMouseDown={keepFocus}
          onClick={() => onChord("")}
        >
          [ ] Accordo
        </button>
        {SECTIONS.map(({ kind, label }) => (
          <button
            key={kind}
            type="button"
            className="content-toolbar__btn"
            onMouseDown={keepFocus}
            onClick={() => onSection(kind)}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          className="content-toolbar__btn"
          onMouseDown={keepFocus}
          onClick={onComment}
        >
          Commento
        </button>
      </div>
      {chords.length > 0 && (
        <div className="content-toolbar__row content-toolbar__row--chips" aria-label="Accordi usati">
          {chords.map((chord) => (
            <button
              key={chord}
              type="button"
              className="content-toolbar__chip"
              onMouseDown={keepFocus}
              onClick={() => onChord(chord)}
              aria-label={`Inserisci accordo ${chord}`}
            >
              {chord}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
