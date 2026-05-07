import { useRef, useLayoutEffect } from "react";
import ChordSheetJS from "chordsheetjs";
import { convertChord } from "../utils/convertChord";
import type { ChordNotation } from "../utils/convertChord";
import { useChordTooltip } from "../hooks/useChordTooltip";
import { ChordTooltip } from "./ChordTooltip";

interface Props {
  content: string;
  notation?: ChordNotation;
  hideBass?: boolean;
}

function processHtml(html: string, notation: ChordNotation, hideBass: boolean): string {
  const doc = new DOMParser().parseFromString(html, "text/html");

  doc.querySelectorAll(".row").forEach((row) => {
    const cols = Array.from(
      row.querySelectorAll<HTMLElement>(":scope > .column"),
    );
    for (let i = 0; i < cols.length - 1; i++) {
      const lyrics = cols[i].querySelector(".lyrics")?.textContent ?? "";
      const nextLyrics =
        cols[i + 1].querySelector(".lyrics")?.textContent ?? "";
      if (
        lyrics.length > 0 &&
        !/\s$/.test(lyrics) &&
        /^\p{L}/u.test(nextLyrics)
      ) {
        cols[i].classList.add("word-continues");
      }
    }
    cols.forEach((col) => {
      const lyrics = col.querySelector(".lyrics")?.textContent ?? "";
      const chord = col.querySelector(".chord")?.textContent ?? "";
      if (chord.trim().length > 0 && lyrics.trim().length === 0) {
        col.classList.add("chord-only");
      }
    });
  });

  doc.querySelectorAll<HTMLElement>(".paragraph").forEach((para) => {
    para.querySelectorAll<HTMLElement>(":scope > .row").forEach((row) => {
      const children = Array.from(row.children);
      if (children.length !== 1 || !children[0].classList.contains("comment")) return;
      const text = children[0].textContent?.trim() ?? "";
      if (!/^[A-Z]{2,6}\.?$/.test(text)) return;
      const prevRow = row.previousElementSibling;
      if (prevRow?.classList.contains("row")) {
        row.remove();
        const label = doc.createElement("span");
        label.className = "paragraph-label";
        label.textContent = text;
        prevRow.appendChild(label);
      }
    });
  });

  // Store original English chord name for DB lookup before any notation conversion
  doc.querySelectorAll(".chord").forEach((el) => {
    const text = el.textContent ?? "";
    if (text) el.setAttribute("data-chord", text);
  });

  // Strip bass note from slash chords (e.g. "C/E" → "C")
  if (hideBass) {
    doc.querySelectorAll(".chord").forEach((el) => {
      const text = el.textContent ?? "";
      if (text) el.textContent = text.replace(/\/[A-Ga-g][#b]?$/, "");
    });
  }

  if (notation === "italian") {
    doc.querySelectorAll(".chord").forEach((el) => {
      const text = el.textContent ?? "";
      if (text) el.textContent = convertChord(text, "italian");
    });
  }

  return doc.body.innerHTML;
}

const LABEL_OFFSET = 16;

export function ChordSheet({ content, notation = "international", hideBass = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltip = useChordTooltip(containerRef);

  let html = "";
  try {
    const parser = new ChordSheetJS.ChordProParser();
    const sheet = parser.parse(content);
    const formatter = new ChordSheetJS.HtmlDivFormatter({
      normalizeChords: false,
    });
    html = processHtml(formatter.format(sheet), notation, hideBass);
  } catch {
    html = `<pre>${content}</pre>`;
  }

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const positionLabels = () => {
      const labels = container.querySelectorAll<HTMLElement>(".paragraph-label");
      if (labels.length === 0) return;

      const containerLeft = container.getBoundingClientRect().left;
      const containerWidth = container.clientWidth;

      let maxRight = 0;
      container.querySelectorAll<HTMLElement>(".row").forEach((row) => {
        const cols = row.querySelectorAll<HTMLElement>(".column");
        if (cols.length === 0) return;
        const lastCol = cols[cols.length - 1];
        const right = lastCol.getBoundingClientRect().right - containerLeft;
        maxRight = Math.max(maxRight, right);
      });
      if (maxRight === 0) return;

      labels.forEach((label) => {
        const row = label.parentElement;
        if (!row) return;

        // Calculate this row's own right edge
        const cols = row.querySelectorAll<HTMLElement>(".column");
        let rowRight = 0;
        if (cols.length > 0) {
          const lastCol = cols[cols.length - 1];
          rowRight = lastCol.getBoundingClientRect().right - containerLeft;
        }

        const labelWidth = label.offsetWidth;
        const minLeft = rowRight + LABEL_OFFSET;

        // If the label can't fit after this row's text, go to a new line
        if (minLeft + labelWidth > containerWidth) {
          label.style.position = "static";
          label.style.left = "";
          label.style.bottom = "";
          row.style.position = "";
          return;
        }

        row.style.position = "relative";
        label.style.position = "absolute";
        label.style.bottom = "0";

        const idealLeft = maxRight + LABEL_OFFSET;
        const maxLeft = containerWidth - labelWidth;
        label.style.left = `${Math.max(minLeft, Math.min(idealLeft, maxLeft))}px`;
      });
    };

    positionLabels();

    const ro = new ResizeObserver(positionLabels);
    ro.observe(container);
    return () => ro.disconnect();
  }, [content, notation, hideBass]);

  return (
    <>
      <div
        ref={containerRef}
        className="chord-sheet"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {tooltip.isOpen && (
        <ChordTooltip
          chordName={tooltip.chordName}
          displayName={tooltip.displayName}
          position={tooltip.position}
          onClose={tooltip.close}
        />
      )}
    </>
  );
}
