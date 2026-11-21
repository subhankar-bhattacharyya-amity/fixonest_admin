import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Ban,
  CalendarDays,
  CalendarOff,
  CalendarPlus,
  Clock,
  Clock3,
  Info,
  MapPin,
  Moon,
  PartyPopper,
  Undo2,
} from 'lucide-react';
import { Modal } from '@/components/common/modal/index.js';
import { Avatar } from '@/components/common/avatar/index.js';
import { BOOKING_STATUS, BookingStatusBadge, formatBookingNumber, formatHour, formatMoney } from '@/features/providerBooking/index.js';
import {
  TIME_OFF_STATUS,
  formatLongDay,
  formatMediumDay,
  formatStamp,
  formatTimeOffSpan,
  relativeDay,
} from '@/features/providerAvailability/index.js';
import { getProviderBookingDetailsPath } from '@/routes/constants.js';
import { BookingActionButtons } from '@/pages/providerBookings/components/index.js';

// One day of the Booking Calendar: its bookings (accept / reject / next step
// right here, or open the full details page) and its time-off state, with
// "Request time off" when the date is far enough ahead.
// `info` is the page's dayInfo(date); `requestState` is
// { allowed, earliest, blockedReason } from the page.
export default function DayDetailsModal({ date, info, requestState, rollback, onAction, onRequest, onWithdraw, onClose }) {
  const { bookings, activeBookings, timeOffRecords, timeOff, holiday, closed } = info;
  const latestRejected = !timeOff
    ? [...timeOffRecords].reverse().find((record) => record.status === TIME_OFF_STATUS.REJECTED)
    : null;
  const pendingCount = bookings.filter((booking) => booking.status === BOOKING_STATUS.PENDING).length;

  const description = [
    relativeDay(date),
    activeBookings.length ? `${activeBookings.length} booking${activeBookings.length === 1 ? '' : 's'}` : 'No bookings',
    pendingCount ? `${pendingCount} need${pendingCount === 1 ? 's' : ''} your answer` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Modal
      title={formatLongDay(date)}
      description={description}
      icon={CalendarDays}
      size="lg"
      onClose={onClose}
      footer={
        <>
          {requestState.allowed ? null : requestState.blockedReason ? (
            <p className="sm:mr-auto self-center text-xs text-slate-500 inline-flex items-center gap-1.5">
              <Info size={14} className="shrink-0 text-slate-400" />
              {requestState.blockedReason}
            </p>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
          {requestState.allowed && (
            <button
              type="button"
              onClick={() => onRequest(date)}
              className="px-4 py-2.5 rounded-xl bg-linear-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-medium shadow-md shadow-teal-500/30 transition-colors inline-flex items-center justify-center gap-2"
            >
              <CalendarPlus size={17} />
              Request time off
            </button>
          )}
        </>
      }
    >
      <div className="space-y-5">
        {/* Day state */}
        {timeOff?.status === TIME_OFF_STATUS.APPROVED && (
          <Banner tone="rose" icon={CalendarOff} title="You're off this day">
            {formatTimeOffSpan(timeOff)} · {timeOff.reason}
            {timeOff.reviewedBy?.fullName && (
              <span className="block mt-0.5 text-rose-600/80">
                Approved by {timeOff.reviewedBy.fullName}
                {timeOff.reviewedAt ? ` on ${formatStamp(timeOff.reviewedAt)}` : ''}
              </span>
            )}
            {date > info.today && (
              <WithdrawButton onClick={() => onWithdraw(timeOff)} label="Cancel day off" />
            )}
          </Banner>
        )}
        {timeOff?.status === TIME_OFF_STATUS.PENDING && (
          <Banner tone="amber" icon={Clock3} title="Time off requested - waiting for approval">
            {formatTimeOffSpan(timeOff)} · {timeOff.reason}
            <span className="block mt-0.5 text-amber-700/80">
              Sent {formatStamp(timeOff.createdAt)}. You can still get bookings until an admin approves it.
            </span>
            <WithdrawButton onClick={() => onWithdraw(timeOff)} label="Withdraw request" />
          </Banner>
        )}
        {latestRejected && (
          <Banner tone="slate" icon={Ban} title="Your time-off request wasn't approved">
            {latestRejected.rejectReason || 'No reason given.'}
          </Banner>
        )}
        {holiday && (
          <Banner tone="indigo" icon={PartyPopper} title={holiday.title}>
            Fixonest is closed for this holiday - no bookings are taken.
          </Banner>
        )}
        {!holiday && closed && (
          <Banner tone="slate" icon={Moon} title="Fixonest is closed on this weekday">
            No bookings are taken on this day of the week.
          </Banner>
        )}

        {/* Bookings */}
        <div>
          <div className="flex items-center justify-between gap-3 mb-3">
            <h3 className="text-sm font-bold text-slate-800">Bookings</h3>
            {bookings.length > 0 && (
              <span className="text-xs text-slate-400">
                {bookings.length} total{bookings.length !== activeBookings.length ? `, ${bookings.length - activeBookings.length} closed` : ''}
              </span>
            )}
          </div>

          {bookings.length === 0 ? (
            <div className="flex flex-col items-center text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-8">
              <div className="w-12 h-12 rounded-2xl bg-white text-slate-400 flex items-center justify-center shadow-sm mb-3">
                <CalendarDays size={22} />
              </div>
              <p className="text-sm font-semibold text-slate-700">Nothing booked on {formatMediumDay(date)}</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                New bookings for this day will show up here and on the calendar.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {bookings.map((booking, index) => (
                <DayBookingRow
                  key={booking.id}
                  booking={booking}
                  index={index}
                  busy={Boolean(rollback[booking.id])}
                  onAction={onAction}
                  onNavigate={onClose}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}

function DayBookingRow({ booking, index, busy, onAction, onNavigate }) {
  const isPending = booking.status === BOOKING_STATUS.PENDING;
  const isClosed = booking.status === BOOKING_STATUS.REJECTED || booking.status === BOOKING_STATUS.CANCELLED;

  return (
    <li
      className={`rounded-2xl border bg-white overflow-hidden animate-rise-in ${
        isPending ? 'border-amber-200 ring-1 ring-amber-100' : 'border-slate-100'
      } ${isClosed ? 'opacity-70' : ''}`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex gap-3 sm:gap-4 p-3.5 sm:p-4">
        <div
          className={`w-16 shrink-0 rounded-xl px-2 py-2 text-center ${
            isPending ? 'bg-amber-50 text-amber-800' : 'bg-teal-50 text-teal-800'
          }`}
        >
          <Clock size={14} className="mx-auto mb-1 opacity-70" />
          <p className="text-xs font-bold leading-tight">{formatHour(booking.startHour)}</p>
          <p className="text-[10px] font-medium opacity-70 mt-0.5">
            {booking.hours} hr{booking.hours > 1 ? 's' : ''}
          </p>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-slate-800 truncate">{booking.service.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                <span className="font-mono font-medium text-slate-500">{formatBookingNumber(booking)}</span> · {booking.service.category}
                {booking.bookingType === 'worker' ? ' · Booked you directly' : ''}
              </p>
            </div>
            <BookingStatusBadge status={booking.status} />
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <Avatar name={booking.customer.name} className="h-5 w-5 text-[9px]" />
              {booking.customer.name}
            </span>
            <span className="inline-flex items-center gap-1 min-w-0">
              <MapPin size={12} className="text-slate-400 shrink-0" />
              <span className="truncate">{booking.address.area}</span>
            </span>
            <span className="font-semibold text-slate-800 tabular-nums">{formatMoney(booking.pricing.total)}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-slate-100 bg-slate-50/60 px-3.5 py-2.5 sm:px-4">
        <Link
          to={getProviderBookingDetailsPath(formatBookingNumber(booking) || booking.id)}
          onClick={onNavigate}
          className="inline-flex items-center justify-center gap-1 text-sm font-semibold text-teal-700 hover:text-teal-800 px-2 py-1.5 rounded-lg hover:bg-teal-50 transition-colors"
        >
          View full details
          <ArrowUpRight size={15} />
        </Link>
        <div className="flex gap-2">
          <BookingActionButtons booking={booking} busy={busy} onAction={onAction} stretch />
        </div>
      </div>
    </li>
  );
}

const BANNER_TONES = {
  rose: 'bg-rose-50 border-rose-100 text-rose-800 [&_svg.banner-icon]:text-rose-500',
  amber: 'bg-amber-50 border-amber-100 text-amber-900 [&_svg.banner-icon]:text-amber-500',
  indigo: 'bg-indigo-50 border-indigo-100 text-indigo-900 [&_svg.banner-icon]:text-indigo-500',
  slate: 'bg-slate-50 border-slate-200 text-slate-700 [&_svg.banner-icon]:text-slate-400',
};

function Banner({ tone, icon: Icon, title, children }) {
  return (
    <div className={`flex gap-3 rounded-2xl border px-4 py-3.5 ${BANNER_TONES[tone]}`}>
      <Icon size={20} className="banner-icon shrink-0 mt-0.5" />
      <div className="min-w-0 text-sm">
        <p className="font-semibold">{title}</p>
        <div className="mt-0.5 text-[13px] opacity-90">{children}</div>
      </div>
    </div>
  );
}

function WithdrawButton({ onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-white hover:text-slate-900 transition-colors"
    >
      <Undo2 size={13} />
      {label}
    </button>
  );
}
