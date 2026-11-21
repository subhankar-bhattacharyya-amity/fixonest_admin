import { useState } from 'react';
import { Ban, Loader2 } from 'lucide-react';
import { Modal } from '@/components/common/modal/index.js';
import { ADMIN_CANCEL_REASONS } from '@/features/adminBooking/index.js';

const OTHER = 'other';
const MIN_OTHER_LENGTH = 5;

// Cancel a booking on the Admin's side - a reason is required.
export default function CancelBookingModal({ booking, busy, onConfirm, onClose }) {
  const [choice, setChoice] = useState(ADMIN_CANCEL_REASONS[0]);
  const [otherText, setOtherText] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    const reason = choice === OTHER ? otherText.trim() : choice;
    if (choice === OTHER && reason.length < MIN_OTHER_LENGTH) {
      setError(`Please write at least ${MIN_OTHER_LENGTH} characters`);
      return;
    }
    onConfirm({ reason });
  };

  return (
    <Modal
      title="Cancel this booking?"
      description={`${booking.service.name} for ${booking.customer.name}. The customer and ${booking.provider.name} will be told. This can't be undone.`}
      icon={Ban}
      iconClassName="bg-rose-50 text-rose-500"
      size="sm"
      busy={busy}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Keep booking
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-medium shadow-sm shadow-rose-500/30 transition-colors disabled:opacity-70 inline-flex items-center justify-center gap-2"
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            Cancel booking
          </button>
        </>
      }
    >
      <fieldset>
        <legend className="text-sm font-medium text-gray-700 mb-2">Reason</legend>
        <div className="space-y-2">
          {[...ADMIN_CANCEL_REASONS, OTHER].map((option) => {
            const selected = choice === option;
            return (
              <label
                key={option}
                className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 text-sm cursor-pointer transition-colors ${
                  selected ? 'border-rose-300 bg-rose-50/60 text-slate-800' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="cancel-reason"
                  checked={selected}
                  onChange={() => {
                    setChoice(option);
                    setError('');
                  }}
                  className="accent-rose-500"
                />
                {option === OTHER ? 'Other reason' : option}
              </label>
            );
          })}
        </div>
      </fieldset>

      {choice === OTHER && (
        <div className="mt-3 space-y-1">
          <textarea
            value={otherText}
            onChange={(event) => {
              setOtherText(event.target.value);
              setError('');
            }}
            rows={3}
            maxLength={200}
            autoFocus
            placeholder="Why is this booking being cancelled?"
            aria-label="Other reason"
            aria-invalid={Boolean(error)}
            className={`input-field bg-slate-50 resize-none ${error ? 'border-rose-300' : ''}`}
          />
          {error && (
            <p role="alert" className="text-xs font-medium text-rose-500">
              {error}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
