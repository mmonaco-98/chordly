import { useState, useEffect } from "react";
import type { Song } from "../types";

const ROMAN = [
  "", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII",
];

export function toRoman(n: number): string {
  return ROMAN[n] ?? String(n);
}

const storageKey = (id: string) => `capo_${id}`;

export function useCapo(song: Song) {
  const [capo, setCapo] = useState<number>(() => {
    const saved = localStorage.getItem(storageKey(song.id));
    return saved ? parseInt(saved, 10) : 0;
  });

  useEffect(() => {
    if (capo === 0) {
      localStorage.removeItem(storageKey(song.id));
    } else {
      localStorage.setItem(storageKey(song.id), String(capo));
    }
  }, [song.id, capo]);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey(song.id));
    setCapo(saved ? parseInt(saved, 10) : 0);
  }, [song.id]);

  return {
    capo,
    capoUp: () => setCapo((c) => Math.min(c + 1, 12)),
    capoDown: () => setCapo((c) => Math.max(c - 1, 0)),
    resetCapo: () => setCapo(0),
  };
}
