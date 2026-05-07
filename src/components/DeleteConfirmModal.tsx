import { useEffect, useRef } from "react";
import { X, Trash2 } from "lucide-react";

interface DeleteConfirmModalProps {
  songTitle: string;
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isPending?: boolean;
}

export function DeleteConfirmModal({
  songTitle,
  isOpen,
  onConfirm,
  onCancel,
  isPending = false,
}: DeleteConfirmModalProps) {
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      cancelBtnRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onCancel();
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="delete-modal delete-modal--open" role="dialog" aria-modal="true">
      <div className="delete-modal__backdrop" onClick={onCancel} />
      <div className="delete-modal__panel">
        <div className="delete-modal__header">
          <div className="delete-modal__icon">
            <Trash2 size={24} />
          </div>
          <button
            ref={cancelBtnRef}
            className="delete-modal__close"
            onClick={onCancel}
            disabled={isPending}
            aria-label="Chiudi"
          >
            <X size={20} />
          </button>
        </div>
        <div className="delete-modal__body">
          <h2 className="delete-modal__title">Eliminare canzone?</h2>
          <p className="delete-modal__message">
            Stai per eliminare{" "}
            <span className="delete-modal__song-title">"{songTitle}"</span>.
            Questa azione non può essere annullata.
          </p>
        </div>
        <div className="delete-modal__footer">
          <button
            className="delete-modal__btn delete-modal__btn--cancel"
            onClick={onCancel}
            disabled={isPending}
          >
            Annulla
          </button>
          <button
            className="delete-modal__btn delete-modal__btn--delete"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? "Eliminazione..." : "Elimina"}
          </button>
        </div>
      </div>
    </div>
  );
}
