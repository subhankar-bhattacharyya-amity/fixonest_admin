import { useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  EyeOff,
  MessageSquarePlus,
  MessageSquareText,
  Quote,
  RefreshCw,
  Search,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import {
  useServiceReviews,
  SERVICE_REVIEWS_PER_PAGE,
  SERVICE_REVIEW_STATUS,
  SERVICE_REVIEW_SORTS,
  fetchServiceReviews,
  fetchServiceReviewSummary,
  fetchReviewServiceOptions,
  setServiceReviewStatus,
  deleteServiceReview,
} from '@/features/serviceReview/index.js';
import { ConfirmDialog } from '@/components/common/modal/index.js';
import { RatingBreakdown, ReviewFormModal, ReviewList, StarDisplay } from './components/index.js';

const SEARCH_DEBOUNCE_MS = 350;

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: SERVICE_REVIEW_STATUS.VISIBLE, label: 'Visible' },
  { value: SERVICE_REVIEW_STATUS.HIDDEN, label: 'Hidden' },
];

const selectClass = 'input-field bg-white appearance-none pr-9 text-sm text-slate-700 cursor-pointer';

// "Reviews & Ratings Management", for the Super Admin and the Admin (who only
// sees the reviews of their own vertical's services). Every customer review
// and rating of every service: add one on behalf of a registered customer,
// edit, hide/show and delete. A service's rating on the customer site is
// calculated from the visible ones. ?service=<id> opens it filtered to one
// service (the Service editor links here). Filtering and paging are done by
// the server.
export default function ServiceReviewManagementPage() {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const { items, meta, status, summary, services } = useServiceReviews();
  const [now] = useState(() => Date.now());

  const serviceFilter = searchParams.get('service') ?? '';
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState(null);
  const [sort, setSort] = useState('newest');
  const [writtenOnly, setWrittenOnly] = useState(false);

  const [formTarget, setFormTarget] = useState(null); // null | 'new' | review
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingStatusId, setPendingStatusId] = useState(null);

  const isLoading = status === 'loading' || status === 'idle';
  const total = meta?.total ?? items.length;
  const totalPages = Math.max(meta?.totalPages ?? 1, 1);
  const counts = summary.data;
  const summaryReady = summary.status === 'succeeded';
  const hasFilters = Boolean(search || statusFilter || ratingFilter || writtenOnly || serviceFilter);
  const filteredService = services.items.find((service) => service._id === serviceFilter);

  // Debounce typing, and go back to page 1 whenever the query changes.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadList = useCallback(
    () =>
      dispatch(
        fetchServiceReviews({
          page,
          search,
          serviceId: serviceFilter,
          rating: ratingFilter,
          status: statusFilter,
          writtenOnly,
          sort,
        }),
      ),
    [dispatch, page, search, serviceFilter, ratingFilter, statusFilter, writtenOnly, sort],
  );
  const loadSummary = useCallback(() => dispatch(fetchServiceReviewSummary()), [dispatch]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    loadSummary();
    dispatch(fetchReviewServiceOptions());
  }, [loadSummary, dispatch]);

  const refreshAll = useCallback(() => {
    loadList();
    loadSummary();
  }, [loadList, loadSummary]);

  const changeFilter = (setter) => (value) => {
    setter(value);
    setPage(1);
  };
  const setServiceFilter = (serviceId) => {
    const next = new URLSearchParams(searchParams);
    if (serviceId) next.set('service', serviceId);
    else next.delete('service');
    setSearchParams(next, { replace: true });
    setPage(1);
  };
  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setStatusFilter('');
    setRatingFilter(null);
    setWrittenOnly(false);
    setServiceFilter('');
  };

  // One click, no confirmation: the card flips at once and flips back if the
  // request fails.
  const toggleStatus = async (review) => {
    const show = review.status === SERVICE_REVIEW_STATUS.HIDDEN;
    setPendingStatusId(review._id);
    try {
      await dispatch(
        setServiceReviewStatus({
          id: review._id,
          status: show ? SERVICE_REVIEW_STATUS.VISIBLE : SERVICE_REVIEW_STATUS.HIDDEN,
        }),
      ).unwrap();
      toast.success(show ? 'Review is visible again' : 'Review hidden', {
        description: show
          ? 'It shows on the service page and counts toward its rating.'
          : 'It no longer shows on the service page or counts toward its rating.',
      });
      if (statusFilter) loadList();
      loadSummary();
    } catch {
      // Reverted by the slice; the reason was toasted globally by lib/httpClient.js.
    } finally {
      setPendingStatusId(null);
    }
  };

  const closeDelete = useCallback(() => setDeleteTarget(null), []);
  const confirmDelete = async () => {
    const wasLastOnPage = items.length === 1 && page > 1;
    setIsDeleting(true);
    try {
      const result = await dispatch(deleteServiceReview(deleteTarget._id)).unwrap();
      toast.success(result.message);
      setDeleteTarget(null);
      if (wasLastOnPage) {
        setPage(page - 1);
        loadSummary();
      } else {
        refreshAll();
      }
    } catch {
      // Already surfaced globally by lib/httpClient.js's response interceptor.
    } finally {
      setIsDeleting(false);
    }
  };

  const closeForm = useCallback(() => setFormTarget(null), []);
  const afterSave = () => {
    setFormTarget(null);
    refreshAll();
  };

  const rangeStart = total === 0 ? 0 : (page - 1) * SERVICE_REVIEWS_PER_PAGE + 1;
  const rangeEnd = Math.min(page * SERVICE_REVIEWS_PER_PAGE, total);
  const dash = (value) => (summaryReady ? value : '—');
  const writtenShare = counts.total ? Math.round((counts.withComment / counts.total) * 100) : 0;

  const stats = [
    {
      label: 'Total Reviews',
      value: dash(counts.total.toLocaleString('en-IN')),
      hint: summaryReady ? `${counts.visible} visible on the customer site` : 'ratings recorded',
      icon: MessageSquareText,
      tone: 'bg-teal-50 text-teal-600',
    },
    {
      label: 'Average Rating',
      value: summaryReady && counts.visible ? counts.average.toFixed(1) : '—',
      extra: <StarDisplay value={summaryReady ? counts.average : 0} size={13} />,
      icon: Star,
      tone: 'bg-amber-50 text-amber-600',
    },
    {
      label: 'Written Reviews',
      value: dash(counts.withComment.toLocaleString('en-IN')),
      hint: summaryReady ? `${writtenShare}% include text` : 'with a written comment',
      icon: Quote,
      tone: 'bg-sky-50 text-sky-600',
    },
    {
      label: 'Hidden',
      value: dash(counts.hidden.toLocaleString('en-IN')),
      hint: 'not shown, not counted',
      icon: EyeOff,
      tone: 'bg-slate-100 text-slate-500',
    },
  ];

  return (
    <div className="space-y-6 animate-rise-in">
      {/* Header - same layout and classes as VerticalManagementPage's header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Reviews & Ratings Management</h1>
          <p className="text-sm text-slate-500 mt-1">What customers say about each service - and the rating they see.</p>
        </div>
        <button
          type="button"
          onClick={() => setFormTarget('new')}
          className="btn-primary shrink-0 w-full sm:w-auto px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 font-medium bg-linear-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 shadow-md shadow-teal-500/30"
        >
          <MessageSquarePlus size={18} />
          Add Review
        </button>
      </div>

      {/* Stats - same card markup as VerticalManagementPage */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow animate-rise-in"
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-500 mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-800 truncate tabular-nums">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center ${stat.tone}`}>
                <stat.icon size={24} />
              </div>
            </div>
            {stat.extra ? <div className="mt-3">{stat.extra}</div> : <p className="mt-3 text-xs text-slate-400 truncate">{stat.hint}</p>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[20rem_minmax(0,1fr)] xl:items-start">
        <div className="xl:sticky xl:top-28">
          <RatingBreakdown
            summary={counts}
            ready={summaryReady}
            activeRating={ratingFilter}
            onPickRating={changeFilter(setRatingFilter)}
          />
        </div>

        {/* Listing */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden min-w-0">
          <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6 border-b border-slate-100">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-800">All Reviews</h2>
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                {filteredService ? `For ${filteredService.name}` : SERVICE_REVIEW_SORTS.find((option) => option.value === sort)?.label}
              </p>
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

          {/* Toolbar */}
          <div className="space-y-3 px-4 py-3 sm:px-6 border-b border-slate-100 bg-slate-50/40">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1 min-w-0">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search reviews, customers or services"
                  aria-label="Search reviews"
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
              <div className="inline-flex rounded-xl bg-slate-100 p-1" role="group" aria-label="Filter by visibility">
                {STATUS_FILTERS.map((option) => (
                  <button
                    key={option.value || 'all'}
                    type="button"
                    onClick={() => changeFilter(setStatusFilter)(option.value)}
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

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:items-center">
              <FilterSelect label="Filter by service" value={serviceFilter} onChange={setServiceFilter} className="lg:w-72">
                <option value="">All services</option>
                {services.items.map((service) => (
                  <option key={service._id} value={service._id}>
                    {service.name}
                  </option>
                ))}
              </FilterSelect>
              <FilterSelect label="Sort reviews" value={sort} onChange={changeFilter(setSort)} className="lg:w-48">
                {SERVICE_REVIEW_SORTS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </FilterSelect>
              <button
                type="button"
                role="switch"
                aria-checked={writtenOnly}
                onClick={() => changeFilter(setWrittenOnly)(!writtenOnly)}
                className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold ring-1 ring-inset transition-colors ${
                  writtenOnly
                    ? 'bg-sky-50 text-sky-700 ring-sky-500/30 hover:bg-sky-100'
                    : 'bg-white text-slate-500 ring-slate-200 hover:text-slate-700 hover:ring-slate-300'
                }`}
              >
                <Quote size={14} />
                Written only
              </button>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="lg:ml-auto inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                >
                  <X size={14} />
                  Clear filters
                </button>
              )}
            </div>

            {ratingFilter && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-500/25">
                  {ratingFilter}-star reviews
                  <button
                    type="button"
                    onClick={() => changeFilter(setRatingFilter)(null)}
                    aria-label="Remove star filter"
                    className="rounded-full p-0.5 hover:bg-amber-100"
                  >
                    <X size={12} />
                  </button>
                </span>
              </div>
            )}
          </div>

          {!isLoading && items.length === 0 ? (
            hasFilters ? (
              <NoMatches onClear={clearFilters} />
            ) : (
              <EmptyState onAdd={() => setFormTarget('new')} />
            )
          ) : (
            <ReviewList
              reviews={items}
              isLoading={isLoading}
              now={now}
              pendingStatusId={pendingStatusId}
              onEdit={setFormTarget}
              onToggleStatus={toggleStatus}
              onDelete={setDeleteTarget}
              onPickService={(service) => setServiceFilter(service._id)}
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
      </div>

      {formTarget && (
        <ReviewFormModal
          key={formTarget === 'new' ? 'new' : formTarget._id}
          review={formTarget === 'new' ? null : formTarget}
          presetServiceId={formTarget === 'new' ? serviceFilter : ''}
          services={services.items}
          servicesReady={services.status === 'succeeded' || services.status === 'failed'}
          onClose={closeForm}
          onSaved={afterSave}
        />
      )}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete this review?"
          icon={Trash2}
          confirmLabel="Yes, Delete"
          busy={isDeleting}
          onCancel={closeDelete}
          onConfirm={confirmDelete}
          message={
            <>
              The {deleteTarget.rating}-star review by{' '}
              <span className="font-semibold text-slate-700">{deleteTarget.customer?.fullName ?? 'this customer'}</span> for{' '}
              <span className="font-semibold text-slate-700">{deleteTarget.service?.name ?? 'this service'}</span> will be
              removed, and the service’s rating recalculated.
              <span className="mt-2 block text-xs text-slate-400">To take it down only for a while, hide it instead.</span>
            </>
          }
        />
      )}
    </div>
  );
}

function FilterSelect({ label, value, onChange, className = '', children }) {
  return (
    <div className={`relative min-w-0 ${className}`}>
      <select value={value} onChange={(event) => onChange(event.target.value)} aria-label={label} className={selectClass}>
        {children}
      </select>
      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
    </div>
  );
}

function EmptyState({ onAdd }) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-16">
      <div className="relative mb-5">
        <div className="absolute inset-0 rounded-3xl bg-amber-300/30 blur-xl" />
        <div className="relative w-16 h-16 rounded-2xl bg-linear-to-br from-amber-400 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/30">
          <Star size={28} className="fill-white" />
        </div>
      </div>
      <h3 className="text-lg font-bold text-slate-800">No reviews yet</h3>
      <p className="text-sm text-slate-500 mt-1 max-w-sm">
        Record what customers think of your services. Their ratings become the stars customers see on every service.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-6 px-5 py-2.5 rounded-xl flex items-center gap-2 font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors"
      >
        <MessageSquarePlus size={18} />
        Add the first review
      </button>
    </div>
  );
}

function NoMatches({ onClear }) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-14">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
        <Search size={24} />
      </div>
      <h3 className="text-base font-bold text-slate-800">No reviews match these filters</h3>
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
