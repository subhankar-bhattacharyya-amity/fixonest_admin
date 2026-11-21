import { CalendarOff, Clock3, Moon, PartyPopper } from 'lucide-react';
import { BOOKING_STATUS_META, formatHour } from '@/features/providerBooking/index.js';
import { TIME_OFF_STATUS, WEEKDAY_LABELS, formatLongDay } from '@/features/providerAvailability/index.js';

// Chip colours per booking status (the chip also shows the time and service,
// so colour is never the only cue).
const CHIP_TONES = {
  pending: 'bg-amber-50 text-amber-800 ring-amber-200',
  accepted: 'bg-sky-50 text-sky-800 ring-sky-200',
  in_progress: 'bg-violet-50 text-violet-800 ring-violet-200',
  completed: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  paid: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  rejected: 'bg-slate-50 text-slate-400 ring-slate-200 line-through',
  cancelled: 'bg-slate-50 text-slate-400 ring-slate-200 line-through',
};

const MAX_CHIPS = 2;

// Diagonal hatch for an approved day off.
const DAY_OFF_PATTERN = {
  backgroundImage:
    'repeating-linear-gradient(135deg, rgba(244,63,94,0.07) 0px, rgba(244,63,94,0.07) 6px, transparent 6px, transparent 12px)',
};

// The month grid, Monday first. Purely presentational: `days` comes from the
// page with everything a cell needs already worked out (see
// BookingCalendarPage's `dayInfo`). Each cell is a button that opens that
// day's dialog.
export default function MonthCalendar({ grid, getDay, today, onSelect, loading }) {
  return (
    <div className={`transition-opacity duration-200 ${loading ? 'opacity-60' : ''}`}>
      <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/70">
        {WEEKDAY_LABELS.map((label, index) => (
          <div
            key={label}
            className={`py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider ${
              index >= 5 ? 'text-teal-600/80' : 'text-slate-400'
            }`}
          >
            <span className="sm:hidden">{label.charAt(0)}</span>
            <span className="hidden sm:inline">{label}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {grid.map((cell, index) => (
          <DayCell
            key={cell.key}
            cell={cell}
            info={getDay(cell.key)}
            isToday={cell.key === today}
            isPast={cell.key < today}
            lastColumn={index % 7 === 6}
            onSelect={onSelect}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}

function DayCell({ cell, info, isToday, isPast, lastColumn, onSelect, index }) {
  const { bookings, activeBookings, pendingBookings, timeOff, holiday, closed } = info;
  const isDayOff = timeOff?.status === TIME_OFF_STATUS.APPROVED;
  const isOffPending = timeOff?.status === TIME_OFF_STATUS.PENDING;
  const chips = bookings.slice(0, MAX_CHIPS);
  const more = bookings.length - chips.length;

  const background = !cell.inMonth
    ? 'bg-slate-50/60'
    : isDayOff
      ? 'bg-rose-50/40'
      : holiday
        ? 'bg-indigo-50/40'
        : closed
          ? 'bg-slate-50'
          : 'bg-white';

  const summary = [
    formatLongDay(cell.key),
    activeBookings.length ? `${activeBookings.length} booking${activeBookings.length === 1 ? '' : 's'}` : 'no bookings',
    pendingBookings.length ? `${pendingBookings.length} waiting for your answer` : null,
    isDayOff ? 'day off' : isOffPending ? 'time off awaiting approval' : null,
    holiday ? `holiday: ${holiday.title}` : closed ? 'Fixonest closed' : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <button
      type="button"
      onClick={() => onSelect(cell.key)}
      aria-label={summary}
      style={{ ...(isDayOff && cell.inMonth ? DAY_OFF_PATTERN : {}), animationDelay: `${Math.min(index * 8, 280)}ms` }}
      className={`group relative flex flex-col items-stretch gap-1 min-h-19 sm:min-h-28 p-1.5 sm:p-2 text-left border-b border-slate-100 ${
        lastColumn ? '' : 'border-r'
      } ${background} transition-colors hover:bg-teal-50/50 focus:outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500/70 animate-rise-in`}
    >
      {isOffPending && cell.inMonth && (
        <span aria-hidden="true" className="pointer-events-none absolute inset-1 rounded-lg border-2 border-dashed border-amber-300/80" />
      )}

      <span className="flex items-center justify-between gap-1">
        <span
          className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs sm:text-sm font-semibold tabular-nums transition-colors ${
            isToday
              ? 'bg-teal-500 text-white shadow-sm shadow-teal-500/40'
              : !cell.inMonth
                ? 'text-slate-300'
                : isPast
                  ? 'text-slate-400'
                  : 'text-slate-700 group-hover:text-teal-700'
          }`}
        >
          {cell.day}
        </span>
        {pendingBookings.length > 0 && cell.inMonth && (
          <span className="relative flex h-2.5 w-2.5 mr-0.5" title="Waiting for your answer">
            {!isPast && <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-70 animate-ping" />}
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-white" />
          </span>
        )}
      </span>

      {cell.inMonth && (
        <>
          {/* Status tag for the day */}
          {isDayOff ? (
            <DayTag icon={CalendarOff} className="text-rose-600">Day off</DayTag>
          ) : isOffPending ? (
            <DayTag icon={Clock3} className="text-amber-700">Off requested</DayTag>
          ) : holiday ? (
            <DayTag icon={PartyPopper} className="text-indigo-600" title={holiday.title}>
              {holiday.title}
            </DayTag>
          ) : closed ? (
            <DayTag icon={Moon} className="text-slate-400">Closed</DayTag>
          ) : null}

          {/* Bookings - chips from `sm`, dots on phones */}
          <span className="hidden sm:flex flex-col gap-1 min-w-0">
            {chips.map((booking) => (
              <span
                key={booking.id}
                className={`block truncate rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${CHIP_TONES[booking.status]}`}
              >
                <span className="font-semibold tabular-nums">{formatHour(booking.startHour).replace(':00', '')}</span>{' '}
                {booking.service.name}
              </span>
            ))}
            {more > 0 && <span className="px-1.5 text-[11px] font-semibold text-slate-500">+{more} more</span>}
          </span>
          {bookings.length > 0 && (
            <span className="sm:hidden flex flex-wrap gap-1 px-0.5" aria-hidden="true">
              {bookings.slice(0, 4).map((booking) => (
                <span key={booking.id} className={`w-1.5 h-1.5 rounded-full ${BOOKING_STATUS_META[booking.status]?.dot}`} />
              ))}
              {bookings.length > 4 && <span className="text-[9px] leading-none font-bold text-slate-400">+</span>}
            </span>
          )}
        </>
      )}
    </button>
  );
}

function DayTag({ icon: Icon, className, title, children }) {
  return (
    <span title={title} className={`flex items-center gap-1 min-w-0 text-[10px] sm:text-[11px] font-semibold ${className}`}>
      <Icon size={11} className="shrink-0" />
      <span className="truncate hidden sm:inline">{children}</span>
    </span>
  );
}
