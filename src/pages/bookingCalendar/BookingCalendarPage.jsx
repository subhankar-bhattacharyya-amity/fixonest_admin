import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  BellRing,
  CalendarCheck2,
  CalendarDays,
  CalendarOff,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Clock3,
  List,
  RefreshCw,
  Undo2,
} from 'lucide-react';
import { ConfirmDialog } from '@/components/common/modal/index.js';
import { BOOKING_STATUS, fetchProviderBookings, useProviderBookings } from '@/features/providerBooking/index.js';
import {
  MIN_NOTICE_DAYS,
  TIME_OFF_STATUS,
  activeTimeOffFor,
  buildMonthGrid,
  earliestTimeOffDate,
  fetchBusinessCalendar,
  fetchMyTimeOff,
  findHoliday,
  formatMediumDay,
  formatMonthTitle,
  isClosedWeekday,
  isSpecialWorkingDay,
  todayKey,
  useProviderAvailability,
  withdrawTimeOff,
} from '@/features/providerAvailability/index.js';
import { ROUTES } from '@/routes/constants.js';
import { BookingActionDialogs } from '@/pages/providerBookings/components/index.js';
import { DayDetailsModal, MonthCalendar, MyTimeOffPanel, TimeOffRequestModal, UpcomingAgenda } from './components/index.js';

const CLOSED_STATUSES = [BOOKING_STATUS.REJECTED, BOOKING_STATUS.CANCELLED];
const STARTED_STATUSES = [BOOKING_STATUS.IN_PROGRESS, BOOKING_STATUS.COMPLETED, BOOKING_STATUS.PAID];
const UPCOMING_LIMIT = 5;

const LEGEND = [
  { label: 'New request', className: 'bg-amber-500' },
  { label: 'Upcoming', className: 'bg-sky-500' },
  { label: 'In progress', className: 'bg-violet-500' },
  { label: 'Completed', className: 'bg-emerald-500' },
  { label: 'Day off', className: 'bg-rose-400' },
  { label: 'Off requested', className: 'border-2 border-dashed border-amber-400 bg-transparent' },
  { label: 'Holiday', className: 'bg-indigo-400' },
];

// "?month=2026-11" -> { year, month } (month 0-11); falls back to this month.
const parseMonthParam = (value, now) => {
  const match = /^(\d{4})-(\d{2})$/.exec(value ?? '');
  if (match) {
    const month = Number(match[2]) - 1;
    if (month >= 0 && month <= 11) return { year: Number(match[1]), month };
  }
  return { year: now.getFullYear(), month: now.getMonth() };
};
const toMonthParam = ({ year, month }) => `${year}-${String(month + 1).padStart(2, '0')}`;

// Provider "Booking Calendar": a month view of their bookings (DUMMY data from
// features/providerBooking, the same bookings as My Bookings) and their time
// off (live API, features/providerAvailability). A date opens a dialog with
// that day's bookings - accept / reject or take the next step there, or open
// the booking's details page - and, from today + MIN_NOTICE_DAYS on, a
// "Request time off" button. Time off only blocks the day once an Admin or
// the Super Admin approves it. The month lives in the URL (?month=2026-11).
export default function BookingCalendarPage() {
  const dispatch = useDispatch();
  const { items: bookings, status: bookingStatus, fetchedAt, rollback } = useProviderBookings();
  const { mine, calendar } = useProviderAvailability();
  const [searchParams, setSearchParams] = useSearchParams();

  const [now] = useState(() => new Date());
  const today = todayKey(now);
  const earliest = earliestTimeOffDate(now);
  const view = parseMonthParam(searchParams.get('month'), now);

  const [selectedDate, setSelectedDate] = useState(null);
  const [actionDialog, setActionDialog] = useState(null); // { action, id }
  const [requestDate, setRequestDate] = useState(null);
  const [withdrawTarget, setWithdrawTarget] = useState(null);
  const [withdrawing, setWithdrawing] = useState(false);

  const loadBookings = useCallback(() => dispatch(fetchProviderBookings()), [dispatch]);
  const loadTimeOff = useCallback(() => dispatch(fetchMyTimeOff()), [dispatch]);

  useEffect(() => {
    loadBookings();
    loadTimeOff();
    dispatch(fetchBusinessCalendar());
  }, [dispatch, loadBookings, loadTimeOff]);

  const refresh = () => {
    loadBookings();
    loadTimeOff();
  };

  const isBookingsLoading = bookingStatus === 'loading' && !fetchedAt;
  const isTimeOffLoading = mine.status === 'loading' && !mine.fetchedAt;
  const isRefreshing = bookingStatus === 'loading' || mine.status === 'loading';

  // ---- per-day data ----
  const bookingsByDate = useMemo(() => {
    const map = new Map();
    for (const booking of bookings) {
      if (!map.has(booking.scheduledDate)) map.set(booking.scheduledDate, []);
      map.get(booking.scheduledDate).push(booking);
    }
    for (const list of map.values()) {
      // Active first, then by time.
      list.sort(
        (a, b) =>
          Number(CLOSED_STATUSES.includes(a.status)) - Number(CLOSED_STATUSES.includes(b.status)) || a.startHour - b.startHour,
      );
    }
    return map;
  }, [bookings]);

  const timeOffRecords = mine.items;

  // Everything the calendar cell, the day dialog and the request form need
  // to know about one date.
  const dayInfo = useCallback(
    (date) => {
      const dayBookings = bookingsByDate.get(date) ?? [];
      const special = isSpecialWorkingDay(calendar.holidays, date);
      return {
        today,
        bookings: dayBookings,
        activeBookings: dayBookings.filter((booking) => !CLOSED_STATUSES.includes(booking.status)),
        pendingBookings: dayBookings.filter((booking) => booking.status === BOOKING_STATUS.PENDING),
        // Jobs on this date the provider has already started (or finished).
        startedBookings: dayBookings.filter((booking) => STARTED_STATUSES.includes(booking.status)),
        timeOffRecords: timeOffRecords.filter((record) => record.date === date),
        timeOff: activeTimeOffFor(timeOffRecords, date),
        holiday: findHoliday(calendar.holidays, date),
        closed: !special && isClosedWeekday(calendar.weeklySchedule, date),
      };
    },
    [bookingsByDate, timeOffRecords, calendar.holidays, calendar.weeklySchedule, today],
  );

  // Whether "Request time off" is offered for a date, and why not otherwise.
  const requestStateFor = (date) => {
    if (!date) return { allowed: false };
    const info = dayInfo(date);
    // A day where a job has already started can't be taken off (the backend
    // refuses it too). Other dates are unaffected.
    if (info.startedBookings.length > 0 && !info.timeOff) {
      return { allowed: false, blockedReason: "You've already started a job on this date, so it can't be taken off." };
    }
    if (info.timeOff) return { allowed: false };
    if (info.holiday || info.closed) return { allowed: false };
    if (date < today) return { allowed: false };
    if (date < earliest) {
      return {
        allowed: false,
        blockedReason: `Time off needs ${MIN_NOTICE_DAYS} days' notice - the earliest is ${formatMediumDay(earliest)}.`,
      };
    }
    return { allowed: true };
  };

  const grid = useMemo(() => buildMonthGrid(view.year, view.month), [view.year, view.month]);
  const monthPrefix = toMonthParam(view);

  // ---- stats for the month on screen ----
  const stats = useMemo(() => {
    const inMonth = bookings.filter((booking) => booking.scheduledDate.startsWith(monthPrefix));
    const active = inMonth.filter((booking) => !CLOSED_STATUSES.includes(booking.status));
    const pending = inMonth.filter((booking) => booking.status === BOOKING_STATUS.PENDING);
    const daysOff = timeOffRecords.filter(
      (record) => record.status === TIME_OFF_STATUS.APPROVED && record.date.startsWith(monthPrefix),
    );
    const awaiting = timeOffRecords.filter((record) => record.status === TIME_OFF_STATUS.PENDING && record.date >= today);
    const nextOff = timeOffRecords
      .filter((record) => record.status === TIME_OFF_STATUS.APPROVED && record.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))[0];
    return {
      active: active.length,
      stillToCome: active.filter((booking) => booking.scheduledDate >= today).length,
      pending: pending.length,
      firstPendingDate: pending.map((booking) => booking.scheduledDate).sort()[0] ?? null,
      daysOff: daysOff.length,
      nextOff,
      awaiting: awaiting.length,
      firstAwaitingDate: awaiting.map((record) => record.date).sort()[0] ?? null,
    };
  }, [bookings, timeOffRecords, monthPrefix, today]);

  const upcoming = useMemo(
    () =>
      bookings
        .filter(
          (booking) =>
            booking.scheduledDate >= today &&
            [BOOKING_STATUS.PENDING, BOOKING_STATUS.ACCEPTED, BOOKING_STATUS.UPCOMING, 'upcoming', BOOKING_STATUS.IN_PROGRESS].includes(booking.status),
        )
        .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.startHour - b.startHour)
        .slice(0, UPCOMING_LIMIT),
    [bookings, today],
  );

  // ---- navigation ----
  const goToMonth = (next) => {
    const isCurrent = next.year === now.getFullYear() && next.month === now.getMonth();
    setSearchParams(isCurrent ? {} : { month: toMonthParam(next) }, { replace: true });
  };
  const shiftMonth = (delta) => {
    const date = new Date(view.year, view.month + delta, 1);
    goToMonth({ year: date.getFullYear(), month: date.getMonth() });
  };
  const isCurrentMonth = view.year === now.getFullYear() && view.month === now.getMonth();

  // Open a date's dialog, switching the calendar to its month first.
  const openDay = (date) => {
    const [year, month] = date.split('-').map(Number);
    if (year !== view.year || month - 1 !== view.month) goToMonth({ year, month: month - 1 });
    setSelectedDate(date);
  };

  // ---- actions ----
  const openRequest = (date) => {
    setSelectedDate(null);
    setRequestDate(date && date >= earliest ? date : earliest);
  };

  const confirmWithdraw = async () => {
    setWithdrawing(true);
    try {
      await dispatch(withdrawTimeOff(withdrawTarget._id)).unwrap();
      toast.success(withdrawTarget.status === TIME_OFF_STATUS.PENDING ? 'Request withdrawn' : 'Day off cancelled', {
        description: `You're available for bookings on ${formatMediumDay(withdrawTarget.date)} again.`,
      });
      setWithdrawTarget(null);
    } catch {
      // Already toasted globally by lib/httpClient.js.
    } finally {
      setWithdrawing(false);
    }
  };

  const actionBooking = actionDialog ? bookings.find((item) => item.id === actionDialog.id) : null;
  // The day dialog steps aside while a booking action or withdraw dialog is
  // open (so Escape only closes the top one), and comes back after.
  const showDay = Boolean(selectedDate) && !actionDialog && !withdrawTarget;

  const statCards = [
    {
      key: 'bookings',
      label: 'Bookings This Month',
      value: stats.active,
      hint: `${stats.stillToCome} still to come`,
      icon: CalendarDays,
      tone: 'bg-teal-50 text-teal-600',
    },
    {
      key: 'pending',
      label: 'New Requests',
      value: stats.pending,
      hint: stats.pending ? 'Waiting for your answer - tap to review' : 'All caught up this month',
      icon: BellRing,
      tone: 'bg-amber-50 text-amber-600',
      highlight: stats.pending > 0,
      onClick: stats.firstPendingDate ? () => openDay(stats.firstPendingDate) : undefined,
    },
    {
      key: 'off',
      label: 'Days Off',
      value: stats.daysOff,
      hint: stats.nextOff ? `Next: ${formatMediumDay(stats.nextOff.date)}` : 'Approved this month',
      icon: CalendarCheck2,
      tone: 'bg-rose-50 text-rose-500',
      onClick: stats.nextOff ? () => openDay(stats.nextOff.date) : undefined,
    },
    {
      key: 'awaiting',
      label: 'Awaiting Approval',
      value: stats.awaiting,
      hint: stats.awaiting ? 'Time-off requests with your admin' : 'No requests waiting',
      icon: Clock3,
      tone: 'bg-sky-50 text-sky-600',
      onClick: stats.firstAwaitingDate ? () => openDay(stats.firstAwaitingDate) : undefined,
    },
  ];

  return (
    <div className="space-y-6 animate-rise-in">
      {/* Header - same layout as the other pages */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Booking Calendar</h1>
          <p className="text-sm text-slate-500 mt-1">
            See your bookings day by day, answer new requests and plan your time off.
          </p>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
          <Link
            to={ROUTES.PROVIDER_BOOKINGS}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:text-teal-700 hover:border-teal-200 hover:bg-teal-50 transition-colors"
          >
            <List size={17} />
            List view
          </Link>
          <button
            type="button"
            onClick={() => openRequest(earliest)}
            className="btn-primary shrink-0 w-full sm:w-auto px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 font-medium bg-linear-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 shadow-md shadow-teal-500/30"
          >
            <CalendarPlus size={18} />
            Request Time Off
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        {statCards.map((stat, index) => {
          const Tag = stat.onClick ? 'button' : 'div';
          return (
            <Tag
              key={stat.key}
              type={stat.onClick ? 'button' : undefined}
              onClick={stat.onClick}
              className={`text-left bg-white rounded-2xl p-5 sm:p-6 shadow-sm border transition-all animate-rise-in ${
                stat.onClick ? 'hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60' : 'hover:shadow-md'
              } ${stat.highlight ? 'border-amber-200 ring-1 ring-amber-100' : 'border-slate-100'}`}
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-500 mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-slate-800 truncate">
                    {isBookingsLoading || (stat.key !== 'bookings' && stat.key !== 'pending' && isTimeOffLoading) ? '—' : stat.value}
                  </p>
                </div>
                <div className={`relative w-12 h-12 shrink-0 rounded-xl flex items-center justify-center ${stat.tone}`}>
                  <stat.icon size={24} />
                  {stat.highlight && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 animate-ping" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500 ring-2 ring-white" />
                    </span>
                  )}
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-400">{stat.hint}</p>
            </Tag>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
        {/* Calendar */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 border-b border-slate-100">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-800">{formatMonthTitle(view.year, view.month)}</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {stats.active} booking{stats.active === 1 ? '' : 's'} · {stats.daysOff} day{stats.daysOff === 1 ? '' : 's'} off
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => goToMonth({ year: now.getFullYear(), month: now.getMonth() })}
                disabled={isCurrentMonth}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:text-teal-700 hover:border-teal-200 hover:bg-teal-50 transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-600 disabled:hover:border-slate-200"
              >
                Today
              </button>
              <div className="inline-flex rounded-xl border border-slate-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => shiftMonth(-1)}
                  aria-label="Previous month"
                  className="p-2.5 text-slate-500 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="w-px bg-slate-200" />
                <button
                  type="button"
                  onClick={() => shiftMonth(1)}
                  aria-label="Next month"
                  className="p-2.5 text-slate-500 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
              <button
                type="button"
                onClick={refresh}
                disabled={isRefreshing}
                aria-label="Refresh calendar"
                title="Refresh"
                className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-teal-600 hover:border-teal-200 hover:bg-teal-50 transition-colors disabled:opacity-60"
              >
                <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          <MonthCalendar
            key={monthPrefix}
            grid={grid}
            getDay={dayInfo}
            today={today}
            onSelect={setSelectedDate}
            loading={isBookingsLoading}
          />

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 sm:px-6 bg-slate-50/60 border-t border-slate-100">
            {LEGEND.map((item) => (
              <span key={item.label} className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                <span className={`w-2.5 h-2.5 rounded-full ${item.className}`} />
                {item.label}
              </span>
            ))}
          </div>
        </section>

        {/* Side column */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-6">
          <UpcomingAgenda bookings={upcoming} loading={isBookingsLoading} onOpenDay={openDay} />
          <MyTimeOffPanel
            records={timeOffRecords}
            today={today}
            earliest={earliest}
            loading={isTimeOffLoading}
            onRequest={openRequest}
            onOpenDay={openDay}
            onWithdraw={setWithdrawTarget}
          />
        </div>
      </div>

      {showDay && (
        <DayDetailsModal
          date={selectedDate}
          info={dayInfo(selectedDate)}
          requestState={requestStateFor(selectedDate)}
          rollback={rollback}
          onAction={(action, booking) => setActionDialog({ action, id: booking.id })}
          onRequest={openRequest}
          onWithdraw={setWithdrawTarget}
          onClose={() => setSelectedDate(null)}
        />
      )}

      <BookingActionDialogs
        key={actionDialog ? `${actionDialog.action}-${actionDialog.id}` : 'none'}
        action={actionDialog?.action}
        booking={actionBooking}
        onClose={() => setActionDialog(null)}
      />

      {requestDate && (
        <TimeOffRequestModal
          initialDate={requestDate}
          earliest={earliest}
          getDayInfo={dayInfo}
          onClose={() => setRequestDate(null)}
          onSubmitted={(date) => {
            setRequestDate(null);
            openDay(date);
          }}
        />
      )}

      {withdrawTarget && (
        <ConfirmDialog
          title={withdrawTarget.status === TIME_OFF_STATUS.PENDING ? 'Withdraw this request?' : 'Cancel this day off?'}
          icon={withdrawTarget.status === TIME_OFF_STATUS.PENDING ? Undo2 : CalendarOff}
          tone="warning"
          confirmLabel={withdrawTarget.status === TIME_OFF_STATUS.PENDING ? 'Yes, withdraw' : 'Yes, cancel it'}
          cancelLabel="Keep it"
          busy={withdrawing}
          onCancel={() => !withdrawing && setWithdrawTarget(null)}
          onConfirm={confirmWithdraw}
          message={
            <>
              You'll be available for bookings on{' '}
              <strong className="text-slate-700">{formatMediumDay(withdrawTarget.date)}</strong> again. To take it off
              later you'll need to send a new request.
            </>
          }
        />
      )}
    </div>
  );
}
