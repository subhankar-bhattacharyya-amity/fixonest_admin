import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Loader2 } from 'lucide-react';

// Colour of the icon badge and confirm button. "danger" (the default) is for
// destructive actions; "warning" for reversible-but-disruptive ones (e.g.
// suspending an account); "success" for restoring something.
const TONES = {
  danger: {
    badge: 'bg-rose-50 text-rose-500 ring-rose-50/50',
    button: 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/30',
  },
  warning: {
    badge: 'bg-amber-50 text-amber-500 ring-amber-50/50',
    button: 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/30',
  },
  success: {
    badge: 'bg-teal-50 text-teal-600 ring-teal-50/50',
    button: 'bg-teal-500 hover:bg-teal-600 shadow-teal-500/30',
  },
};

// Small, centered "are you sure?" dialog for destructive actions. Cancel gets
// focus first, so Enter/Space never confirms by accident. `busy` shows a
// spinner on the confirm button and blocks closing until the request settles.
export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  icon: Icon = AlertTriangle,
  tone = 'danger',
  busy = false,
  onCancel,
  onConfirm,
}) {
  const colors = TONES[tone] ?? TONES.danger;
  const titleId = useId();
  const messageId = useId();
  const cancelRef = useRef(null);

  useEffect(() => {
    cancelRef.current?.focus();
    const handleEscape = (event) => {
      if (event.key === 'Escape' && !busy) onCancel();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [busy, onCancel]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-overlay-in"
      onClick={() => !busy && onCancel()}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-sm bg-white rounded-2xl shadow-2xl shadow-slate-900/20 p-6 text-center animate-dialog-in"
      >
        <div className={`mx-auto mb-4 w-14 h-14 rounded-2xl ring-8 flex items-center justify-center ${colors.badge}`}>
          <Icon size={26} />
        </div>
        <h2 id={titleId} className="text-lg font-bold text-slate-800">
          {title}
        </h2>
        <div id={messageId} className="mt-2 text-sm text-slate-500 leading-relaxed">
          {message}
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`px-4 py-2.5 rounded-xl text-white font-medium shadow-sm transition-colors disabled:opacity-70 flex items-center justify-center gap-2 ${colors.button}`}
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
