import { useEffect } from 'react';
import { createPortal } from 'react-dom';

// Colocated at layouts/topbar/components because only ProfileMenu.jsx uses it.
// Rendered into document.body through a portal: it's opened from inside the
// Topbar <header>, whose backdrop-blur (backdrop-filter) makes that header the
// containing block for `position: fixed` descendants - without the portal the
// "fixed inset-0" overlay would be sized to the header strip, not the screen.
export default function LogoutConfirmModal({ onCancel, onConfirm }) {
  useEffect(() => {
    function handleEscape(event) {
      if (event.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onCancel]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-modal-title"
        onClick={(event) => event.stopPropagation()}
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 sm:p-6 animate-in zoom-in-95 duration-200"
      >
        <h3 id="logout-modal-title" className="text-lg sm:text-xl font-bold text-slate-800 mb-2">Logout Confirmation</h3>
        <p className="text-sm sm:text-base text-slate-500 mb-6">Are you sure you want to log out of your account?</p>
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            autoFocus
            className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors shadow-sm font-medium"
          >
            Yes, Logout
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
