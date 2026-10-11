import { useEffect, useLayoutEffect, useRef, useState } from "react";

interface ChordEditPopoverProps {
  anchor: DOMRect;
  chord: string;
  suggestions: string[];
  onApply: (chord: string) => void;
  onDelete: () => void;
  onClose: () => void;
}

const MARGIN = 8;

function clean(value: string): string {
  return value.replace(/[[\]\n]/g, "").trim();
}

export function ChordEditPopover({
  anchor,
  chord,
  suggestions,
  onApply,
  onDelete,
  onClose,
}: ChordEditPopoverProps) {
  const [value, setValue] = useState(chord);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const { width, height } = panel.getBoundingClientRect();
    const left = Math.min(
      Math.max(MARGIN, anchor.left + anchor.width / 2 - width / 2),
      window.innerWidth - width - MARGIN,
    );
    // Sopra l'accordo, per non coprire il testo che si sta correggendo; sotto se non c'è spazio.
    const above = anchor.top - height - MARGIN;
    setPos({ left, top: above >= MARGIN ? above : anchor.bottom + MARGIN });
  }, [anchor]);

  useEffect(() => {
    // Su touch il focus aprirebbe la tastiera e coprirebbe il canto: si parte dai chip.
    if (!window.matchMedia("(pointer: coarse)").matches) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    // Il popover è ancorato alla posizione dell'accordo: se la vista scorre, si chiude.
    window.addEventListener("scroll", onClose, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [onClose]);

  const next = clean(value);
  const canApply = next !== "" && next !== chord;

  return (
    <div className="chord-popover__layer">
      <div className="chord-popover__backdrop" onClick={onClose} />
      <div
        ref={panelRef}
        className="chord-popover"
        role="dialog"
        aria-label={`Modifica accordo ${chord}`}
        style={{ left: pos?.left ?? 0, top: pos?.top ?? 0, visibility: pos ? "visible" : "hidden" }}
      >
        <input
          ref={inputRef}
          className="chord-popover__input"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canApply) onApply(next);
          }}
          aria-label="Accordo"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />
        {suggestions.length > 0 && (
          <div className="chord-popover__chips">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                className="content-toolbar__chip"
                onClick={() => (s === chord ? onClose() : onApply(s))}
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <div className="chord-popover__actions">
          <button type="button" className="chord-popover__btn chord-popover__btn--danger" onClick={onDelete}>
            Elimina
          </button>
          <button
            type="button"
            className="chord-popover__btn chord-popover__btn--primary"
            onClick={() => onApply(next)}
            disabled={!canApply}
          >
            Applica
          </button>
        </div>
      </div>
    </div>
  );
}
