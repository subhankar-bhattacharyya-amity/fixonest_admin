import { Link } from 'react-router-dom';
import { ChevronRight, Inbox } from 'lucide-react';
import { BookingStatusBadge, formatMoney, formatSlot, getBookingStart } from '@/features/providerBooking/index.js';

const weekday = new Intl.DateTimeFormat('en-IN', { weekday: 'short' });

// Compact list of bookings for the dashboards: date tile, service, a second
// line (`subline(booking)` - e.g. customer or provider), status and amount.
// Every row links to the booking's details page (`linkFor(booking)`).
export default function BookingMiniList({ bookings, linkFor, subline, now = new Date(), emptyTitle, emptyText, showAmount = true }) {
  if (bookings.length === 0) {
    return (
      <div className="flex flex-col items-center text-center px-4 py-10">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
          <Inbox size={22} />
        </div>
        <p className="text-sm font-semibold text-slate-700">{emptyTitle}</p>
        {emptyText && <p className="text-xs text-slate-400 mt-0.5">{emptyText}</p>}
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-100">
      {bookings.map((booking) => {
        const start = getBookingStart(booking);
        const isToday = start.toDateString() === now.toDateString();
        return (
          <li key={booking.id}>
            <Link
              to={linkFor(booking)}
              className="group flex items-center gap-3 px-4 sm:px-6 py-3.5 hover:bg-teal-50/30 transition-colors focus:outline-none focus-visible:bg-teal-50/50"
            >
              <span
                className={`w-12 shrink-0 rounded-xl py-1.5 text-center ${
                  isToday ? 'bg-teal-500 text-white' : 'bg-teal-50 text-teal-700'
                }`}
              >
                <span className="block text-[9px] font-bold uppercase tracking-wider opacity-80">
                  {isToday ? 'Today' : weekday.format(start)}
                </span>
                <span className="block text-lg font-extrabold leading-none">{start.getDate()}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-800 group-hover:text-teal-700 transition-colors">
                  {booking.service.name}
                </span>
                <span className="block truncate text-xs text-slate-400">
                  {formatSlot(booking)} · {subline(booking)}
                </span>
              </span>
              <span className="hidden sm:flex shrink-0 flex-col items-end gap-1">
                <BookingStatusBadge status={booking.status} />
                {showAmount && <span className="text-xs font-semibold text-slate-600">{formatMoney(booking.pricing?.total)}</span>}
              </span>
              <ChevronRight size={16} className="shrink-0 text-slate-300 group-hover:text-teal-500 transition-colors" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
