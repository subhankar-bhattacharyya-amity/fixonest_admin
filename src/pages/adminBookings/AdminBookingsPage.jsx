import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Hourglass,
  Layers,
  RefreshCw,
  Search,
  TriangleAlert,
  UserX,
  Wallet,
  X,
} from 'lucide-react';
import { useAuth } from '@/features/auth/index.js';
import {
  BOOKING_PERIODS,
  BOOKING_SORTS,
  formatMoney,
  getBookingStart,
  isBookingInPeriod,
  sortBookings,
} from '@/features/providerBooking/index.js';
import {
  ADMIN_BOOKINGS_PER_PAGE,
  ADMIN_BOOKING_TABS,
  DUMMY_PROVIDERS,
  DUMMY_VERTICALS,
  fetchAdminBookings,
  matchesAdminBookingSearch,
  useAdminBookings,
} from '@/features/adminBooking/index.js';
import { getBookingManagementDetailsPath } from '@/routes/constants.js';
import { AdminBookingTable, VerticalOverview } from './components/index.js';

const SEARCH_DEBOUNCE_MS = 300;

// "Booking Management" for the Super Admin (every vertical, with a per-vertical
// overview and a vertical filter) and Admins (their own vertical only).
// DUMMY data (features/adminBooking). The tab lives in the URL (?status=rejected).
export default function AdminBookingsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { items, status, fetchedAt, isSuperAdmin } = useAdminBookings();
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [verticalId, setVerticalId] = useState('');
  const [providerId, setProviderId] = useState('');
  const [category, setCategory] = useState('');
  const [period, setPeriod] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [now] = useState(() => new Date());

  const adminVertical = user?.vertical_id?.display_name || user?.vertical_id?.name;
  const isLoading = (status === 'loading' && !fetchedAt) || (status === 'idle' && !fetchedAt);
  const isRefreshing = status === 'loading' && Boolean(fetchedAt);

  const load = useCallback((force = false) => dispatch(fetchAdminBookings({ force })), [dispatch]);
  useEffect(() => {
    if (!fetchedAt && status !== 'loading') {
      load();
    }
  }, [load, fetchedAt, status]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const tab = ADMIN_BOOKING_TABS.find((item) => item.key === searchParams.get('status')) ?? ADMIN_BOOKING_TABS[0];
  const selectTab = (key) => {
    setSearchParams(key === 'all' ? {} : { status: key }, { replace: true });
    setPage(1);
  };

  // Verticals present in the viewer's bookings, and the providers / categories
  // the filters offer (narrowed to the chosen vertical).
  const verticals = useMemo(() => {
    const ids = new Set(items.map((item) => item.vertical?.id));
    return DUMMY_VERTICALS.filter((vertical) => ids.has(vertical.id));
  }, [items]);
  const providerOptions = DUMMY_PROVIDERS.filter(
    (provider) => verticals.some((vertical) => vertical.id === provider.vertical.id) && (!verticalId || provider.vertical.id === verticalId),
  );
  const categories = useMemo(
    () => [...new Set(items.filter((item) => !verticalId || item.vertical?.id === verticalId).map((item) => item.service.category))].sort(),
    [items, verticalId],
  );

  const changeVertical = (id) => {
    setVerticalId(id);
    setProviderId('');
    setCategory('');
    setPage(1);
  };

  // ---- stats ----
  const stats = useMemo(() => {
    const thisMonth = (date) => date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    const paid = items.filter(
      (item) => (item.status === 'paid' || (item.status === 'completed' && item.paymentStatus === 'paid')) && item.cashPayment && thisMonth(new Date(item.cashPayment.receivedAt)),
    );
    return {
      month: items.filter((item) => thisMonth(getBookingStart(item))).length,
      today: items.filter((item) => getBookingStart(item).toDateString() === now.toDateString() && !['rejected', 'cancelled'].includes(item.status)).length,
      pending: items.filter((item) => item.status === 'pending').length,
      rejected: items.filter((item) => item.status === 'rejected').length,
      revenue: paid.reduce((sum, item) => sum + (item.cashPayment?.amountReceived || 0), 0),
      commission: paid.reduce((sum, item) => sum + (item.pricing?.commission || 0), 0),
    };
  }, [items, now]);

  // ---- list ----
  const counts = useMemo(
    () =>
      Object.fromEntries(
        ADMIN_BOOKING_TABS.map((item) => [
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
            (!verticalId || booking.vertical?.id === verticalId) &&
            (!providerId || booking.provider?.id === providerId) &&
            (!category || booking.service?.category === category) &&
            isBookingInPeriod(booking, period, now) &&
            matchesAdminBookingSearch(booking, search),
        ),
        sort,
      ),
    [items, tab, verticalId, providerId, category, period, search, sort, now],
  );

  const total = filtered.length;
  const totalPages = Math.max(Math.ceil(total / ADMIN_BOOKINGS_PER_PAGE), 1);
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * ADMIN_BOOKINGS_PER_PAGE;
  const pageItems = filtered.slice(startIndex, startIndex + ADMIN_BOOKINGS_PER_PAGE);
  const hasFilters = Boolean(search.trim() || verticalId || providerId || category || period);

  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setVerticalId('');
    setProviderId('');
    setCategory('');
    setPeriod('');
    setPage(1);
  };

  const statCards = [
    {
      key: 'month',
      label: 'Bookings This Month',
      value: stats.month,
      hint: `${stats.today} visit${stats.today === 1 ? '' : 's'} scheduled today`,
      icon: CalendarRange,
      tone: 'bg-teal-50 text-teal-600',
      onClick: () => {
        clearFilters();
        setPeriod('month');
        selectTab('all');
      },
    },
    {
      key: 'pending',
      label: 'Awaiting Provider',
      value: stats.pending,
      hint: 'providers yet to accept',
      icon: Hourglass,
      tone: 'bg-amber-50 text-amber-600',
      onClick: () => selectTab('pending'),
    },
    {
      key: 'rejected',
      label: 'Rejected Bookings',
      value: stats.rejected,
      hint: stats.rejected ? `${stats.rejected} rejected by provider` : 'No rejected bookings',
      icon: UserX,
      tone: 'bg-rose-50 text-rose-500',
      highlight: stats.rejected > 0,
      onClick: () => selectTab('rejected'),
    },
    {
      key: 'revenue',
      label: 'Cash Collected (Month)',
      value: formatMoney(stats.revenue),
      hint: `${formatMoney(stats.commission)} platform commission`,
      icon: Wallet,
      tone: 'bg-emerald-50 text-emerald-600',
      onClick: () => selectTab('paid'),
    },
  ];

  return (
    <div className="space-y-6 animate-rise-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Booking Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            {isSuperAdmin
              ? 'Every booking across all verticals - see the whole picture, step in when a provider rejects, and track the cash.'
              : `Every booking in ${adminVertical || 'your vertical'} - follow each job, step in when a provider rejects, and track the cash.`}
          </p>
        </div>
        {(isSuperAdmin || adminVertical) && (
          <span className="inline-flex w-fit items-center gap-2 rounded-xl bg-teal-50 px-3.5 py-2 text-sm font-semibold text-teal-700">
            <Layers size={16} />
            {isSuperAdmin ? `All verticals · ${verticals.length}` : adminVertical}
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        {statCards.map((stat, index) => (
          <button
            key={stat.key}
            type="button"
            onClick={stat.onClick}
            className={`text-left bg-white rounded-2xl p-5 sm:p-6 shadow-sm border hover:shadow-md hover:-translate-y-0.5 transition-all animate-rise-in focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 ${
              stat.highlight ? 'border-rose-200 ring-1 ring-rose-100' : 'border-slate-100'
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
                    <span className="absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75 animate-ping" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-rose-500 ring-2 ring-white" />
                  </span>
                )}
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-400">{stat.hint}</p>
          </button>
        ))}
      </div>

      {/* Super Admin: one card per vertical - also a vertical filter */}
      {isSuperAdmin && verticals.length > 0 && (
        <VerticalOverview
          verticals={verticals}
          bookings={items}
          now={now}
          selectedId={verticalId}
          onSelect={(id) => changeVertical(id === verticalId ? '' : id)}
        />
      )}

      {/* Listing */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6 border-b border-slate-100">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-800">{tab.key === 'all' ? 'All Bookings' : tab.label}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {total} booking{total === 1 ? '' : 's'} · {BOOKING_SORTS.find((item) => item.value === sort)?.label}
            </p>
          </div>
          <button
            type="button"
            onClick={() => load(true)}
            disabled={isRefreshing}
            aria-label="Refresh bookings"
            title="Refresh"
            className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-teal-600 hover:border-teal-200 hover:bg-teal-50 transition-colors disabled:opacity-60"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>

        {stats.rejected > 0 && tab.key !== 'rejected' && (
          <button
            type="button"
            onClick={() => selectTab('rejected')}
            className="group w-full flex items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-rose-50/70 border-b border-rose-100 text-left text-sm text-rose-700 hover:bg-rose-50 transition-colors"
          >
            <span className="inline-flex items-center gap-2 font-medium">
              <UserX size={16} />
              {stats.rejected} booking{stats.rejected === 1 ? ' was' : 's were'} rejected by providers.
            </span>
            <span className="inline-flex items-center gap-1 font-semibold shrink-0">
              Review <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
            </span>
          </button>
        )}

        {/* Status tabs */}
        <div className="px-4 sm:px-6 pt-4 overflow-x-auto no-scrollbar">
          <div role="tablist" aria-label="Booking status" className="inline-flex gap-1 rounded-xl bg-slate-100 p-1">
            {ADMIN_BOOKING_TABS.map((item) => {
              const active = item.key === tab.key;
              const alert = item.key === 'rejected' && counts.rejected > 0;
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
                      alert ? 'bg-rose-500 text-white' : active ? 'bg-teal-50 text-teal-700' : 'bg-white/70 text-slate-500'
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
        <div className="flex flex-col gap-3 px-4 py-4 sm:px-6 border-b border-slate-100">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search booking ID, customer, phone, service or provider"
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
            <div className={`grid grid-cols-1 gap-3 lg:w-auto ${isSuperAdmin ? 'sm:grid-cols-2 xl:grid-cols-4' : 'sm:grid-cols-3'}`}>
              {isSuperAdmin && (
                <select
                  value={verticalId}
                  onChange={(event) => changeVertical(event.target.value)}
                  aria-label="Filter by vertical"
                  className="input-field bg-white text-sm lg:w-44"
                >
                  <option value="">All verticals</option>
                  {verticals.map((vertical) => (
                    <option key={vertical.id} value={vertical.id}>
                      {vertical.name}
                    </option>
                  ))}
                </select>
              )}
              <select
                value={providerId}
                onChange={(event) => {
                  setProviderId(event.target.value);
                  setPage(1);
                }}
                aria-label="Filter by provider"
                className="input-field bg-white text-sm lg:w-44"
              >
                <option value="">All providers</option>
                {providerOptions.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                  </option>
                ))}
              </select>
              <select
                value={category}
                onChange={(event) => {
                  setCategory(event.target.value);
                  setPage(1);
                }}
                aria-label="Filter by category"
                className="input-field bg-white text-sm lg:w-44"
              >
                <option value="">All categories</option>
                {categories.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value)}
                aria-label="Sort bookings"
                className="input-field bg-white text-sm lg:w-48"
              >
                {BOOKING_SORTS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-xl bg-slate-100 p-1" role="group" aria-label="Filter by visit date">
              {BOOKING_PERIODS.map((option) => (
                <button
                  key={option.value || 'all'}
                  type="button"
                  onClick={() => {
                    setPeriod(option.value);
                    setPage(1);
                  }}
                  aria-pressed={period === option.value}
                  className={`px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    period === option.value ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {hasFilters && (
              <button type="button" onClick={clearFilters} className="text-xs font-semibold text-teal-600 hover:text-teal-700">
                Clear filters
              </button>
            )}
          </div>
        </div>

        {isLoading || pageItems.length > 0 ? (
          <AdminBookingTable
            bookings={pageItems}
            now={now}
            isLoading={isLoading}
            showVertical={isSuperAdmin}
            onOpen={(booking) => navigate(getBookingManagementDetailsPath(role, booking.id))}
          />
        ) : status === 'failed' && items.length === 0 ? (
          <LoadFailed onRetry={load} />
        ) : hasFilters ? (
          <NoMatches onClear={clearFilters} />
        ) : (
          <EmptyState tabLabel={tab.key === 'all' ? null : tab.label} />
        )}

        {total > 0 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3.5 sm:px-6 border-t border-slate-100 bg-slate-50/60">
            <p className="text-xs text-slate-500 text-center sm:text-left">
              Showing <span className="font-semibold text-slate-700">{startIndex + 1}</span>–
              <span className="font-semibold text-slate-700">{Math.min(startIndex + ADMIN_BOOKINGS_PER_PAGE, total)}</span> of{' '}
              <span className="font-semibold text-slate-700">{total}</span>
            </p>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                  aria-label="Previous page"
                  className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:text-teal-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs font-medium text-slate-600 tabular-nums px-1">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  aria-label="Next page"
                  className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:text-teal-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function EmptyState({ tabLabel }) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-16">
      <div className="relative mb-5">
        <div className="absolute inset-0 rounded-3xl bg-teal-400/20 blur-xl" />
        <div className="relative w-16 h-16 rounded-2xl bg-linear-to-br from-teal-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-teal-500/30">
          <CalendarRange size={28} />
        </div>
      </div>
      <h3 className="text-lg font-bold text-slate-800">{tabLabel ? `Nothing in "${tabLabel}"` : 'No bookings yet'}</h3>
      <p className="text-sm text-slate-500 mt-1 max-w-sm">
        {tabLabel ? 'Bookings show up here as soon as they reach this status.' : 'Bookings made in your vertical on the Fixonest website appear here.'}
      </p>
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
      <p className="text-sm text-slate-500 mt-1">Try a different search, or clear the filters.</p>
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
      <h3 className="text-base font-bold text-slate-800">Couldn't load the bookings</h3>
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
