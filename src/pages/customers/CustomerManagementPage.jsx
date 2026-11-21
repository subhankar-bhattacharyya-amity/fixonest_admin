import { useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Search,
  UsersRound,
  X,
} from 'lucide-react';
import {
  useCustomers,
  CUSTOMERS_PER_PAGE,
  fetchCustomers,
  fetchCustomerSummary,
  updateCustomerStatus,
} from '@/features/customer/index.js';
import { ConfirmDialog } from '@/components/common/modal/index.js';
import { CustomerDetailsModal, CustomerTable } from './components/index.js';

const SEARCH_DEBOUNCE_MS = 350;

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
];

// "User Management > Customer Management", Super Admin only. Customers
// register themselves on the customer site, so there is nothing to create or
// edit here: the Super Admin browses them, opens one to see their profile and
// saved addresses, and suspends or reactivates their account.
export default function CustomerManagementPage() {
  const dispatch = useDispatch();
  const { items, meta, status, summary } = useCustomers();

  const [page, setPage] = useState(1);
  // A contact message's "View in Customer Management" link arrives with the
  // sender's email as router state (see ContactDetailsModal.jsx).
  const routedSearch = useLocation().state?.search ?? '';
  const [searchInput, setSearchInput] = useState(routedSearch);
  const [search, setSearch] = useState(routedSearch);
  const [statusFilter, setStatusFilter] = useState('');

  const [detailsTarget, setDetailsTarget] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [isBusy, setIsBusy] = useState(false);

  const isLoading = status === 'loading' || status === 'idle';
  const total = meta?.total ?? items.length;
  const totalPages = Math.max(meta?.totalPages ?? 1, 1);
  const hasFilters = Boolean(search || statusFilter);
  const counts = summary.data;
  const summaryReady = summary.status === 'succeeded';

  // Debounce typing, and go back to page 1 whenever the query changes.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadTable = useCallback(
    () => dispatch(fetchCustomers({ page, perPage: CUSTOMERS_PER_PAGE, search, accountStatus: statusFilter })),
    [dispatch, page, search, statusFilter],
  );
  const loadSummary = useCallback(() => dispatch(fetchCustomerSummary()), [dispatch]);

  useEffect(() => {
    loadTable();
  }, [loadTable]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const refreshAll = useCallback(() => {
    loadTable();
    loadSummary();
  }, [loadTable, loadSummary]);

  const changeStatusFilter = (value) => {
    setStatusFilter(value);
    setPage(1);
  };
  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setStatusFilter('');
    setPage(1);
  };

  const closeDetails = useCallback(() => setDetailsTarget(null), []);
  const closeStatus = useCallback(() => setStatusTarget(null), []);
  const confirmStatus = async () => {
    const nextStatus = statusTarget.accountStatus === 'suspended' ? 'active' : 'suspended';
    setIsBusy(true);
    try {
      const result = await dispatch(updateCustomerStatus({ id: statusTarget._id, accountStatus: nextStatus })).unwrap();
      toast.success(result.message);
      setStatusTarget(null);
      refreshAll();
    } catch {
      // Already surfaced globally by lib/httpClient.js's response interceptor.
    } finally {
      setIsBusy(false);
    }
  };

  const rangeStart = total === 0 ? 0 : (page - 1) * CUSTOMERS_PER_PAGE + 1;
  const rangeEnd = Math.min(page * CUSTOMERS_PER_PAGE, total);
  const dash = (value) => (summaryReady ? value : '—');

  const stats = [
    {
      label: 'Total Customers',
      value: dash(counts.total),
      hint: 'registered on the platform',
      icon: UsersRound,
      tone: 'bg-teal-50 text-teal-600',
    },
    {
      label: 'Active',
      value: dash(counts.active),
      hint: 'can sign in right now',
      icon: BadgeCheck,
      tone: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Suspended',
      value: dash(counts.suspended),
      hint: 'temporarily blocked',
      icon: PauseCircle,
      tone: 'bg-amber-50 text-amber-600',
    },
  ];

  const isSuspending = statusTarget && statusTarget.accountStatus !== 'suspended';

  return (
    <div className="space-y-6 animate-rise-in">
      {/* Header - same layout and classes as VerticalManagementPage's header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Customer Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            View the customers who registered on Fixonest and manage their access.
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
            <h2 className="text-lg font-bold text-slate-800">All Customers</h2>
            <p className="text-xs text-slate-400 mt-0.5">Newest first</p>
          </div>
          <button
            type="button"
            onClick={refreshAll}
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
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by name, email or phone"
              aria-label="Search customers"
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

          <div className="inline-flex rounded-xl bg-slate-100 p-1" role="group" aria-label="Filter by status">
            {STATUS_FILTERS.map((option) => (
              <button
                key={option.value || 'all'}
                type="button"
                onClick={() => changeStatusFilter(option.value)}
                aria-pressed={statusFilter === option.value}
                className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === option.value ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {!isLoading && items.length === 0 ? (
          hasFilters ? (
            <NoMatches onClear={clearFilters} />
          ) : (
            <EmptyState />
          )
        ) : (
          <CustomerTable
            customers={items}
            startIndex={(page - 1) * CUSTOMERS_PER_PAGE}
            isLoading={isLoading}
            onView={setDetailsTarget}
            onToggleStatus={setStatusTarget}
          />
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
                  onClick={() => setPage((current) => current - 1)}
                  disabled={page <= 1 || isLoading}
                  aria-label="Previous page"
                  className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:text-teal-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs font-medium text-slate-600 tabular-nums px-1">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={page >= totalPages || isLoading}
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

      {detailsTarget && (
        <CustomerDetailsModal customer={detailsTarget} onClose={closeDetails} onToggleStatus={setStatusTarget} />
      )}

      {/* Rendered after the details dialog so it stacks on top of it */}
      {statusTarget && (
        <ConfirmDialog
          title={isSuspending ? 'Suspend this customer?' : 'Reactivate this customer?'}
          icon={isSuspending ? PauseCircle : PlayCircle}
          tone={isSuspending ? 'warning' : 'success'}
          confirmLabel={isSuspending ? 'Yes, Suspend' : 'Yes, Reactivate'}
          busy={isBusy}
          onCancel={closeStatus}
          onConfirm={confirmStatus}
          message={
            isSuspending ? (
              <>
                <span className="font-semibold text-slate-700">{statusTarget.fullName}</span> will be signed out
                immediately and can't sign in until reactivated.
              </>
            ) : (
              <>
                <span className="font-semibold text-slate-700">{statusTarget.fullName}</span> will be able to sign in
                again.
              </>
            )
          }
        />
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
          <UsersRound size={28} />
        </div>
      </div>
      <h3 className="text-lg font-bold text-slate-800">No customers yet</h3>
      <p className="text-sm text-slate-500 mt-1 max-w-sm">
        Customers appear here as soon as they register on the Fixonest customer site.
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
      <h3 className="text-base font-bold text-slate-800">No customers match these filters</h3>
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
