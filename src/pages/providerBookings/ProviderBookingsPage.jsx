import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  BellRing,
  CalendarClock,
  CalendarDays,
  CalendarX2,
  CheckCircle2,
  HandCoins,
  RefreshCw,
  Search,
  TriangleAlert,
  Wallet,
  X,
} from 'lucide-react';
import {
  BOOKING_PERIODS,
  BOOKING_SORTS,
  BOOKING_STATUS,
  BOOKING_TABS,
  fetchProviderBookings,
  formatMoney,
  getBookingStart,
  isBookingInPeriod,
  formatBookingNumber,
  matchesBookingSearch,
  sortBookings,
  useProviderBookings,
} from '@/features/providerBooking/index.js';
import { ROUTES, getProviderBookingDetailsPath } from '@/routes/constants.js';
import { BookingActionDialogs, ProviderBookingCard } from './components/index.js';

const PAGE_SIZE = 8;
const SEARCH_DEBOUNCE_MS = 300;

const EMPTY_COPY = {
  all: { title: 'No bookings yet', text: "When a customer books you or a service you're assigned to, it shows up here." },
  pending: { title: 'No new requests right now', text: "We'll show new booking requests here as soon as a customer books you." },
  accepted: { title: 'Nothing scheduled', text: 'Accepted bookings waiting for their visit day appear here.' },
  in_progress: { title: 'No job in progress', text: 'Start a job from the Upcoming tab when you reach the customer.' },
  completed: { title: 'No cash to collect', text: 'Completed jobs waiting for cash payment appear here.' },
  paid: { title: 'No paid bookings yet', text: 'Bookings appear here once you record the cash you received.' },
  closed: { title: 'Nothing rejected or cancelled', text: 'Bookings you rejected or customers cancelled appear here.' },
};

// "My Bookings" for providers: requests to accept or reject, upcoming visits,
// jobs in progress and cash to record. DUMMY data (features/providerBooking).
// The tab lives in the URL (?status=pending) so it survives a refresh. A card
// opens the booking's own details page (ProviderBookingDetailsPage).
export default function ProviderBookingsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, status, fetchedAt, rollback } = useProviderBookings();
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState('');
  const [sort, setSort] = useState('scheduled');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [dialog, setDialog] = useState(null); // { action, id }
  const [now, setNow] = useState(() => new Date());

  const isLoading = (status === 'loading' && !fetchedAt) || (status === 'idle' && !fetchedAt);
  const isRefreshing = status === 'loading' && Boolean(fetchedAt);

  const load = useCallback(() => dispatch(fetchProviderBookings()), [dispatch]);
  useEffect(() => {
    load();
  }, [load]);

  // Keeps "respond within" and "in 2 hrs" current.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setVisibleCount(PAGE_SIZE);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const tabParam = searchParams.get('status');
  const tab = BOOKING_TABS.find((item) => item.key === tabParam) ?? BOOKING_TABS[0];

  const selectTab = (key) => {
    setSearchParams(key === 'all' ? {} : { status: key }, { replace: true });
    setVisibleCount(PAGE_SIZE);
  };

  // ---- stats ----
  const stats = useMemo(() => {
    const isThisMonth = (iso) => {
      const date = new Date(iso);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    };
    const pending = items.filter((item) => item.status === BOOKING_STATUS.PENDING);
    const today = items.filter(
      (item) =>
        ['accepted', 'upcoming', BOOKING_STATUS.IN_PROGRESS].includes(item.status) &&
        getBookingStart(item).toDateString() === now.toDateString(),
    );
    const completed = items.filter((item) => item.status === BOOKING_STATUS.COMPLETED || item.status === BOOKING_STATUS.PAID);
    const completedThisMonth = completed.filter((item) => isThisMonth(item.completedAt || item.bookingDate || item.createdAt));
    const earnings = completedThisMonth.reduce(
      (sum, item) =>
        sum +
        (item.pricing?.earning ||
          (item.pricing?.total ? item.pricing.total * (1 - (item.commissionRate ? item.commissionRate / 100 : 0.1)) : 0)),
      0,
    );
    return {
      pending: pending.length,
      today: today.length,
      completedCount: completed.length,
      earnings,
    };
  }, [items, now]);

  // ---- list ----
  const counts = useMemo(
    () =>
      Object.fromEntries(
        BOOKING_TABS.map((item) => [
          item.key,
          item.statuses.length
            ? items.filter((booking) => item.statuses.includes(booking.status) || (item.statuses.includes('accepted') && booking.status === 'upcoming')).length
            : items.length,
        ]),
      ),
    [items],
  );

  const filtered = useMemo(
    () =>
      sortBookings(
        items.filter(
          (booking) =>
            (tab.statuses.length === 0 || tab.statuses.includes(booking.status) || (tab.statuses.includes('accepted') && booking.status === 'upcoming')) &&
            isBookingInPeriod(booking, period, now) &&
            matchesBookingSearch(booking, search),
        ),
        sort,
      ),
    [items, tab, period, search, sort, now],
  );
  const visible = filtered.slice(0, visibleCount);
  const hasFilters = Boolean(search.trim() || period);

  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setPeriod('');
  };

  // ---- actions ----
  const dialogBooking = dialog ? items.find((item) => item.id === dialog.id) : null;
  const openAction = (action, booking) => setDialog({ action, id: booking.id });

  const statCards = [
    {
      key: 'pending',
      label: 'New Requests',
      value: stats.pending,
      hint: stats.pending ? 'Waiting for your answer - tap to review' : 'All caught up',
      icon: BellRing,
      tone: 'bg-amber-50 text-amber-600',
      highlight: stats.pending > 0,
      onClick: () => selectTab('pending'),
    },
    {
      key: 'today',
      label: "Today's Visits",
      value: stats.today,
      hint: 'accepted or in progress today',
      icon: CalendarClock,
      tone: 'bg-sky-50 text-sky-600',
      onClick: () => {
        setPeriod('today');
        selectTab('all');
      },
    },
    {
      key: 'completed',
      label: 'Completed Jobs',
      value: stats.completedCount,
      hint: `${stats.completedCount} job${stats.completedCount === 1 ? '' : 's'} completed`,
      icon: CheckCircle2,
      tone: 'bg-emerald-50 text-emerald-600',
      onClick: () => selectTab('completed'),
    },
    {
      key: 'earnings',
      label: 'Earned This Month',
      value: formatMoney(stats.earnings),
      hint: `from completed bookings`,
      icon: Wallet,
      tone: 'bg-teal-50 text-teal-600',
      onClick: () => selectTab('completed'),
    },
  ];

  return (
    <div className="space-y-6 animate-rise-in">
      {/* Header - same layout as the other pages */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">My Bookings</h1>
          <p className="text-sm text-slate-500 mt-1">
            Accept new requests, run your jobs and record the cash you collect.
          </p>
        </div>
        <Link
          to={ROUTES.PROVIDER_BOOKING_CALENDAR}
          className="inline-flex shrink-0 items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:text-teal-700 hover:border-teal-200 hover:bg-teal-50 transition-colors"
        >
          <CalendarDays size={17} />
          Calendar view
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        {statCards.map((stat, index) => (
          <button
            key={stat.key}
            type="button"
            onClick={stat.onClick}
            className={`text-left bg-white rounded-2xl p-5 sm:p-6 shadow-sm border hover:shadow-md hover:-translate-y-0.5 transition-all animate-rise-in focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 ${
              stat.highlight ? 'border-amber-200 ring-1 ring-amber-100' : 'border-slate-100'
            }`}
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-500 mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-800 truncate">{isLoading ? '—' : stat.value}</p>
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
          </button>
        ))}
      </div>

      {/* Listing */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6 border-b border-slate-100">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-800">{tab.key === 'all' ? 'All Bookings' : tab.label}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {filtered.length} booking{filtered.length === 1 ? '' : 's'} · {BOOKING_SORTS.find((item) => item.value === sort)?.label}
            </p>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={isRefreshing}
            aria-label="Refresh bookings"
            title="Refresh"
            className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-teal-600 hover:border-teal-200 hover:bg-teal-50 transition-colors disabled:opacity-60"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Status tabs */}
        <div className="px-4 sm:px-6 pt-4 overflow-x-auto no-scrollbar">
          <div role="tablist" aria-label="Booking status" className="inline-flex gap-1 rounded-xl bg-slate-100 p-1">
            {BOOKING_TABS.map((item) => {
              const active = item.key === tab.key;
              const isNew = item.key === 'pending' && counts.pending > 0;
              return (
                <button
                  key={item.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => selectTab(item.key)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                    active ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {item.label}
                  <span
                    className={`min-w-5 px-1.5 py-0.5 rounded-full text-[11px] font-bold tabular-nums ${
                      isNew ? 'bg-amber-400 text-slate-900' : active ? 'bg-teal-50 text-teal-700' : 'bg-white/70 text-slate-500'
                    }`}
                  >
                    {counts[item.key]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center border-b border-slate-100">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search booking ID, customer, phone or service"
              aria-label="Search bookings"
              className="input-field bg-white pl-10 pr-9"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="inline-flex rounded-xl bg-slate-100 p-1" role="group" aria-label="Filter by visit date">
            {BOOKING_PERIODS.map((option) => (
              <button
                key={option.value || 'all'}
                type="button"
                onClick={() => {
                  setPeriod(option.value);
                  setVisibleCount(PAGE_SIZE);
                }}
                aria-pressed={period === option.value}
                className={`flex-1 sm:flex-none px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  period === option.value ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            aria-label="Sort bookings"
            className="input-field bg-white lg:w-56 text-sm"
          >
            {BOOKING_SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* List */}
        <div className="p-4 sm:p-6 bg-slate-50/40">
          {isLoading ? (
            <div className="space-y-4" aria-busy="true" aria-label="Loading bookings">
              {Array.from({ length: 4 }, (_, index) => (
                <BookingCardSkeleton key={index} />
              ))}
            </div>
          ) : status === 'failed' && items.length === 0 ? (
            <LoadFailed onRetry={load} />
          ) : visible.length === 0 ? (
            hasFilters ? (
              <NoMatches onClear={clearFilters} />
            ) : (
              <EmptyState copy={EMPTY_COPY[tab.key]} />
            )
          ) : (
            <div className="space-y-4">
              {visible.map((booking, index) => (
                <ProviderBookingCard
                  key={booking.id}
                  booking={booking}
                  now={now}
                  index={index}
                  busy={Boolean(rollback[booking.id])}
                  onOpen={(item) => navigate(getProviderBookingDetailsPath(formatBookingNumber(item) || item.id))}
                  onAction={openAction}
                />
              ))}
              {filtered.length > visible.length && (
                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors"
                  >
                    Show more ({filtered.length - visible.length} left)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <BookingActionDialogs
        key={dialog ? `${dialog.action}-${dialog.id}` : 'none'}
        action={dialog?.action}
        booking={dialogBooking}
        onClose={() => setDialog(null)}
      />
    </div>
  );
}

function BookingCardSkeleton() {
  const block = 'animate-pulse rounded bg-slate-100';
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 flex gap-4">
      <div className={`w-16 h-20 rounded-2xl ${block}`} />
      <div className="flex-1 space-y-2.5">
        <div className={`h-4 w-48 ${block}`} />
        <div className={`h-3 w-32 ${block}`} />
        <div className={`h-8 w-56 ${block}`} />
        <div className={`h-3 w-72 max-w-full ${block}`} />
      </div>
      <div className="hidden sm:flex flex-col items-end gap-2">
        <div className={`h-6 w-20 ${block}`} />
        <div className={`h-9 w-28 rounded-xl ${block}`} />
      </div>
    </div>
  );
}

function EmptyState({ copy }) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-16">
      <div className="relative mb-5">
        <div className="absolute inset-0 rounded-3xl bg-teal-400/20 blur-xl" />
        <div className="relative w-16 h-16 rounded-2xl bg-linear-to-br from-teal-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-teal-500/30">
          {copy === EMPTY_COPY.closed ? <CalendarX2 size={28} /> : <CheckCircle2 size={28} />}
        </div>
      </div>
      <h3 className="text-lg font-bold text-slate-800">{copy.title}</h3>
      <p className="text-sm text-slate-500 mt-1 max-w-sm">{copy.text}</p>
    </div>
  );
}

function NoMatches({ onClear }) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-14">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
        <Search size={24} />
      </div>
      <h3 className="text-base font-bold text-slate-800">No bookings match these filters</h3>
      <p className="text-sm text-slate-500 mt-1">Try a different search or date, or clear the filters.</p>
      <button
        type="button"
        onClick={onClear}
        className="mt-5 px-4 py-2 rounded-xl text-sm font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors"
      >
        Clear filters
      </button>
    </div>
  );
}

function LoadFailed({ onRetry }) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-14">
      <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mb-4">
        <TriangleAlert size={24} />
      </div>
      <h3 className="text-base font-bold text-slate-800">Couldn't load your bookings</h3>
      <p className="text-sm text-slate-500 mt-1">Check your connection and try again.</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 px-4 py-2 rounded-xl text-sm font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
