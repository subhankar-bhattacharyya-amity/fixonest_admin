import { Banknote, CalendarCheck, Check, CheckCircle2, Inbox, Play, XCircle } from 'lucide-react';
import { BOOKING_STATUS, formatDateTime } from '../definitions/providerBookings.js';

const FLOW = [
  { status: 'pending', label: 'Requested', icon: Inbox },
  { status: 'accepted', label: 'Accepted', icon: CalendarCheck },
  { status: 'in_progress', label: 'Job started', icon: Play },
  { status: 'completed', label: 'Completed', icon: CheckCircle2 },
];

const isStatusMatch = (a, b) =>
  a === b || (a === 'accepted' && b === 'upcoming') || (a === 'upcoming' && b === 'accepted');

// Requested → Accepted → Job started → Completed → Cash received, with the
// time each step happened (from the booking's activity). A rejected or
// cancelled booking ends in a red step where it stopped. Shared by the
// provider's and the Admin's booking details pages.
export default function BookingStepper({ booking }) {
  // Latest entry per status - a reassigned booking goes back to "pending".
  const timeOf = (status) =>
    [...(booking.activity || [])]
      .reverse()
      .find((entry) => isStatusMatch(entry.status, status))?.at ?? null;
  const isClosed = booking.status === BOOKING_STATUS.REJECTED || booking.status === BOOKING_STATUS.CANCELLED;

  let steps;
  let current;
  if (isClosed) {
    const reached = FLOW.filter((step) => timeOf(step.status));
    steps = [
      ...reached,
      {
        status: booking.status,
        label: booking.status === BOOKING_STATUS.REJECTED ? 'Rejected' : 'Cancelled',
        icon: XCircle,
        terminal: true,
      },
    ];
    current = steps.length - 1;
  } else {
    steps = FLOW;
    current = FLOW.findIndex((step) => isStatusMatch(step.status, booking.status));
    if (current === -1 && (booking.status === 'upcoming' || booking.status === 'accepted')) {
      current = 1;
    }
  }

  return (
    // From sm up every step gets an equal-width grid column, so each connector
    // (centre of one step to the centre of the next) lines up exactly.
    <ol
      className="flex flex-col sm:grid"
      style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
      aria-label="Booking progress"
    >
      {steps.map((step, index) => {
        const isFinished = booking.status === BOOKING_STATUS.COMPLETED || booking.status === BOOKING_STATUS.PAID || booking.status === 'completed' || booking.status === 'paid';
        const done = index < current || (index === current && isFinished);
        const isCurrent = index === current && !done;
        // Steps after the current one haven't happened yet (matters after a reassignment).
        const at = index <= current ? timeOf(step.status) : null;
        const Icon = step.icon;
        const isLast = index === steps.length - 1;

        const circle = step.terminal
          ? 'bg-rose-500 text-white ring-4 ring-rose-100'
          : done
            ? 'bg-teal-500 text-white'
            : isCurrent
              ? 'bg-white text-teal-600 ring-4 ring-teal-100 border-2 border-teal-500'
              : 'bg-slate-100 text-slate-400';

        return (
          <li
            key={step.status}
            aria-current={isCurrent ? 'step' : undefined}
            className={`relative flex sm:flex-col items-start sm:items-center gap-3 sm:gap-0 sm:px-2 ${isLast ? '' : 'pb-6 sm:pb-0'}`}
          >
            {/* Connector: vertical on phones, horizontal from sm up */}
            {!isLast && (
              <>
                <span
                  aria-hidden="true"
                  className={`sm:hidden absolute left-5 top-11 bottom-1 w-0.5 -translate-x-1/2 rounded-full ${done ? 'bg-teal-500' : 'bg-slate-200'}`}
                />
                <span
                  aria-hidden="true"
                  className={`hidden sm:block absolute top-5 -translate-y-1/2 left-[calc(50%+1.75rem)] right-[calc(-50%+1.75rem)] h-0.5 rounded-full ${
                    done ? 'bg-teal-500' : 'bg-slate-200'
                  }`}
                />
              </>
            )}

            <span className={`relative z-10 w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-colors ${circle}`}>
              {done ? <Check size={18} strokeWidth={3} /> : <Icon size={18} />}
              {isCurrent && !step.terminal && (
                <span className="absolute inset-0 rounded-full border-2 border-teal-400 animate-ping opacity-40" aria-hidden="true" />
              )}
            </span>

            <div className="sm:mt-3 sm:text-center min-w-0">
              <p
                className={`text-sm font-semibold ${
                  step.terminal ? 'text-rose-600' : done || isCurrent ? 'text-slate-800' : 'text-slate-400'
                }`}
              >
                {step.label}
              </p>
              <p className={`text-xs mt-0.5 ${isCurrent && !at ? 'text-teal-600 font-medium' : 'text-slate-400'}`}>
                {at ? formatDateTime(at) : isCurrent ? 'Up next' : 'Pending'}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
