import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Inbox,
  MessageSquareText,
  RefreshCw,
  Search,
  TriangleAlert,
  UserCheck,
  X,
} from 'lucide-react';
import {
  useContacts,
  CONTACTS_PER_PAGE,
  CONTACT_PERIODS,
  CONTACT_SENDER_FILTERS,
  fetchContacts,
  isContactInPeriod,
  isContactFromSender,
  matchesContactSearch,
} from '@/features/contact/index.js';
import { useAuth, ROLES } from '@/features/auth/index.js';
import { ContactDetailsModal, ContactTable } from './components/index.js';

// "Contact Management", for the Super Admin, Admins and providers. Visitors
// write these messages on the customer site - through the Contact page (to
// Fixonest) or a worker's "Get In Touch" form (to that provider) - so there
// is nothing to create or edit here: the inbox is browsed, searched, and a
// message opened to read it in full. A provider only gets messages sent to
// them, so their table has no "Sent to" line.
export default function ContactPage() {
  const dispatch = useDispatch();
  const { role } = useAuth();
  const isProvider = role === ROLES.PROVIDER;
  const location = useLocation();
  const navigate = useNavigate();
  const { items, status, fetchedAt } = useContacts();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState('');
  const [sender, setSender] = useState('');
  const [detailsTarget, setDetailsTarget] = useState(null);

  const isLoading = status === 'loading' || status === 'idle';
  const hasFilters = Boolean(search.trim() || period || sender);
  const hasLoaded = fetchedAt !== null;
  const now = fetchedAt ?? 0;

  const loadContacts = useCallback(() => dispatch(fetchContacts()), [dispatch]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const counts = useMemo(
    () => ({
      total: items.length,
      week: items.filter((item) => isContactInPeriod(item, 'week', now)).length,
      registered: items.filter((item) => isContactFromSender(item, 'registered')).length,
    }),
    [items, now],
  );

  const filtered = useMemo(
    () =>
      items.filter(
        (item) =>
          isContactInPeriod(item, period, now) &&
          isContactFromSender(item, sender) &&
          matchesContactSearch(item, search),
      ),
    [items, period, sender, search, now],
  );

  // The list is paged in the browser; clamp in case a refresh shrank it.
  const total = filtered.length;
  const totalPages = Math.max(Math.ceil(total / CONTACTS_PER_PAGE), 1);
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * CONTACTS_PER_PAGE;
  const pageItems = filtered.slice(startIndex, startIndex + CONTACTS_PER_PAGE);
  const rangeStart = total === 0 ? 0 : startIndex + 1;
  const rangeEnd = Math.min(startIndex + CONTACTS_PER_PAGE, total);

  const changeSearch = (value) => {
    setSearch(value);
    setPage(1);
  };
  const changePeriod = (value) => {
    setPeriod(value);
    setPage(1);
  };
  const changeSender = (value) => {
    setSender(value);
    setPage(1);
  };
  const clearFilters = () => {
    setSearch('');
    setPeriod('');
    setSender('');
    setPage(1);
  };

  // A message clicked in the Topbar bell arrives as router state (see
  // NotificationBell.jsx). Closing clears that state, so a page reload doesn't
  // reopen the dialog.
  const routedContact = location.state?.contact ?? null;
  const openContact = detailsTarget ?? routedContact;
  const closeDetails = useCallback(() => {
    setDetailsTarget(null);
    if (routedContact) navigate(location.pathname, { replace: true, state: null });
  }, [routedContact, navigate, location.pathname]);
  const dash = (value) => (hasLoaded ? value : '—');

  const stats = [
    {
      label: 'Total Messages',
      value: dash(counts.total),
      hint: isProvider ? 'sent from your profile page' : 'received on the customer site',
      icon: Inbox,
      tone: 'bg-teal-50 text-teal-600',
    },
    {
      label: 'Last 7 Days',
      value: dash(counts.week),
      hint: 'new messages this week',
      icon: CalendarClock,
      tone: 'bg-sky-50 text-sky-600',
    },
    {
      label: 'From Registered Users',
      value: dash(counts.registered),
      hint: hasLoaded ? `${counts.total - counts.registered} from guests` : 'sent while logged in',
      icon: UserCheck,
      tone: 'bg-emerald-50 text-emerald-600',
    },
  ];

  return (
    <div className="space-y-6 animate-rise-in">
      {/* Header - same layout and classes as VerticalManagementPage's header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Contact Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            {isProvider
              ? 'Read the messages customers sent you from your profile on the Fixonest website.'
              : 'Read the messages customers sent to Fixonest and to providers.'}
          </p>
        </div>
      </div>

      {/* Stats - same card markup and 3-column grid as VerticalManagementPage */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow animate-rise-in"
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-500 mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-800 truncate">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center ${stat.tone}`}>
                <stat.icon size={24} />
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-400">{stat.hint}</p>
          </div>
        ))}
      </div>

      {/* Listing */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Same header bar as VerticalManagementPage's "All Verticals" */}
        <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6 border-b border-slate-100">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-800">All Messages</h2>
            <p className="text-xs text-slate-400 mt-0.5">Newest first</p>
          </div>
          <button
            type="button"
            onClick={loadContacts}
            disabled={isLoading}
            aria-label="Refresh list"
            title="Refresh"
            className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-teal-600 hover:border-teal-200 hover:bg-teal-50 transition-colors disabled:opacity-60"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Toolbar - its own row under the header bar */}
        <div className="flex flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center border-b border-slate-100 bg-slate-50/40">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(event) => changeSearch(event.target.value)}
              placeholder="Search name, email, subject or message"
              aria-label="Search messages"
              className="input-field bg-white pl-10 pr-9"
            />
            {search && (
              <button
                type="button"
                onClick={() => changeSearch('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="inline-flex rounded-xl bg-slate-100 p-1" role="group" aria-label="Filter by sender">
            {CONTACT_SENDER_FILTERS.map((option) => (
              <button
                key={option.value || 'all'}
                type="button"
                onClick={() => changeSender(option.value)}
                aria-pressed={sender === option.value}
                className={`flex-1 sm:flex-none px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  sender === option.value ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="inline-flex rounded-xl bg-slate-100 p-1" role="group" aria-label="Filter by date received">
            {CONTACT_PERIODS.map((option) => (
              <button
                key={option.value || 'all'}
                type="button"
                onClick={() => changePeriod(option.value)}
                aria-pressed={period === option.value}
                className={`flex-1 sm:flex-none px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  period === option.value ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading || pageItems.length > 0 ? (
          <ContactTable
            contacts={pageItems}
            startIndex={startIndex}
            now={now}
            isLoading={isLoading}
            showRecipient={!isProvider}
            onView={setDetailsTarget}
          />
        ) : status === 'failed' && items.length === 0 ? (
          <LoadFailed onRetry={loadContacts} />
        ) : hasFilters ? (
          <NoMatches onClear={clearFilters} />
        ) : (
          <EmptyState />
        )}

        {total > 0 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3.5 sm:px-6 border-t border-slate-100 bg-slate-50/60">
            <p className="text-xs text-slate-500 text-center sm:text-left">
              Showing <span className="font-semibold text-slate-700">{rangeStart}</span>–
              <span className="font-semibold text-slate-700">{rangeEnd}</span> of{' '}
              <span className="font-semibold text-slate-700">{total}</span>
            </p>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage(currentPage - 1)}
                  disabled={currentPage <= 1 || isLoading}
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
                  disabled={currentPage >= totalPages || isLoading}
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

      {openContact && (
        <ContactDetailsModal key={openContact._id} contact={openContact} now={now} onClose={closeDetails} />
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center text-center px-6 py-16">
      <div className="relative mb-5">
        <div className="absolute inset-0 rounded-3xl bg-teal-400/20 blur-xl" />
        <div className="relative w-16 h-16 rounded-2xl bg-linear-to-br from-teal-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-teal-500/30">
          <MessageSquareText size={28} />
        </div>
      </div>
      <h3 className="text-lg font-bold text-slate-800">No messages yet</h3>
      <p className="text-sm text-slate-500 mt-1 max-w-sm">
        Messages appear here as soon as someone submits the contact form on the Fixonest customer site.
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
      <h3 className="text-base font-bold text-slate-800">No messages match these filters</h3>
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
      <h3 className="text-base font-bold text-slate-800">Couldn't load the messages</h3>
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
