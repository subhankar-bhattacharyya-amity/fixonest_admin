import { toast } from 'sonner';
import { Clock, Copy, ExternalLink, Hourglass, MapPin, Phone, UserCheck, Wrench, XCircle } from 'lucide-react';
import { Avatar } from '@/components/common/avatar/index.js';
import {
  BOOKING_STATUS,
  BookingStatusBadge,
  formatBookingNumber,
  formatMoney,
  formatRelativeVisit,
  formatSlot,
  formatTimeLeft,
  getBookingStart,
  getMapsUrl,
  isPhoneVisible,
  maskPhone,
} from '@/features/providerBooking/index.js';
import BookingActionButtons from './BookingActionButtons.jsx';

const weekday = new Intl.DateTimeFormat('en-IN', { weekday: 'short' });
const month = new Intl.DateTimeFormat('en-IN', { month: 'short' });

// One booking in the list. Clicking anywhere opens the details drawer; the
// buttons on the right run the next step without opening it.
export default function ProviderBookingCard({ booking, now, busy, index, onOpen, onAction }) {
  const start = getBookingStart(booking);
  const isToday = start.toDateString() === now.toDateString();
  const isPending = booking.status === BOOKING_STATUS.PENDING;
  const isClosed = booking.status === BOOKING_STATUS.REJECTED || booking.status === BOOKING_STATUS.CANCELLED;
  const showPhone = isPhoneVisible(booking);
  const timeLeft = isPending && booking.expiresAt ? formatTimeLeft(booking.expiresAt, now) : null;

  const copyId = async (event) => {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(formatBookingNumber(booking));
      toast.success('Booking number copied');
    } catch {
      toast.error("Couldn't copy the booking number");
    }
  };

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen(booking)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen(booking);
        }
      }}
      aria-label={`${booking.service.name} for ${booking.customer.name} - open details`}
      className={`group bg-white rounded-2xl border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer overflow-hidden animate-rise-in focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 ${
        isPending ? 'border-amber-200 ring-1 ring-amber-100' : 'border-slate-100'
      } ${isClosed ? 'opacity-75' : ''}`}
      style={{ animationDelay: `${Math.min(index * 40, 320)}ms` }}
    >
      {isPending && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-2 bg-linear-to-r from-amber-50 to-orange-50 border-b border-amber-100">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
            </span>
            New booking request
          </span>
          {timeLeft && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
              <Hourglass size={12} />
              Respond within {timeLeft}
            </span>
          )}
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center gap-4 p-4 sm:p-5">
        <div className="flex items-start gap-4 min-w-0 flex-1">
          {/* Date tile */}
          <div
            className={`w-16 shrink-0 rounded-2xl py-2.5 flex flex-col items-center justify-center text-center ${
              isToday ? 'bg-teal-500 text-white shadow-md shadow-teal-500/30' : 'bg-teal-50 text-teal-700'
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
              {isToday ? 'Today' : weekday.format(start)}
            </span>
            <span className="text-2xl font-extrabold leading-none mt-0.5">{start.getDate()}</span>
            <span className="text-[11px] font-semibold uppercase mt-0.5 opacity-80">{month.format(start)}</span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-slate-800 truncate">{booking.service.name}</h3>
              <BookingStatusBadge status={booking.status} />
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-400">
              <button
                type="button"
                onClick={copyId}
                title="Copy booking number"
                className="inline-flex items-center gap-1 font-mono font-medium hover:text-teal-600 transition-colors"
              >
                {formatBookingNumber(booking)}
                <Copy size={11} />
              </button>
              <span className="inline-flex items-center gap-1">
                {booking.bookingType === 'worker' ? <UserCheck size={12} /> : <Wrench size={12} />}
                {booking.bookingType === 'worker' ? 'Booked you directly' : 'Service booking'}
              </span>
              <span>{booking.service.category}</span>
            </div>

            <div className="flex items-center gap-2.5 mt-3">
              <Avatar name={booking.customer.name} className="h-8 w-8 text-xs" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-700 truncate">{booking.customer.name}</p>
                <p className="flex items-center gap-1 text-xs text-slate-500">
                  <Phone size={11} className="shrink-0" />
                  {showPhone ? (
                    <a href={`tel:${booking.customer.phone.replace(/\s/g, '')}`} onClick={(event) => event.stopPropagation()} className="hover:text-teal-600">
                      {booking.customer.phone}
                    </a>
                  ) : (
                    <span title="Visible after you accept">{maskPhone(booking.customer.phone)}</span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <Clock size={13} className="shrink-0 text-slate-400" />
                {formatSlot(booking)}
                <span className={`font-semibold ${isClosed ? 'text-slate-400' : 'text-teal-600'}`}>· {formatRelativeVisit(booking, now)}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 min-w-0">
                <MapPin size={13} className="shrink-0 text-slate-400" />
                <span className="truncate">
                  {booking.address.area}, {booking.address.city}
                </span>
                <a
                  href={getMapsUrl(booking.address)}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(event) => event.stopPropagation()}
                  className="inline-flex items-center gap-0.5 font-semibold text-teal-600 hover:text-teal-700 shrink-0"
                >
                  Map <ExternalLink size={11} />
                </a>
              </span>
            </div>

            {isClosed && (booking.rejectionReason || booking.cancellationReason) && (
              <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 rounded-lg px-2.5 py-1">
                <XCircle size={12} />
                {booking.rejectionReason ? `Rejected: ${booking.rejectionReason}` : `Cancelled by customer: ${booking.cancellationReason}`}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between gap-3 pt-4 lg:pt-0 border-t lg:border-0 border-slate-100 shrink-0">
          <div className="lg:text-right">
            <p className={`text-xl font-bold ${isClosed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
              {formatMoney(booking.pricing?.total)}
            </p>
            <p
              className={`text-xs font-medium ${
                booking.paymentStatus === 'paid' ? 'text-emerald-600' : isClosed ? 'text-slate-400' : 'text-amber-600'
              }`}
            >
              Cash · {booking.paymentStatus === 'paid' ? 'Received' : isClosed ? 'Not due' : 'To collect'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <BookingActionButtons booking={booking} busy={busy} onAction={onAction} />
          </div>
        </div>
      </div>
    </article>
  );
}
