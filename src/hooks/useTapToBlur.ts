import { useRef } from "react";

/** Un tocco su un campo già focussato lo fa perdere il focus (onBlurred opzionale per chiudere pannelli). */
export function useTapToBlur(onBlurred?: () => void) {
  const wasFocused = useRef(false);
  return {
    onPointerDown: (e: React.PointerEvent<HTMLInputElement>) => {
      wasFocused.current = document.activeElement === e.currentTarget;
    },
    onClick: (e: React.MouseEvent<HTMLInputElement>) => {
      if (!wasFocused.current) return;
      wasFocused.current = false;
      e.currentTarget.blur();
      onBlurred?.();
    },
  };
}
