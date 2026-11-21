import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Clock3, Layers, Plus, RefreshCw, Trash2, Sparkles } from 'lucide-react';
import { useVerticals, VERTICALS_PER_PAGE, fetchVerticals, deleteVertical } from '@/features/vertical/index.js';
import { ConfirmDialog } from '@/components/common/modal/index.js';
import { formatDateTime } from '@/utils/formatDate.js';
import { VerticalFormModal, VerticalTable } from './components/index.js';

// Super Admin's Vertical Management: paginated listing plus add / edit
// (one shared modal) and delete (confirmation dialog), all through the
// vertical feature's thunks.
export default function VerticalManagementPage() {
  const dispatch = useDispatch();
  const { items, meta, status } = useVerticals();
  const [page, setPage] = useState(1);
  // null (closed) | { id: null } (add) | { id } (edit)
  const [formState, setFormState] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isLoading = status === 'loading' || status === 'idle';
  const total = meta?.total ?? items.length;
  const totalPages = Math.max(meta?.totalPages ?? 1, 1);

  const loadPage = useCallback(
    (targetPage) => dispatch(fetchVerticals({ page: targetPage, perPage: VERTICALS_PER_PAGE })),
    [dispatch],
  );

  useEffect(() => {
    loadPage(page);
  }, [loadPage, page]);

  const lastUpdated = useMemo(() => {
    const times = items.map((item) => new Date(item.updatedAt).getTime()).filter(Number.isFinite);
    return times.length ? formatDateTime(Math.max(...times)) : null;
  }, [items]);

  const newest = useMemo(
    () =>
      items.reduce(
        (latest, item) => (!latest || new Date(item.createdAt) > new Date(latest.createdAt) ? item : latest),
        null,
      ),
    [items],
  );

  const closeForm = useCallback(() => setFormState(null), []);
  const handleSaved = useCallback(() => {
    setFormState(null);
    loadPage(page);
  }, [loadPage, page]);

  const closeDelete = useCallback(() => setDeleteTarget(null), []);
  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await dispatch(deleteVertical(deleteTarget._id)).unwrap();
      toast.success(result.message);
      setDeleteTarget(null);
      // Removing the last row of a later page steps back one page.
      if (items.length === 1 && page > 1) setPage(page - 1);
      else loadPage(page);
    } catch {
      // Already surfaced globally by lib/httpClient.js's response interceptor.
    } finally {
      setIsDeleting(false);
    }
  };

  const rangeStart = total === 0 ? 0 : (page - 1) * VERTICALS_PER_PAGE + 1;
  const rangeEnd = Math.min(page * VERTICALS_PER_PAGE, total);

  const stats = [
    {
      label: 'Total Verticals',
      value: isLoading && !items.length ? '—' : total,
      hint: 'across all pages',
      icon: Layers,
      tone: 'bg-teal-50 text-teal-600',
    },
    {
      label: 'Newest Vertical',
      value: newest ? newest.display_name || newest.name : '—',
      hint: newest ? `added ${formatDateTime(newest.createdAt)}` : 'nothing added yet',
      icon: Sparkles,
      tone: 'bg-sky-50 text-sky-600',
      small: true,
    },
    {
      label: 'Last Updated',
      value: lastUpdated ?? '—',
      hint: 'most recent change',
      icon: Clock3,
      tone: 'bg-amber-50 text-amber-600',
      small: true,
    },
  ];

  return (
    <div className="space-y-6 animate-rise-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Vertical Management</h1>
          <p className="text-sm text-slate-500 mt-1">Manage the service verticals Fixonest operates in.</p>
        </div>
        <button
          type="button"
          onClick={() => setFormState({ id: null })}
          className="btn-primary shrink-0 w-full sm:w-auto px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 font-medium bg-linear-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 shadow-md shadow-teal-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={18} />
          Add Vertical
        </button>
      </div>

      {/* Stats */}
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
                <p className={`font-bold text-slate-800 truncate ${stat.small ? 'text-base sm:text-lg mt-1.5' : 'text-2xl'}`}>
                  {stat.value}
                </p>
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
        <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6 border-b border-slate-100">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-800">All Verticals</h2>
            <p className="text-xs text-slate-400 mt-0.5">Newest first</p>
          </div>
          <button
            type="button"
            onClick={() => loadPage(page)}
            disabled={isLoading}
            aria-label="Refresh list"
            title="Refresh"
            className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-teal-600 hover:border-teal-200 hover:bg-teal-50 transition-colors disabled:opacity-60"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {!isLoading && items.length === 0 ? (
          <EmptyState onAdd={() => setFormState({ id: null })} />
        ) : (
          <VerticalTable
            verticals={items}
            startIndex={(page - 1) * VERTICALS_PER_PAGE}
            isLoading={isLoading}
            onEdit={(vertical) => setFormState({ id: vertical._id })}
            onDelete={setDeleteTarget}
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

      {formState && (
        <VerticalFormModal
          verticalId={formState.id}
          existingVerticals={items}
          onClose={closeForm}
          onSaved={handleSaved}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete this vertical?"
          icon={Trash2}
          confirmLabel="Yes, Delete"
          busy={isDeleting}
          onCancel={closeDelete}
          onConfirm={confirmDelete}
          message={
            <>
              <span className="font-semibold text-slate-700">
                {deleteTarget.display_name || deleteTarget.name}
              </span>{' '}
              will be permanently removed. Anything still assigned to this vertical, such as its admin, may stop
              working. This can't be undone.
            </>
          }
        />
      )}
    </div>
  );
}

function EmptyState({ onAdd }) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-16">
      <div className="relative mb-5">
        <div className="absolute inset-0 rounded-3xl bg-teal-400/20 blur-xl" />
        <div className="relative w-16 h-16 rounded-2xl bg-linear-to-br from-teal-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-teal-500/30">
          <Layers size={28} />
        </div>
      </div>
      <h3 className="text-lg font-bold text-slate-800">No verticals yet</h3>
      <p className="text-sm text-slate-500 mt-1 max-w-sm">
        Verticals group Fixonest's services, like repairs or household help. Add your first one to get started.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-6 px-5 py-2.5 rounded-xl flex items-center gap-2 font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors"
      >
        <Plus size={18} />
        Add your first vertical
      </button>
    </div>
  );
}
