import { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

// Shared dialog shell: portal to document.body (so a blurred/transformed
// ancestor can't trap the fixed overlay - see LogoutConfirmModal.jsx), dimmed
// backdrop, Escape / backdrop click to close, and page scroll locked while
// open. `busy` blocks every way of closing while a request is in flight.
// On phones the dialog rises from the bottom as a sheet; from `sm` up it's centered.
export default function Modal({
  title,
  description,
  icon: Icon,
  iconClassName = 'bg-teal-50 text-teal-600',
  size = 'md',
  busy = false,
  onClose,
  footer,
  children,
}) {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [busy, onClose]);

  useEffect(() => {
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  const widths = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-overlay-in"
      onClick={() => !busy && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        onClick={(event) => event.stopPropagation()}
        className={`w-full ${widths[size]} max-h-[92vh] flex flex-col bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl shadow-slate-900/20 animate-dialog-in`}
      >
        <div className="flex items-start gap-4 px-5 pt-5 pb-4 sm:px-6 sm:pt-6 border-b border-slate-100">
          {Icon && (
            <div className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center ${iconClassName}`}>
              <Icon size={20} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-lg font-bold text-slate-800">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="text-sm text-slate-500 mt-0.5">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="-mr-1.5 -mt-1 p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>

        {footer && (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end border-t border-slate-100 bg-slate-50/80 px-5 py-4 sm:px-6 rounded-b-none sm:rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
