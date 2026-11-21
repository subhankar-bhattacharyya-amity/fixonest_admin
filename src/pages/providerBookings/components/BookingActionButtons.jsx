import { Banknote, Check, CheckCircle2, Loader2, Play, X } from 'lucide-react';
import { BOOKING_ACTIONS, BOOKING_STATUS } from '@/features/providerBooking/index.js';

// The next step(s) a provider can take on a booking, used on the cards and in
// the details drawer. Nothing is rendered once the booking is paid or closed.
// `onAction(action, booking)` opens the matching dialog on the page.
export default function BookingActionButtons({ booking, busy = false, onAction, stretch = false }) {
  const base = `inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-wait ${
    stretch ? 'flex-1' : ''
  }`;
  const primary = `${base} text-white shadow-sm`;
  const spinner = <Loader2 size={15} className="animate-spin" />;
  const act = (action) => (event) => {
    event.stopPropagation();
    onAction(action, booking);
  };

  switch (booking.status) {
    case BOOKING_STATUS.PENDING:
      return (
        <>
          <button
            type="button"
            onClick={act(BOOKING_ACTIONS.REJECT)}
            disabled={busy}
            className={`${base} border border-rose-200 text-rose-600 bg-white hover:bg-rose-50`}
          >
            <X size={15} />
            Reject
          </button>
          <button
            type="button"
            onClick={act(BOOKING_ACTIONS.ACCEPT)}
            disabled={busy}
            className={`${primary} bg-teal-500 hover:bg-teal-600 shadow-teal-500/30`}
          >
            {busy ? spinner : <Check size={15} />}
            Accept
          </button>
        </>
      );
    case BOOKING_STATUS.ACCEPTED:
    case BOOKING_STATUS.UPCOMING:
    case 'upcoming':
      return (
        <button
          type="button"
          onClick={act(BOOKING_ACTIONS.START)}
          disabled={busy}
          className={`${primary} bg-teal-500 hover:bg-teal-600 shadow-teal-500/30`}
        >
          {busy ? spinner : <Play size={15} />}
          Start job
        </button>
      );
    case BOOKING_STATUS.IN_PROGRESS:
      return (
        <button
          type="button"
          onClick={act(BOOKING_ACTIONS.COMPLETE)}
          disabled={busy}
          className={`${primary} bg-violet-500 hover:bg-violet-600 shadow-violet-500/30`}
        >
          {busy ? spinner : <CheckCircle2 size={15} />}
          Mark completed
        </button>
      );
    case BOOKING_STATUS.COMPLETED:
    case BOOKING_STATUS.PAID:
    case 'paid':
      return null;
    default:
      return null;
  }
}
