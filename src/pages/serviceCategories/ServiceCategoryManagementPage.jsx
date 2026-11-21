import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'sonner';
import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  EyeOff,
  PauseCircle,
  PlayCircle,
  Plus,
  RefreshCw,
  Search,
  Tags,
  Trash2,
  X,
} from 'lucide-react';
import { useAuth, ROLES } from '@/features/auth/index.js';
import {
  useServiceCategories,
  SERVICE_CATEGORIES_PER_PAGE,
  SERVICE_CATEGORY_STATUS,
  fetchServiceCategories,
  updateServiceCategoryStatus,
  deleteServiceCategory,
} from '@/features/serviceCategory/index.js';
import { useVerticals, fetchVerticals } from '@/features/vertical/index.js';
import { ConfirmDialog } from '@/components/common/modal/index.js';
import { ServiceCategoryFormModal, ServiceCategoryTable } from './components/index.js';

// The backend caps per_page at 100 - enough for every vertical.
const ALL_VERTICALS = { page: 1, perPage: 100 };

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: SERVICE_CATEGORY_STATUS.ACTIVE, label: 'Active' },
  { value: SERVICE_CATEGORY_STATUS.INACTIVE, label: 'Inactive' },
];

// "Category Management > Service Category", shared by the Super Admin and
// Admins. Both create, edit, activate/deactivate and delete categories; the
// Super Admin does so in any vertical (and picks each category's vertical),
// an Admin only in their own (the backend enforces this). The list endpoint
// has no search, status filter or counts, so the whole catalogue is loaded
// once and searched, filtered, counted and paged here.
export default function ServiceCategoryManagementPage() {
  const dispatch = useDispatch();
  const { role, user } = useAuth();
  const isSuperAdmin = role === ROLES.SUPER_ADMIN;
  const { items, status } = useServiceCategories();
  const { items: verticals } = useVerticals();

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [verticalFilter, setVerticalFilter] = useState('');

  // null (closed) | { category: null } (add) | { category } (edit)
  const [formState, setFormState] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isBusy, setIsBusy] = useState(false);

  const isLoading = status === 'loading' || status === 'idle';
  const isReady = status === 'succeeded' || items.length > 0;
  const search = searchInput.trim().toLowerCase();
  const hasFilters = Boolean(search || statusFilter || verticalFilter);
  const adminVertical = user?.vertical_id?.display_name || user?.vertical_id?.name;

  const loadCategories = useCallback(() => dispatch(fetchServiceCategories()), [dispatch]);

  useEffect(() => {
    loadCategories();
    // Verticals are a Super Admin API - an Admin calling it would be logged out.
    if (isSuperAdmin) dispatch(fetchVerticals(ALL_VERTICALS));
  }, [dispatch, loadCategories, isSuperAdmin]);

  const counts = useMemo(() => {
    const active = items.filter((item) => item.status === SERVICE_CATEGORY_STATUS.ACTIVE).length;
    const perVertical = {};
    items.forEach((item) => {
      const id = item.vertical_data?._id;
      if (id) perVertical[id] = (perVertical[id] ?? 0) + 1;
    });
    return { total: items.length, active, inactive: items.length - active, perVertical };
  }, [items]);

  const filtered = useMemo(
    () =>
      items.filter((item) => {
        if (statusFilter && item.status !== statusFilter) return false;
        if (verticalFilter && item.vertical_data?._id !== verticalFilter) return false;
        if (!search) return true;
        return [item.name, item.slug, item.description].some((text) => text?.toLowerCase().includes(search));
      }),
    [items, search, statusFilter, verticalFilter],
  );

  const total = filtered.length;
  const totalPages = Math.max(Math.ceil(total / SERVICE_CATEGORIES_PER_PAGE), 1);
  // Deleting or filtering can leave `page` past the end - clamp it.
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * SERVICE_CATEGORIES_PER_PAGE;
  const pageItems = filtered.slice(startIndex, startIndex + SERVICE_CATEGORIES_PER_PAGE);

  const changeFilter = (setter) => (value) => {
    setter(value);
    setPage(1);
  };
  const clearFilters = () => {
    setSearchInput('');
    setStatusFilter('');
    setVerticalFilter('');
    setPage(1);
  };

  const openCreate = useCallback(() => setFormState({ category: null }), []);
  const closeForm = useCallback(() => setFormState(null), []);
  const handleSaved = useCallback(() => {
    setFormState(null);
    loadCategories();
  }, [loadCategories]);

  const closeStatus = useCallback(() => setStatusTarget(null), []);
  const confirmStatus = async () => {
    const nextStatus =
      statusTarget.status === SERVICE_CATEGORY_STATUS.INACTIVE
        ? SERVICE_CATEGORY_STATUS.ACTIVE
        : SERVICE_CATEGORY_STATUS.INACTIVE;
    setIsBusy(true);
    try {
      const result = await dispatch(updateServiceCategoryStatus({ id: statusTarget._id, status: nextStatus })).unwrap();
      toast.success(result.message);
      setStatusTarget(null);
      loadCategories();
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
      const result = await dispatch(deleteServiceCategory(deleteTarget._id)).unwrap();
      toast.success(result.message);
      setDeleteTarget(null);
      loadCategories();
    } catch {
      // Already surfaced globally by lib/httpClient.js - including the 409
      // "services are assigned to it" refusal. Close the dialog so the
      // category can be deactivated instead.
      setDeleteTarget(null);
    } finally {
      setIsBusy(false);
    }
  };

  const rangeStart = total === 0 ? 0 : startIndex + 1;
  const rangeEnd = Math.min(startIndex + SERVICE_CATEGORIES_PER_PAGE, total);
  const dash = (value) => (isReady ? value : '—');

  const stats = [
    {
      label: isSuperAdmin ? 'Total Categories' : 'My Categories',
      value: dash(counts.total),
      hint: isSuperAdmin ? 'across all verticals' : adminVertical ? `in ${adminVertical}` : 'in your vertical',
      icon: Tags,
      tone: 'bg-teal-50 text-teal-600',
    },
    {
      label: 'Active',
      value: dash(counts.active),
      hint: 'visible to customers',
      icon: BadgeCheck,
      tone: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Inactive',
      value: dash(counts.inactive),
      hint: 'hidden from customers',
      icon: EyeOff,
      tone: 'bg-slate-100 text-slate-500',
    },
  ];

  const isDeactivating = statusTarget && statusTarget.status !== SERVICE_CATEGORY_STATUS.INACTIVE;

  return (
    <div className="space-y-6 animate-rise-in">
      {/* Header - same layout and classes as VerticalManagementPage's header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Service Categories</h1>
          <p className="text-sm text-slate-500 mt-1">
            {isSuperAdmin
              ? 'Organise the services of every vertical into categories customers can browse.'
              : `Organise the services of ${adminVertical || 'your vertical'} into categories customers can browse.`}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="btn-primary shrink-0 w-full sm:w-auto px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 font-medium bg-linear-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 shadow-md shadow-teal-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={18} />
          Add Category
        </button>
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
            <h2 className="text-lg font-bold text-slate-800">All Service Categories</h2>
            <p className="text-xs text-slate-400 mt-0.5">Newest first</p>
          </div>
          <button
            type="button"
            onClick={loadCategories}
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
              onChange={(event) => changeFilter(setSearchInput)(event.target.value)}
              placeholder="Search by name or description"
              aria-label="Search service categories"
              className="input-field bg-white pl-10 pr-9"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => changeFilter(setSearchInput)('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="inline-flex rounded-xl bg-slate-100 p-1" role="group" aria-label="Filter by status">
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

            {isSuperAdmin && (
              <select
                value={verticalFilter}
                onChange={(event) => changeFilter(setVerticalFilter)(event.target.value)}
                aria-label="Filter by vertical"
                className="input-field bg-white sm:w-56 py-2 text-sm text-slate-700"
              >
                <option value="">All verticals</option>
                {verticals.map((vertical) => (
                  <option key={vertical._id} value={vertical._id}>
                    {vertical.display_name || vertical.name} ({counts.perVertical[vertical._id] ?? 0})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {!isLoading && total === 0 ? (
          hasFilters ? (
            <NoMatches onClear={clearFilters} />
          ) : (
            <EmptyState onAdd={openCreate} />
          )
        ) : (
          <ServiceCategoryTable
            categories={pageItems}
            startIndex={startIndex}
            isLoading={isLoading}
            showVertical={isSuperAdmin}
            onEdit={(category) => setFormState({ category })}
            onToggleStatus={setStatusTarget}
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

      {formState && (
        <ServiceCategoryFormModal
          category={formState.category}
          isSuperAdmin={isSuperAdmin}
          verticals={verticals}
          adminVertical={adminVertical}
          existingCategories={items}
          onClose={closeForm}
          onSaved={handleSaved}
        />
      )}

      {statusTarget && (
        <ConfirmDialog
          title={isDeactivating ? 'Deactivate this category?' : 'Activate this category?'}
          icon={isDeactivating ? PauseCircle : PlayCircle}
          tone={isDeactivating ? 'warning' : 'success'}
          confirmLabel={isDeactivating ? 'Yes, Deactivate' : 'Yes, Activate'}
          busy={isBusy}
          onCancel={closeStatus}
          onConfirm={confirmStatus}
          message={
            isDeactivating ? (
              <>
                <span className="font-semibold text-slate-700">{statusTarget.name}</span> will be hidden from customers
                until you activate it again.
              </>
            ) : (
              <>
                <span className="font-semibold text-slate-700">{statusTarget.name}</span> will be visible to customers
                again.
              </>
            )
          }
        />
      )}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete this category?"
          icon={Trash2}
          confirmLabel="Yes, Delete"
          busy={isBusy}
          onCancel={closeDelete}
          onConfirm={confirmDelete}
          message={
            <>
              <span className="font-semibold text-slate-700">{deleteTarget.name}</span> will be removed from this list
              and from the customer app, along with its icon.
              <span className="mt-2 block text-xs text-slate-400">
                A category that still has services assigned to it can't be deleted - deactivate it instead. A
                deleted category's name stays reserved and can't be reused.
              </span>
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
          <Tags size={28} />
        </div>
      </div>
      <h3 className="text-lg font-bold text-slate-800">No service categories yet</h3>
      <p className="text-sm text-slate-500 mt-1 max-w-sm">
        Categories group related services so customers can find them quickly. Add your first one to get started.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-6 px-5 py-2.5 rounded-xl flex items-center gap-2 font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors"
      >
        <Plus size={18} />
        Add your first category
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
      <h3 className="text-base font-bold text-slate-800">No categories match these filters</h3>
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
