import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";

interface DiscardChangesModalProps {
  isOpen: boolean;
  onKeepEditing: () => void;
  onDiscard: () => void;
}

export function DiscardChangesModal({ isOpen, onKeepEditing, onDiscard }: DiscardChangesModalProps) {
  const keepBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) keepBtnRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) onKeepEditing();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onKeepEditing]);

  if (!isOpen) return null;

  return (
    <div
      className="delete-modal delete-modal--open"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="discard-title"
    >
      <div className="delete-modal__backdrop" onClick={onKeepEditing} />
      <div className="delete-modal__panel">
        <div className="delete-modal__header">
          <div className="delete-modal__icon">
            <AlertTriangle size={24} />
          </div>
        </div>
        <div className="delete-modal__body">
          <h2 id="discard-title" className="delete-modal__title">
            Uscire senza salvare?
          </h2>
          <p className="delete-modal__message">
            Le modifiche che hai fatto andranno perse.
          </p>
        </div>
        <div className="delete-modal__footer">
          <button
            ref={keepBtnRef}
            className="delete-modal__btn delete-modal__btn--cancel"
            onClick={onKeepEditing}
          >
            Continua a modificare
          </button>
          <button
            className="delete-modal__btn delete-modal__btn--delete"
            onClick={onDiscard}
          >
            Esci
          </button>
        </div>
      </div>
    </div>
  );
}
