import { CalendarCheck, CalendarOff, CalendarPlus, ChevronRight, Info, Undo2 } from 'lucide-react';
import { BOOKING_STATUS_META, formatHour } from '@/features/providerBooking/index.js';
import {
  MIN_NOTICE_DAYS,
  TIME_OFF_STATUS,
  formatMediumDay,
  formatShortMonth,
  formatTimeOffSpan,
  formatWeekdayShort,
  getTimeOffStatus,
  parseDateKey,
  relativeDay,
} from '@/features/providerAvailability/index.js';

// The next few active bookings from today on. A row opens that day's dialog.
export function UpcomingAgenda({ bookings, loading, onOpenDay }) {
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-4 py-4 sm:px-5 border-b border-slate-100">
        <h2 className="text-base font-bold text-slate-800">Coming up</h2>
        <p className="text-xs text-slate-400 mt-0.5">Your next visits and requests</p>
      </div>
      {loading ? (
        <ul className="p-3 space-y-2" aria-busy="true">
          {Array.from({ length: 3 }, (_, index) => (
            <li key={index} className="h-14 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </ul>
      ) : bookings.length === 0 ? (
        <div className="flex flex-col items-center text-center px-6 py-10">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mb-3">
            <CalendarCheck size={22} />
          </div>
          <p className="text-sm font-semibold text-slate-700">Nothing coming up</p>
          <p className="text-xs text-slate-500 mt-1">New bookings will appear here.</p>
        </div>
      ) : (
        <ul className="p-2">
          {bookings.map((booking) => (
            <li key={booking.id}>
              <button
                type="button"
                onClick={() => onOpenDay(booking.scheduledDate)}
                className="group w-full flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-left hover:bg-slate-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60"
              >
                <DateTile date={booking.scheduledDate} tone={booking.status === 'pending' ? 'amber' : 'teal'} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-800 truncate">{booking.service.name}</span>
                  <span className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${BOOKING_STATUS_META[booking.status]?.dot}`} />
                    {formatHour(booking.startHour)} · {BOOKING_STATUS_META[booking.status]?.label}
                  </span>
                </span>
                <ChevronRight size={16} className="text-slate-300 group-hover:text-teal-500 transition-colors" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// The provider's time-off requests: upcoming first, then past ones. Pending
// and approved future requests can be withdrawn.
export function MyTimeOffPanel({ records, today, earliest, loading, onRequest, onOpenDay, onWithdraw }) {
  const upcoming = records
    .filter((record) => record.date >= today && record.status !== TIME_OFF_STATUS.CANCELLED)
    .sort((a, b) => a.date.localeCompare(b.date));
  const past = records
    .filter((record) => !upcoming.includes(record))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 4);

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5 border-b border-slate-100">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-slate-800">My time off</h2>
          <p className="text-xs text-slate-400 mt-0.5">Approved by your admin</p>
        </div>
        <button
          type="button"
          onClick={() => onRequest(earliest)}
          aria-label="Request time off"
          title="Request time off"
          className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-teal-600 hover:border-teal-200 hover:bg-teal-50 transition-colors"
        >
          <CalendarPlus size={16} />
        </button>
      </div>

      <div className="mx-3 mt-3 flex gap-2.5 rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
        <Info size={15} className="shrink-0 mt-px text-teal-600" />
        <p>
          Ask at least <strong>{MIN_NOTICE_DAYS} days</strong> ahead - the earliest you can pick today is{' '}
          <strong>{formatMediumDay(earliest)}</strong>. Days where you've already started a job can't be taken off.
        </p>
      </div>

      {loading ? (
        <ul className="p-3 space-y-2" aria-busy="true">
          {Array.from({ length: 2 }, (_, index) => (
            <li key={index} className="h-14 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </ul>
      ) : records.length === 0 ? (
        <div className="flex flex-col items-center text-center px-6 py-8">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mb-3">
            <CalendarOff size={22} />
          </div>
          <p className="text-sm font-semibold text-slate-700">No time off yet</p>
          <p className="text-xs text-slate-500 mt-1">Need a day off? Send a request and your admin will review it.</p>
          <button
            type="button"
            onClick={() => onRequest(earliest)}
            className="mt-4 px-4 py-2 rounded-xl text-sm font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors"
          >
            Request time off
          </button>
        </div>
      ) : (
        <div className="p-2 pt-3">
          {upcoming.length > 0 && <GroupLabel>Upcoming</GroupLabel>}
          <ul>
            {upcoming.map((record) => (
              <TimeOffRow key={record._id} record={record} onOpenDay={onOpenDay} onWithdraw={onWithdraw} canWithdraw />
            ))}
          </ul>
          {past.length > 0 && <GroupLabel>Earlier</GroupLabel>}
          <ul>
            {past.map((record) => (
              <TimeOffRow key={record._id} record={record} onOpenDay={onOpenDay} />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function GroupLabel({ children }) {
  return <p className="px-2.5 pt-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{children}</p>;
}

function TimeOffRow({ record, onOpenDay, onWithdraw, canWithdraw = false }) {
  const meta = getTimeOffStatus(record.status);
  const withdrawable = canWithdraw && [TIME_OFF_STATUS.PENDING, TIME_OFF_STATUS.APPROVED].includes(record.status);

  return (
    <li className="group flex items-center gap-2 rounded-xl px-2.5 py-2 hover:bg-slate-50 transition-colors">
      <button
        type="button"
        onClick={() => onOpenDay(record.date)}
        className="flex flex-1 min-w-0 items-center gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 rounded-lg"
      >
        <DateTile date={record.date} tone={record.status === TIME_OFF_STATUS.APPROVED ? 'rose' : record.status === TIME_OFF_STATUS.PENDING ? 'amber' : 'slate'} />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-slate-800 truncate">{record.reason}</span>
          <span className="flex flex-wrap items-center gap-x-1.5 text-xs text-slate-500 mt-0.5">
            <span className={`inline-flex items-center gap-1 font-medium ${record.status === TIME_OFF_STATUS.PENDING ? 'text-amber-700' : record.status === TIME_OFF_STATUS.APPROVED ? 'text-rose-600' : 'text-slate-500'}`}>
              <meta.icon size={12} />
              {meta.short}
            </span>
            · {formatTimeOffSpan(record)} · {relativeDay(record.date)}
          </span>
          {record.status === TIME_OFF_STATUS.REJECTED && record.rejectReason && (
            <span className="block text-xs text-slate-400 mt-0.5 truncate" title={record.rejectReason}>
              “{record.rejectReason}”
            </span>
          )}
        </span>
      </button>
      {withdrawable && (
        <button
          type="button"
          onClick={() => onWithdraw(record)}
          aria-label={`Withdraw time off on ${formatMediumDay(record.date)}`}
          title={record.status === TIME_OFF_STATUS.PENDING ? 'Withdraw request' : 'Cancel day off'}
          className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
        >
          <Undo2 size={15} />
        </button>
      )}
    </li>
  );
}

const TILE_TONES = {
  teal: 'bg-teal-50 text-teal-700',
  amber: 'bg-amber-50 text-amber-700',
  rose: 'bg-rose-50 text-rose-600',
  slate: 'bg-slate-100 text-slate-500',
};

export function DateTile({ date, tone = 'teal', size = 'sm' }) {
  const big = size === 'lg';
  return (
    <span
      className={`shrink-0 flex flex-col items-center justify-center rounded-xl ${TILE_TONES[tone]} ${
        big ? 'w-14 h-16' : 'w-11 h-12'
      }`}
    >
      <span className={`${big ? 'text-[11px]' : 'text-[10px]'} font-semibold uppercase leading-none`}>
        {formatShortMonth(date)}
      </span>
      <span className={`${big ? 'text-xl' : 'text-base'} font-bold leading-tight tabular-nums`}>
        {parseDateKey(date).getDate()}
      </span>
      {big && <span className="text-[10px] font-medium opacity-70 leading-none">{formatWeekdayShort(date)}</span>}
    </span>
  );
}
