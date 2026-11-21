import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowUpDown,
  CircleHelp,
  Eye,
  EyeOff,
  Info,
  PauseCircle,
  PlayCircle,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  useFaqs,
  FAQ_SECTIONS,
  FAQ_STATUS,
  getFaqSection,
  fetchFaqs,
  updateFaqStatus,
  deleteFaq,
  reorderFaqs,
} from '@/features/faq/index.js';
import { ConfirmDialog } from '@/components/common/modal/index.js';
import { FaqDetailsModal, FaqFormModal, FaqList, FaqSectionTabs } from './components/index.js';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: FAQ_STATUS.ACTIVE, label: 'Live' },
  { value: FAQ_STATUS.INACTIVE, label: 'Hidden' },
];

const LIST_PANEL_ID = 'faq-section-panel';

// "FAQ Management", Super Admin only. One tab per customer-site section
// (FAQ_SECTIONS); each tab lists that section's FAQs in the order customers
// see them, and the Super Admin adds, views, edits, reorders, shows/hides and
// deletes them there. A section's FAQs are few, so they're all loaded at once
// and searched, filtered and counted in the browser.
export default function FaqManagementPage() {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const section = getFaqSection(searchParams.get('section'));
  const { items, status } = useFaqs(section.category);

  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // null (closed) | { faq: null } (add) | { faq } (edit)
  const [formState, setFormState] = useState(null);
  const [viewTarget, setViewTarget] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isReordering, setIsReordering] = useState(false);

  const isLoading = status === 'loading' || status === 'idle';
  const search = searchInput.trim().toLowerCase();
  const hasFilters = Boolean(search || statusFilter);

  const loadSection = useCallback(() => dispatch(fetchFaqs(section.category)), [dispatch, section.category]);

  useEffect(() => {
    loadSection();
  }, [loadSection]);

  const counts = useMemo(() => {
    const active = items.filter((faq) => faq.status !== FAQ_STATUS.INACTIVE).length;
    return { total: items.length, active, inactive: items.length - active };
  }, [items]);

  const visibleFaqs = useMemo(
    () =>
      items.filter(
        (faq) =>
          (!statusFilter || faq.status === statusFilter) &&
          (!search || faq.question.toLowerCase().includes(search) || faq.answer.toLowerCase().includes(search)),
      ),
    [items, search, statusFilter],
  );

  // A new FAQ goes after every existing one, hidden ones included.
  const nextOrder = items.reduce((max, faq) => Math.max(max, faq.order ?? 0), 0) + 1;

  const changeSection = (sectionId) => {
    setSearchParams(sectionId === FAQ_SECTIONS[0].id ? {} : { section: sectionId }, { replace: true });
    setSearchInput('');
    setStatusFilter('');
  };
  const clearFilters = () => {
    setSearchInput('');
    setStatusFilter('');
  };

  const openCreate = useCallback(() => setFormState({ faq: null }), []);
  const closeForm = useCallback(() => setFormState(null), []);
  const handleSaved = useCallback(() => {
    setFormState(null);
    loadSection();
  }, [loadSection]);

  const closeView = useCallback(() => setViewTarget(null), []);
  const editFromView = (faq) => {
    setViewTarget(null);
    setFormState({ faq });
  };

  const moveFaq = async (faq, step) => {
    const reordered = [...items];
    const from = reordered.findIndex((item) => item._id === faq._id);
    const to = from + step;
    if (from === -1 || to < 0 || to >= reordered.length) return;
    [reordered[from], reordered[to]] = [reordered[to], reordered[from]];
    setIsReordering(true);
    try {
      await dispatch(reorderFaqs({ category: section.category, items: reordered })).unwrap();
    } catch {
      // Toasted globally by lib/httpClient.js; reload so the list shows the
      // order that was actually saved.
      loadSection();
    } finally {
      setIsReordering(false);
    }
  };

  const closeStatus = useCallback(() => setStatusTarget(null), []);
  const confirmStatus = async () => {
    const nextStatus = statusTarget.status === FAQ_STATUS.INACTIVE ? FAQ_STATUS.ACTIVE : FAQ_STATUS.INACTIVE;
    setIsBusy(true);
    try {
      const result = await dispatch(updateFaqStatus({ id: statusTarget._id, status: nextStatus })).unwrap();
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
      const result = await dispatch(deleteFaq({ id: deleteTarget._id, category: section.category })).unwrap();
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
      label: 'Total Questions',
      value: dash(counts.total),
      hint: `on the ${section.label}`,
      icon: CircleHelp,
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
  ];

  const isHiding = statusTarget && statusTarget.status !== FAQ_STATUS.INACTIVE;
  const canReorder = !hasFilters && items.length > 1;
  const viewPosition = viewTarget ? items.findIndex((item) => item._id === viewTarget._id) + 1 : 0;

  return (
    <div className="space-y-6 animate-rise-in">
      {/* Header - same layout and classes as VerticalManagementPage's header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">FAQ Management</h1>
          <p className="text-sm text-slate-500 mt-1">Answer customers' common questions on each page of the website.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          disabled={isLoading}
          className="btn-primary shrink-0 w-full sm:w-auto px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 font-medium bg-linear-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 shadow-md shadow-teal-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={18} />
          Add FAQ
        </button>
      </div>

      {/* Section tabs */}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <FaqSectionTabs
          sections={FAQ_SECTIONS}
          activeId={section.id}
          counts={ready ? { [section.id]: counts.total } : {}}
          onChange={changeSection}
          panelId={LIST_PANEL_ID}
        />
        <p className="flex items-center gap-1.5 text-xs text-slate-400">
          <Info size={13} className="shrink-0" />
          {section.description}
        </p>
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
      <section
        id={LIST_PANEL_ID}
        role="tabpanel"
        aria-labelledby={`faq-tab-${section.id}`}
        className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
      >
        {/* Same header bar as VerticalManagementPage's "All Verticals" */}
        <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6 border-b border-slate-100">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-800">{section.label} FAQs</h2>
            <p className="text-xs text-slate-400 mt-0.5">In the order customers see them</p>
          </div>
          <button
            type="button"
            onClick={loadSection}
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
              placeholder="Search questions and answers"
              aria-label="Search FAQs"
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
                onClick={() => setStatusFilter(option.value)}
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

        {!isLoading && visibleFaqs.length === 0 ? (
          hasFilters ? (
            <NoMatches onClear={clearFilters} />
          ) : (
            <EmptyState sectionLabel={section.label} onAdd={openCreate} />
          )
        ) : (
          <FaqList
            faqs={visibleFaqs}
            isLoading={isLoading}
            canReorder={canReorder}
            reorderBusy={isReordering}
            onMove={moveFaq}
            onView={setViewTarget}
            onEdit={(faq) => setFormState({ faq })}
            onToggleStatus={setStatusTarget}
            onDelete={setDeleteTarget}
          />
        )}

        {ready && items.length > 0 && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-4 py-3.5 sm:px-6 border-t border-slate-100 bg-slate-50/60">
            <p className="text-xs text-slate-500 text-center sm:text-left">
              Showing <span className="font-semibold text-slate-700">{visibleFaqs.length}</span> of{' '}
              <span className="font-semibold text-slate-700">{counts.total}</span> questions ·{' '}
              <span className="font-semibold text-emerald-600">{counts.active}</span> live
            </p>
            {items.length > 1 && (
              <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
                <ArrowUpDown size={13} className="shrink-0" />
                {canReorder ? 'Use the arrows to change the order' : 'Clear the search and filter to reorder'}
              </p>
            )}
          </div>
        )}
      </section>

      {formState && (
        <FaqFormModal
          faq={formState.faq}
          section={section}
          nextOrder={nextOrder}
          onClose={closeForm}
          onSaved={handleSaved}
        />
      )}

      {viewTarget && (
        <FaqDetailsModal
          faq={viewTarget}
          section={section}
          position={viewPosition}
          onClose={closeView}
          onEdit={editFromView}
        />
      )}

      {statusTarget && (
        <ConfirmDialog
          title={isHiding ? 'Hide this FAQ?' : 'Show this FAQ?'}
          icon={isHiding ? PauseCircle : PlayCircle}
          tone={isHiding ? 'warning' : 'success'}
          confirmLabel={isHiding ? 'Yes, Hide' : 'Yes, Show'}
          busy={isBusy}
          onCancel={closeStatus}
          onConfirm={confirmStatus}
          message={
            <>
              <span className="font-semibold text-slate-700">“{statusTarget.question}”</span>{' '}
              {isHiding
                ? `will be removed from the ${section.label} until you show it again.`
                : `will appear on the ${section.label} again.`}
            </>
          }
        />
      )}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete this FAQ?"
          icon={Trash2}
          confirmLabel="Yes, Delete"
          busy={isBusy}
          onCancel={closeDelete}
          onConfirm={confirmDelete}
          message={
            <>
              <span className="font-semibold text-slate-700">“{deleteTarget.question}”</span> will be removed from this
              list and from the {section.label}.
              <span className="mt-2 block text-xs text-slate-400">To take it down only for a while, hide it instead.</span>
            </>
          }
        />
      )}
    </div>
  );
}

function EmptyState({ sectionLabel, onAdd }) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-16">
      <div className="relative mb-5">
        <div className="absolute inset-0 rounded-3xl bg-teal-400/20 blur-xl" />
        <div className="relative w-16 h-16 rounded-2xl bg-linear-to-br from-teal-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-teal-500/30">
          <CircleHelp size={28} />
        </div>
      </div>
      <h3 className="text-lg font-bold text-slate-800">No FAQs on the {sectionLabel} yet</h3>
      <p className="text-sm text-slate-500 mt-1 max-w-sm">
        Until you add one, the FAQ section stays hidden on the website. Start with the question customers ask most.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-6 px-5 py-2.5 rounded-xl flex items-center gap-2 font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors"
      >
        <Plus size={18} />
        Add your first FAQ
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
      <h3 className="text-base font-bold text-slate-800">No FAQs match these filters</h3>
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
