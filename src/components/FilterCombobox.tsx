import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { useTapToBlur } from "../hooks/useTapToBlur";
import { matchOptions, type ComboOption } from "../utils/matchOptions";

interface Props {
  label: string;
  allLabel: string;
  options: ComboOption[];
  value: string | null;
  onChange: (value: string | null) => void;
}

export function FilterCombobox({ label, allLabel, options, value, onChange }: Props) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";
  const matches = useMemo(
    () => (typing ? matchOptions(options, text) : options),
    [options, text, typing],
  );
  // Riga 0 = "tutti" (solo quando non si sta cercando), poi le opzioni.
  const rows = useMemo(
    () => (typing && text.trim() ? matches : [{ value: "", label: allLabel }, ...matches]),
    [typing, text, matches, allLabel],
  );

  const close = () => {
    setOpen(false);
    setTyping(false);
    setText("");
  };

  const tapToBlur = useTapToBlur(close);

  const select = (v: string | null) => {
    onChange(v || null);
    close();
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  useEffect(() => {
    listRef.current?.children[highlight]?.scrollIntoView({ block: "nearest" });
  }, [highlight, open]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      const n = rows.length;
      setHighlight((h) => (e.key === "ArrowDown" ? (h + 1) % n : (h - 1 + n) % n));
    } else if (e.key === "Enter" && open) {
      e.preventDefault();
      const row = rows[highlight];
      if (row) select(row.value);
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      close();
    }
  };

  const active = !!value;
  return (
    <div className="filter-select filter-combo" ref={rootRef}>
      <input
        type="text"
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={open && rows[highlight] ? `${id}-opt-${highlight}` : undefined}
        className={`filter-select__input filter-combo__input${active ? " filter-select__input--active" : ""}`}
        placeholder={allLabel}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        value={typing ? text : selectedLabel}
        onFocus={() => {
          setHighlight(0);
          setOpen(true);
        }}
        {...tapToBlur}
        onChange={(e) => {
          setText(e.target.value);
          setTyping(true);
          setHighlight(0);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
      />
      {active ? (
        <button
          type="button"
          className="filter-combo__clear"
          aria-label={`Azzera ${label.toLowerCase()}`}
          onClick={() => select(null)}
        >
          <X size={16} />
        </button>
      ) : (
        <ChevronDown size={16} className="filter-select__chevron" aria-hidden="true" />
      )}
      {open && (
        <ul id={`${id}-list`} className="filter-combo__list" role="listbox" ref={listRef}>
          {rows.length === 0 || (typing && text.trim() && matches.length === 0) ? (
            <li className="filter-combo__empty">Nessun risultato</li>
          ) : (
            rows.map((o, i) => (
              <li
                key={o.value || "__all"}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={(o.value || null) === value}
                className={
                  "filter-combo__option" +
                  (i === highlight ? " filter-combo__option--highlight" : "") +
                  ((o.value || null) === value ? " filter-combo__option--selected" : "")
                }
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => select(o.value)}
                onPointerEnter={() => setHighlight(i)}
              >
                {o.label}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
