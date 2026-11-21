import { useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  BadgeCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  EyeOff,
  LayoutGrid,
  List,
  PauseCircle,
  PlayCircle,
  Plus,
  RefreshCw,
  Search,
  Star,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';
import { useAuth } from '@/features/auth/index.js';
import {
  useServices,
  SERVICES_PER_PAGE,
  SERVICE_STATUS,
  SERVICE_SORTS,
  fetchServices,
  fetchServiceSummary,
  fetchServiceCategoryOptions,
  updateServiceStatus,
  toggleServiceFeatured,
  deleteService,
} from '@/features/service/index.js';
import { ConfirmDialog } from '@/components/common/modal/index.js';
import { getServiceCreatePath, getServiceEditPath } from '@/routes/constants.js';
import { ServiceDetailsModal, ServiceGrid, ServiceTable } from './components/index.js';

const SEARCH_DEBOUNCE_MS = 350;
const VIEW_STORAGE_KEY = 'fixonest.services.view';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: SERVICE_STATUS.ACTIVE, label: 'Active' },
  { value: SERVICE_STATUS.INACTIVE, label: 'Inactive' },
];

const VIEWS = [
  { value: 'grid', label: 'Grid view', icon: LayoutGrid },
  { value: 'table', label: 'Table view', icon: List },
];

const selectClass = 'input-field bg-white appearance-none pr-9 text-sm text-slate-700 cursor-pointer';

const readStoredView = () => {
  try {
    return localStorage.getItem(VIEW_STORAGE_KEY) === 'table' ? 'table' : 'grid';
  } catch {
    return 'grid';
  }
};

// "Service Management", for the Super Admin and the Admin (who only sees the
// services of their own vertical). Lists every service as cards or a table,
// and lets them feature, activate/deactivate, view and delete one; creating
// and editing happen on ServiceEditorPage. Search, filters, sorting, paging
// and the counts are all done by the server.
export default function ServiceManagementPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { role } = useAuth();
  const { items, meta, status, summary, categories } = useServices();

  const [view, setView] = useState(readStoredView);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sort, setSort] = useState('newest');
  const [featuredOnly, setFeaturedOnly] = useState(false);

  const [viewTarget, setViewTarget] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const [pendingFeaturedId, setPendingFeaturedId] = useState(null);

  const isLoading = status === 'loading' || status === 'idle';
  const total = meta?.total ?? items.length;
  const totalPages = Math.max(meta?.totalPages ?? 1, 1);
  const hasFilters = Boolean(search || statusFilter || categoryFilter || featuredOnly);
  const counts = summary.data;
  const summaryReady = summary.status === 'succeeded';
  const featuredLimit = counts.featuredLimit;
  // The limit is shared by every vertical, so it is checked against featuredInUse.
  const featuredBlocked = summaryReady && counts.featuredInUse >= featuredLimit;
  const createPath = getServiceCreatePath(role);

  const changeView = (next) => {
    setView(next);
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      // Storage unavailable (private mode) - the choice just isn't remembered.
    }
  };

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
        fetchServices({
          page,
          perPage: SERVICES_PER_PAGE,
          search,
          status: statusFilter,
          categoryId: categoryFilter,
          featuredOnly,
          sort,
        }),
      ),
    [dispatch, page, search, statusFilter, categoryFilter, featuredOnly, sort],
  );
  const loadSummary = useCallback(() => dispatch(fetchServiceSummary()), [dispatch]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    loadSummary();
    dispatch(fetchServiceCategoryOptions());
  }, [loadSummary, dispatch]);

  const refreshAll = useCallback(() => {
    loadList();
    loadSummary();
  }, [loadList, loadSummary]);

  const changeFilter = (setter) => (value) => {
    setter(value);
    setPage(1);
  };
  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setStatusFilter('');
    setCategoryFilter('');
    setFeaturedOnly(false);
    setPage(1);
  };

  const openEdit = useCallback((service) => navigate(getServiceEditPath(role, service._id)), [navigate, role]);

  // One click, no confirmation: the star flips at once and flips back if the
  // backend refuses. A 7th featured service is stopped here already, with a
  // clear explanation instead of a round trip.
  const toggleFeatured = async (service) => {
    const turnOn = !service.isFeatured;
    if (turnOn && featuredBlocked) {
      toast.warning(`All ${featuredLimit} featured slots are taken`, {
        description: 'Remove a service from featured first - the Home page shows exactly that many.',
      });
      return;
    }
    setPendingFeaturedId(service._id);
    try {
      await dispatch(toggleServiceFeatured({ id: service._id, isFeatured: turnOn })).unwrap();
      toast.success(turnOn ? 'Added to featured services' : 'Removed from featured services', {
        description: service.name,
      });
      if (featuredOnly || !turnOn) refreshAll();
      else loadSummary();
    } catch {
      // Reverted by the slice; the reason was toasted globally by lib/httpClient.js.
      loadSummary();
    } finally {
      setPendingFeaturedId(null);
    }
  };

  const closeStatus = useCallback(() => setStatusTarget(null), []);
  const confirmStatus = async () => {
    const next = statusTarget.status === SERVICE_STATUS.INACTIVE ? SERVICE_STATUS.ACTIVE : SERVICE_STATUS.INACTIVE;
    setIsBusy(true);
    try {
      await dispatch(updateServiceStatus({ id: statusTarget._id, status: next })).unwrap();
      toast.success(next === SERVICE_STATUS.ACTIVE ? 'Service activated' : 'Service deactivated');
      setStatusTarget(null);
      refreshAll();
    } catch {
      // Already surfaced globally by lib/httpClient.js's response interceptor.
    } finally {
      setIsBusy(false);
    }
  };

  const closeDelete = useCallback(() => setDeleteTarget(null), []);
  const confirmDelete = async () => {
    // Deleting the only item of a later page would leave that page empty.
    const wasLastOnPage = items.length === 1 && page > 1;
    setIsBusy(true);
    try {
      const result = await dispatch(deleteService(deleteTarget._id)).unwrap();
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
      setIsBusy(false);
    }
  };

  const closeView = useCallback(() => setViewTarget(null), []);
  const editFromView = (service) => {
    setViewTarget(null);
    openEdit(service);
  };

  const rangeStart = total === 0 ? 0 : (page - 1) * SERVICES_PER_PAGE + 1;
  const rangeEnd = Math.min(page * SERVICES_PER_PAGE, total);
  const dash = (value) => (summaryReady ? value : '—');

  const stats = [
    {
      label: 'Total Services',
      value: dash(counts.total),
      hint: 'in the catalogue',
      icon: Wrench,
      tone: 'bg-teal-50 text-teal-600',
    },
    {
      label: 'Active',
      value: dash(counts.active),
      hint: 'bookable on the customer site',
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
    {
      label: 'Featured',
      value: summaryReady ? `${counts.featuredInUse}/${featuredLimit}` : '—',
      hint: featuredBlocked
        ? 'all Home page slots in use'
        : counts.featured !== counts.featuredInUse
          ? `${counts.featured} of them from your services`
          : 'shown on the Home page',
      icon: Star,
      tone: 'bg-amber-50 text-amber-600',
      progress: summaryReady ? Math.min(counts.featuredInUse / featuredLimit, 1) : 0,
    },
  ];

  const isDeactivating = statusTarget?.status !== SERVICE_STATUS.INACTIVE;
  const listProps = {
    services: items,
    isLoading,
    featuredBlocked,
    pendingFeaturedId,
    onView: setViewTarget,
    onEdit: openEdit,
    onToggleFeatured: toggleFeatured,
    onToggleStatus: setStatusTarget,
    onDelete: setDeleteTarget,
  };

  return (
    <div className="space-y-6 animate-rise-in">
      {/* Header - same layout and classes as VerticalManagementPage's header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Service Management</h1>
          <p className="text-sm text-slate-500 mt-1">Create, price and feature the services customers book.</p>
        </div>
        <Link
          to={createPath}
          className="btn-primary shrink-0 w-full sm:w-auto px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 font-medium bg-linear-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 shadow-md shadow-teal-500/30"
        >
          <Plus size={18} />
          Add Service
        </Link>
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
            {stat.progress !== undefined ? (
              <div className="mt-3">
                <div className="h-1.5 overflow-hidden rounded-full bg-amber-100/70">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-[width] duration-500"
                    style={{ width: `${stat.progress * 100}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-slate-400 truncate">{stat.hint}</p>
              </div>
            ) : (
              <p className="mt-3 text-xs text-slate-400 truncate">{stat.hint}</p>
            )}
          </div>
        ))}
      </div>

      {/* Listing */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Same header bar as VerticalManagementPage's "All Verticals" */}
        <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6 border-b border-slate-100">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-800">All Services</h2>
            <p className="text-xs text-slate-400 mt-0.5 truncate">
              {SERVICE_SORTS.find((option) => option.value === sort)?.label}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-xl bg-slate-100 p-1" role="group" aria-label="Layout">
              {VIEWS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => changeView(value)}
                  aria-pressed={view === value}
                  aria-label={label}
                  title={label}
                  className={`p-1.5 rounded-lg transition-all ${
                    view === value ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Icon size={16} />
                </button>
              ))}
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
                placeholder="Search by name or description"
                aria-label="Search services"
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
            <FilterSelect
              label="Filter by category"
              value={categoryFilter}
              onChange={changeFilter(setCategoryFilter)}
              className="lg:w-64"
            >
              <option value="">All categories</option>
              {categories.items.map((category) => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect label="Sort services" value={sort} onChange={changeFilter(setSort)} className="lg:w-56">
              {SERVICE_SORTS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </FilterSelect>
            <button
              type="button"
              role="switch"
              aria-checked={featuredOnly}
              onClick={() => changeFilter(setFeaturedOnly)(!featuredOnly)}
              className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold ring-1 ring-inset transition-colors ${
                featuredOnly
                  ? 'bg-amber-50 text-amber-700 ring-amber-500/30 hover:bg-amber-100'
                  : 'bg-white text-slate-500 ring-slate-200 hover:text-slate-700 hover:ring-slate-300'
              }`}
            >
              <Star size={14} className={featuredOnly ? 'fill-amber-400 text-amber-500' : ''} />
              Featured only
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
        </div>

        {!isLoading && items.length === 0 ? (
          hasFilters ? (
            <NoMatches onClear={clearFilters} />
          ) : (
            <EmptyState createPath={createPath} />
          )
        ) : view === 'grid' ? (
          <ServiceGrid {...listProps} />
        ) : (
          <ServiceTable {...listProps} startIndex={(page - 1) * SERVICES_PER_PAGE} />
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

      {viewTarget && (
        <ServiceDetailsModal key={viewTarget._id} service={viewTarget} onClose={closeView} onEdit={editFromView} />
      )}
      {statusTarget && (
        <ConfirmDialog
          title={isDeactivating ? 'Deactivate this service?' : 'Activate this service?'}
          icon={isDeactivating ? PauseCircle : PlayCircle}
          tone={isDeactivating ? 'warning' : 'success'}
          confirmLabel={isDeactivating ? 'Yes, Deactivate' : 'Yes, Activate'}
          busy={isBusy}
          onCancel={closeStatus}
          onConfirm={confirmStatus}
          message={
            isDeactivating ? (
              <>
                <span className="font-semibold text-slate-700">{statusTarget.name}</span> will disappear from the customer
                site until you activate it again.
                {statusTarget.isFeatured && (
                  <span className="mt-2 block text-xs text-slate-400">
                    It stays featured, but the Home page won't show it while it's inactive.
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="font-semibold text-slate-700">{statusTarget.name}</span> will be bookable on the customer
                site again.
              </>
            )
          }
        />
      )}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete this service?"
          icon={Trash2}
          confirmLabel="Yes, Delete"
          busy={isBusy}
          onCancel={closeDelete}
          onConfirm={confirmDelete}
          message={
            <>
              <span className="font-semibold text-slate-700">{deleteTarget.name}</span> will be removed from this list and
              from the customer site, together with its images and details.
              <span className="mt-2 block text-xs text-slate-400">
                To take it down only for a while, deactivate it instead.
              </span>
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

function EmptyState({ createPath }) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-16">
      <div className="relative mb-5">
        <div className="absolute inset-0 rounded-3xl bg-teal-400/20 blur-xl" />
        <div className="relative w-16 h-16 rounded-2xl bg-linear-to-br from-teal-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-teal-500/30">
          <Wrench size={28} />
        </div>
      </div>
      <h3 className="text-lg font-bold text-slate-800">No services yet</h3>
      <p className="text-sm text-slate-500 mt-1 max-w-sm">
        Add the services customers can book - with prices, photos and everything their details page shows.
      </p>
      <Link
        to={createPath}
        className="mt-6 px-5 py-2.5 rounded-xl flex items-center gap-2 font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors"
      >
        <Plus size={18} />
        Add your first service
      </Link>
    </div>
  );
}

function NoMatches({ onClear }) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-14">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
        <Search size={24} />
      </div>
      <h3 className="text-base font-bold text-slate-800">No services match these filters</h3>
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
