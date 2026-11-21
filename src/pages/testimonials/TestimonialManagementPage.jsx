import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'sonner';
import {
  ArrowLeftRight,
  Eye,
  EyeOff,
  Info,
  MessageSquareQuote,
  PauseCircle,
  PlayCircle,
  Plus,
  RefreshCw,
  Search,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import {
  useTestimonials,
  TESTIMONIAL_STATUS,
  fetchTestimonials,
  updateTestimonialStatus,
  deleteTestimonial,
  reorderTestimonials,
} from '@/features/testimonial/index.js';
import { ConfirmDialog } from '@/components/common/modal/index.js';
import { TestimonialDetailsModal, TestimonialFormModal, TestimonialGrid } from './components/index.js';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: TESTIMONIAL_STATUS.ACTIVE, label: 'Live' },
  { value: TESTIMONIAL_STATUS.INACTIVE, label: 'Hidden' },
];

// `match` decides whether a rating passes the filter.
const RATING_FILTERS = [
  { value: '', label: 'Any rating', match: () => true },
  { value: '5', label: '5★', match: (rating) => rating === 5 },
  { value: '4', label: '4★', match: (rating) => rating === 4 },
  { value: 'low', label: '3★ & below', match: (rating) => rating <= 3 },
];

// "Testimonial Management", Super Admin only. Lists every customer review
// shown in the Home page's "Don't just take our word for it." carousel, as
// cards shaped like the website's, in carousel order. The Super Admin adds,
// views, edits, reorders, shows/hides and deletes them here. There are only
// a handful, so they're all loaded at once and searched, filtered and
// counted in the browser.
export default function TestimonialManagementPage() {
  const dispatch = useDispatch();
  const { items, status } = useTestimonials();

  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');

  // null (closed) | { testimonial: null } (add) | { testimonial } (edit)
  const [formState, setFormState] = useState(null);
  const [viewTarget, setViewTarget] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isReordering, setIsReordering] = useState(false);

  const isLoading = status === 'loading' || status === 'idle';
  const search = searchInput.trim().toLowerCase();
  const hasFilters = Boolean(search || statusFilter || ratingFilter);

  const loadTestimonials = useCallback(() => dispatch(fetchTestimonials()), [dispatch]);

  useEffect(() => {
    loadTestimonials();
  }, [loadTestimonials]);

  const counts = useMemo(() => {
    const active = items.filter((item) => item.status !== TESTIMONIAL_STATUS.INACTIVE);
    const average = items.length ? items.reduce((sum, item) => sum + (item.rating ?? 0), 0) / items.length : 0;
    return { total: items.length, active: active.length, inactive: items.length - active.length, average };
  }, [items]);

  const visibleTestimonials = useMemo(() => {
    const ratingMatch = RATING_FILTERS.find((option) => option.value === ratingFilter)?.match ?? (() => true);
    return items.filter(
      (item) =>
        (!statusFilter || item.status === statusFilter) &&
        ratingMatch(item.rating) &&
        (!search ||
          [item.name, item.quote, item.service, item.location].some((text) => text?.toLowerCase().includes(search))),
    );
  }, [items, search, statusFilter, ratingFilter]);

  // A new testimonial goes after every existing one, hidden ones included.
  const nextOrder = items.reduce((max, item) => Math.max(max, item.order ?? 0), 0) + 1;

  const clearFilters = () => {
    setSearchInput('');
    setStatusFilter('');
    setRatingFilter('');
  };

  const openCreate = useCallback(() => setFormState({ testimonial: null }), []);
  const closeForm = useCallback(() => setFormState(null), []);
  const handleSaved = useCallback(() => {
    setFormState(null);
    loadTestimonials();
  }, [loadTestimonials]);

  const closeView = useCallback(() => setViewTarget(null), []);
  const editFromView = (testimonial) => {
    setViewTarget(null);
    setFormState({ testimonial });
  };

  const moveTestimonial = async (testimonial, step) => {
    const reordered = [...items];
    const from = reordered.findIndex((item) => item._id === testimonial._id);
    const to = from + step;
    if (from === -1 || to < 0 || to >= reordered.length) return;
    [reordered[from], reordered[to]] = [reordered[to], reordered[from]];
    setIsReordering(true);
    try {
      await dispatch(reorderTestimonials({ items: reordered })).unwrap();
    } catch {
      // Toasted globally by lib/httpClient.js; reload so the list shows the
      // order that was actually saved.
      loadTestimonials();
    } finally {
      setIsReordering(false);
    }
  };

  const closeStatus = useCallback(() => setStatusTarget(null), []);
  const confirmStatus = async () => {
    const nextStatus =
      statusTarget.status === TESTIMONIAL_STATUS.INACTIVE ? TESTIMONIAL_STATUS.ACTIVE : TESTIMONIAL_STATUS.INACTIVE;
    setIsBusy(true);
    try {
      const result = await dispatch(updateTestimonialStatus({ id: statusTarget._id, status: nextStatus })).unwrap();
      toast.success(result.message);
      setStatusTarget(null);
    } catch {
      // Already surfaced globally by lib/httpClient.js's response interceptor.
    } finally {
      setIsBusy(false);
    }
  };

  const closeDelete = useCallback(() => setDeleteTarget(null), []);
  const confirmDelete = async () => {
    setIsBusy(true);
    try {
      const result = await dispatch(deleteTestimonial({ id: deleteTarget._id })).unwrap();
      toast.success(result.message);
      setDeleteTarget(null);
    } catch {
      // Already surfaced globally by lib/httpClient.js's response interceptor.
    } finally {
      setIsBusy(false);
    }
  };

  const ready = status === 'succeeded';
  const dash = (value) => (ready ? value : '—');

  const stats = [
    {
      label: 'Total Reviews',
      value: dash(counts.total),
      hint: 'in the Home page carousel',
      icon: MessageSquareQuote,
      tone: 'bg-teal-50 text-teal-600',
    },
    {
      label: 'Live',
      value: dash(counts.active),
      hint: 'visible to customers',
      icon: Eye,
      tone: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Hidden',
      value: dash(counts.inactive),
      hint: 'saved, not shown on the website',
      icon: EyeOff,
      tone: 'bg-slate-100 text-slate-500',
    },
    {
      label: 'Average Rating',
      value: dash(counts.total ? `${counts.average.toFixed(1)} / 5` : '—'),
      hint: 'across every review',
      icon: Star,
      tone: 'bg-amber-50 text-amber-500',
    },
  ];

  const isHiding = statusTarget && statusTarget.status !== TESTIMONIAL_STATUS.INACTIVE;
  const canReorder = !hasFilters && items.length > 1;
  const viewPosition = viewTarget ? items.findIndex((item) => item._id === viewTarget._id) + 1 : 0;

  return (
    <div className="space-y-6 animate-rise-in">
      {/* Header - same layout and classes as VerticalManagementPage's header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Testimonial Management</h1>
          <p className="text-sm text-slate-500 mt-1">Choose the customer reviews shown on the website's Home page.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          disabled={isLoading}
          className="btn-primary shrink-0 w-full sm:w-auto px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 font-medium bg-linear-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 shadow-md shadow-teal-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={18} />
          Add Testimonial
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
                <p className="text-2xl font-bold text-slate-800 truncate">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center ${stat.tone}`}>
                <stat.icon size={24} className={stat.label === 'Average Rating' ? 'fill-amber-400' : ''} />
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
            <h2 className="text-lg font-bold text-slate-800">All Testimonials</h2>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
              <Info size={12} className="shrink-0" />
              In the order customers see them in the Home page carousel
            </p>
          </div>
          <button
            type="button"
            onClick={loadTestimonials}
            disabled={isLoading}
            aria-label="Refresh list"
            title="Refresh"
            className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-teal-600 hover:border-teal-200 hover:bg-teal-50 transition-colors disabled:opacity-60"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Toolbar - its own row under the header bar */}
        <div className="flex flex-col gap-3 px-4 py-3 sm:px-6 xl:flex-row xl:items-center border-b border-slate-100 bg-slate-50/40">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by name, review, service or city"
              aria-label="Search testimonials"
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

          <div className="flex flex-col gap-3 sm:flex-row">
            <SegmentedFilter
              label="Filter by visibility"
              options={STATUS_FILTERS}
              value={statusFilter}
              onChange={setStatusFilter}
            />
            <SegmentedFilter label="Filter by rating" options={RATING_FILTERS} value={ratingFilter} onChange={setRatingFilter} />
          </div>
        </div>

        {!isLoading && visibleTestimonials.length === 0 ? (
          hasFilters ? (
            <NoMatches onClear={clearFilters} />
          ) : (
            <EmptyState onAdd={openCreate} />
          )
        ) : (
          <TestimonialGrid
            testimonials={visibleTestimonials}
            isLoading={isLoading}
            canReorder={canReorder}
            reorderBusy={isReordering}
            onMove={moveTestimonial}
            onView={setViewTarget}
            onEdit={(testimonial) => setFormState({ testimonial })}
            onToggleStatus={setStatusTarget}
            onDelete={setDeleteTarget}
          />
        )}

        {ready && items.length > 0 && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-4 py-3.5 sm:px-6 border-t border-slate-100 bg-slate-50/60">
            <p className="text-xs text-slate-500 text-center sm:text-left">
              Showing <span className="font-semibold text-slate-700">{visibleTestimonials.length}</span> of{' '}
              <span className="font-semibold text-slate-700">{counts.total}</span> reviews ·{' '}
              <span className="font-semibold text-emerald-600">{counts.active}</span> live
            </p>
            {items.length > 1 && (
              <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
                <ArrowLeftRight size={13} className="shrink-0" />
                {canReorder ? 'Use the arrows on a card to change the order' : 'Clear the search and filters to reorder'}
              </p>
            )}
          </div>
        )}
      </section>

      {formState && (
        <TestimonialFormModal
          testimonial={formState.testimonial}
          nextOrder={nextOrder}
          onClose={closeForm}
          onSaved={handleSaved}
        />
      )}

      {viewTarget && (
        <TestimonialDetailsModal
          testimonial={viewTarget}
          position={viewPosition}
          onClose={closeView}
          onEdit={editFromView}
        />
      )}

      {statusTarget && (
        <ConfirmDialog
          title={isHiding ? 'Hide this testimonial?' : 'Show this testimonial?'}
          icon={isHiding ? PauseCircle : PlayCircle}
          tone={isHiding ? 'warning' : 'success'}
          confirmLabel={isHiding ? 'Yes, Hide' : 'Yes, Show'}
          busy={isBusy}
          onCancel={closeStatus}
          onConfirm={confirmStatus}
          message={
            <>
              <span className="font-semibold text-slate-700">{statusTarget.name}</span>’s review{' '}
              {isHiding
                ? 'will be removed from the Home page carousel until you show it again.'
                : 'will appear in the Home page carousel again.'}
            </>
          }
        />
      )}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete this testimonial?"
          icon={Trash2}
          confirmLabel="Yes, Delete"
          busy={isBusy}
          onCancel={closeDelete}
          onConfirm={confirmDelete}
          message={
            <>
              <span className="font-semibold text-slate-700">{deleteTarget.name}</span>’s review will be removed from this
              list and from the Home page.
              <span className="mt-2 block text-xs text-slate-400">To take it down only for a while, hide it instead.</span>
            </>
          }
        />
      )}
    </div>
  );
}

function SegmentedFilter({ label, options, value, onChange }) {
  return (
    <div className="inline-flex rounded-xl bg-slate-100 p-1" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value || 'all'}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={`flex-1 sm:flex-none whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            value === option.value ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function EmptyState({ onAdd }) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-16">
      <div className="relative mb-5">
        <div className="absolute inset-0 rounded-3xl bg-teal-400/20 blur-xl" />
        <div className="relative w-16 h-16 rounded-2xl bg-linear-to-br from-teal-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-teal-500/30">
          <MessageSquareQuote size={28} />
        </div>
      </div>
      <h3 className="text-lg font-bold text-slate-800">No testimonials yet</h3>
      <p className="text-sm text-slate-500 mt-1 max-w-sm">
        Until you add one, the testimonials section stays hidden on the website. Start with your happiest customer’s review.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-6 px-5 py-2.5 rounded-xl flex items-center gap-2 font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors"
      >
        <Plus size={18} />
        Add your first testimonial
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
      <h3 className="text-base font-bold text-slate-800">No testimonials match these filters</h3>
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
