import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  HardHat,
  RefreshCw,
  Search,
  Unlink,
  UserCheck,
  UserPlus,
  UserX,
  X,
} from 'lucide-react';
import { useAuth, ROLES } from '@/features/auth/index.js';
import {
  useProviderAssignments,
  PROVIDER_ASSIGNMENTS_PER_PAGE,
  ASSIGNMENT_FILTER,
  buildAssignmentBoard,
  fetchAssignmentBoard,
  removeProviderAssignment,
  updateProviderAssignmentStatus,
  suspendedProviderMessage,
} from '@/features/providerAssignment/index.js';
import { ConfirmDialog } from '@/components/common/modal/index.js';
import { ROUTES } from '@/routes/constants.js';
import { AssignCategoriesModal, CategoryCoverageBoard, ProviderAssignmentTable } from './components/index.js';

const ASSIGNMENT_FILTERS = [
  { value: ASSIGNMENT_FILTER.ALL, label: 'All' },
  { value: ASSIGNMENT_FILTER.PENDING, label: 'Pending Approval' },
  { value: ASSIGNMENT_FILTER.ASSIGNED, label: 'Assigned' },
  { value: ASSIGNMENT_FILTER.UNASSIGNED, label: 'Unassigned' },
];

// "Assignment Management > Provider", shared by the Super Admin and Admins:
// every provider with the service categories they are assigned to, and the
// tools to assign or remove categories. The Super Admin works across every
// vertical; an Admin sees their own vertical's categories and the providers
// already working in it (the backend scopes both lists). The assignment API
// has no search or per-category filter, so everything is loaded once and
// joined, searched, filtered and paged here.
export default function ProviderAssignmentPage() {
  const dispatch = useDispatch();
  const { role, user } = useAuth();
  const isSuperAdmin = role === ROLES.SUPER_ADMIN;
  const { providers, categories, assignments, status } = useProviderAssignments();

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [assignmentFilter, setAssignmentFilter] = useState(ASSIGNMENT_FILTER.ALL);
  const [categoryFilter, setCategoryFilter] = useState('');

  // null (closed) | { row: null } (assign - pick a provider) | { row } (manage one)
  const [modalState, setModalState] = useState(null);
  // null | { row, entry } - the single assignment about to be removed
  const [removeTarget, setRemoveTarget] = useState(null);
  const [isBusy, setIsBusy] = useState(false);

  const isLoading = status === 'loading' || status === 'idle';
  const isReady = status === 'succeeded' || providers.length > 0;
  const search = searchInput.trim().toLowerCase();
  const hasFilters = Boolean(search || assignmentFilter || categoryFilter);
  const adminVertical = user?.vertical_id?.display_name || user?.vertical_id?.name;

  const loadBoard = useCallback(() => dispatch(fetchAssignmentBoard()), [dispatch]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  const { rows, providerCountByCategory } = useMemo(
    () => buildAssignmentBoard(providers, categories, assignments, { restrictToCatalogue: !isSuperAdmin }),
    [providers, categories, assignments, isSuperAdmin],
  );

  const counts = useMemo(() => {
    const assigned = rows.filter((row) => row.assignments.length > 0).length;
    const pending = rows.filter((row) => row.assignments.some((entry) => entry.status === 'Pending')).length;
    const links = rows.reduce((sum, row) => sum + row.assignments.length, 0);
    return { total: rows.length, assigned, pending, unassigned: rows.length - assigned, links };
  }, [rows]);

  const filtered = useMemo(
    () =>
      rows.filter(({ provider, assignments: entries }) => {
        if (assignmentFilter === ASSIGNMENT_FILTER.PENDING && !entries.some((entry) => entry.status === 'Pending')) return false;
        if (assignmentFilter === ASSIGNMENT_FILTER.ASSIGNED && entries.length === 0) return false;
        if (assignmentFilter === ASSIGNMENT_FILTER.UNASSIGNED && entries.length > 0) return false;
        if (categoryFilter && !entries.some((entry) => entry.category._id === categoryFilter)) return false;
        if (!search) return true;
        return [provider.fullName, provider.email, provider.phone, ...entries.map((entry) => entry.category.name)].some(
          (text) => text?.toLowerCase().includes(search),
        );
      }),
    [rows, search, assignmentFilter, categoryFilter],
  );

  const total = filtered.length;
  const totalPages = Math.max(Math.ceil(total / PROVIDER_ASSIGNMENTS_PER_PAGE), 1);
  // Removing or filtering can leave `page` past the end - clamp it.
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PROVIDER_ASSIGNMENTS_PER_PAGE;
  const pageRows = filtered.slice(startIndex, startIndex + PROVIDER_ASSIGNMENTS_PER_PAGE);

  const changeFilter = (setter) => (value) => {
    setter(value);
    setPage(1);
  };
  const clearFilters = () => {
    setSearchInput('');
    setAssignmentFilter(ASSIGNMENT_FILTER.ALL);
    setCategoryFilter('');
    setPage(1);
  };

  const openAssign = useCallback(() => setModalState({ row: null }), []);
  const openManage = useCallback((row) => setModalState({ row }), []);
  const closeModal = useCallback(() => setModalState(null), []);
  const handleSaved = useCallback(() => {
    setModalState(null);
    loadBoard();
  }, [loadBoard]);

  // A suspended provider's row is disabled - explain why instead of acting.
  // The id stops repeated clicks from stacking duplicate toasts.
  const explainBlocked = useCallback(
    (row) => toast.warning(suspendedProviderMessage(row.provider), { id: `suspended-${row.provider._id}` }),
    [],
  );

  const askRemove = useCallback((row, entry) => setRemoveTarget({ row, entry }), []);
  const closeRemove = useCallback(() => setRemoveTarget(null), []);
  const confirmRemove = async () => {
    setIsBusy(true);
    try {
      const result = await dispatch(removeProviderAssignment(removeTarget.entry.assignmentId)).unwrap();
      toast.success(result.message);
      setRemoveTarget(null);
      loadBoard();
    } catch {
      // Already surfaced globally by lib/httpClient.js's response interceptor.
      setRemoveTarget(null);
    } finally {
      setIsBusy(false);
    }
  };

  const handleStatusChange = async (row, entry, newStatus) => {
    try {
      const result = await dispatch(
        updateProviderAssignmentStatus({ assignmentId: entry.assignmentId, status: newStatus }),
      ).unwrap();
      toast.success(result.message || `Assignment marked as ${newStatus}`);
      loadBoard();
    } catch {
      // Already surfaced globally by lib/httpClient.js's response interceptor.
    }
  };

  const rangeStart = total === 0 ? 0 : startIndex + 1;
  const rangeEnd = Math.min(startIndex + PROVIDER_ASSIGNMENTS_PER_PAGE, total);
  const dash = (value) => (isReady ? value : '—');
  const activeCategory = categoryFilter ? categories.find((category) => category._id === categoryFilter) : null;

  const stats = [
    {
      label: isSuperAdmin ? 'Total Providers' : 'My Providers',
      value: dash(counts.total),
      hint: isSuperAdmin ? 'available to assign' : adminVertical ? `working in ${adminVertical}` : 'in your vertical',
      icon: HardHat,
      tone: 'bg-teal-50 text-teal-600',
    },
    {
      label: 'Pending Approval',
      value: dash(counts.pending),
      hint: counts.pending > 0 ? `${counts.pending} waiting for review` : 'no pending requests',
      icon: UserPlus,
      tone: 'bg-amber-50 text-amber-600',
    },
    {
      label: 'Assigned',
      value: dash(counts.assigned),
      hint: isReady ? `${counts.links} category ${counts.links === 1 ? 'assignment' : 'assignments'} in total` : 'have at least one category',
      icon: UserCheck,
      tone: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Unassigned',
      value: dash(counts.unassigned),
      hint: 'waiting for a category',
      icon: UserX,
      tone: 'bg-slate-50 text-slate-500',
    },
  ];

  return (
    <div className="space-y-6 animate-rise-in">
      {/* Header - same layout and classes as VerticalManagementPage's header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Provider Assignments</h1>
          <p className="text-sm text-slate-500 mt-1">
            {isSuperAdmin
              ? 'Decide which service categories each provider works in.'
              : `Decide which service categories of ${adminVertical || 'your vertical'} each provider works in.`}
          </p>
        </div>
        <button
          type="button"
          onClick={openAssign}
          disabled={!isReady || rows.length === 0 || categories.length === 0}
          className="btn-primary shrink-0 w-full sm:w-auto px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 font-medium bg-linear-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 shadow-md shadow-teal-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <UserPlus size={18} />
          Assign Provider
        </button>
      </div>

      {/* Stats - same card markup and 4-column grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
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

      {/* Coverage */}
      <CategoryCoverageBoard
        categories={categories}
        providerCountByCategory={providerCountByCategory}
        isLoading={isLoading}
        showVertical={isSuperAdmin}
        activeCategoryId={categoryFilter}
        onSelect={changeFilter(setCategoryFilter)}
      />

      {/* Listing */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Same header bar as VerticalManagementPage's "All Verticals" */}
        <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6 border-b border-slate-100">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-800 truncate">Providers & Categories</h2>
            <p className="text-xs text-slate-400 mt-0.5">Newest providers first</p>
          </div>
          <button
            type="button"
            onClick={loadBoard}
            disabled={isLoading}
            aria-label="Refresh list"
            title="Refresh"
            className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-teal-600 hover:border-teal-200 hover:bg-teal-50 transition-colors disabled:opacity-60"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Toolbar - its own row under the header bar */}
        <div className="flex flex-col gap-3 px-3 py-3 min-[420px]:px-4 sm:px-6 lg:flex-row lg:items-center border-b border-slate-100 bg-slate-50/40">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => changeFilter(setSearchInput)(event.target.value)}
              placeholder="Search by provider or category"
              aria-label="Search provider assignments"
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
            <div className="inline-flex rounded-xl bg-slate-100 p-1" role="group" aria-label="Filter by assignment">
              {ASSIGNMENT_FILTERS.map((option) => (
                <button
                  key={option.value || 'all'}
                  type="button"
                  onClick={() => changeFilter(setAssignmentFilter)(option.value)}
                  aria-pressed={assignmentFilter === option.value}
                  className={`flex-1 sm:flex-none px-2 min-[380px]:px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    assignmentFilter === option.value ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <select
              value={categoryFilter}
              onChange={(event) => changeFilter(setCategoryFilter)(event.target.value)}
              aria-label="Filter by category"
              className="input-field bg-white min-w-0 sm:w-56 py-2 text-sm text-slate-700"
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category._id} value={category._id}>
                  {category.name} ({providerCountByCategory.get(category._id) ?? 0})
                </option>
              ))}
            </select>
          </div>
        </div>

        {activeCategory && (
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-6 border-b border-teal-100 bg-teal-50/60">
            <p className="text-xs text-teal-800 min-w-0 truncate">
              Showing providers assigned to <span className="font-semibold">{activeCategory.name}</span>
            </p>
            <button
              type="button"
              onClick={() => changeFilter(setCategoryFilter)('')}
              className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-100 transition-colors"
            >
              <X size={12} />
              Clear
            </button>
          </div>
        )}

        {!isLoading && total === 0 ? (
          hasFilters ? (
            <NoMatches onClear={clearFilters} />
          ) : (
            <EmptyState isSuperAdmin={isSuperAdmin} />
          )
        ) : (
          <ProviderAssignmentTable
            rows={pageRows}
            startIndex={startIndex}
            isLoading={isLoading}
            onManage={openManage}
            onRemove={askRemove}
            onStatusChange={handleStatusChange}
            onBlocked={explainBlocked}
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

      {modalState && (
        <AssignCategoriesModal
          row={modalState.row}
          rows={rows}
          categories={categories}
          showVertical={isSuperAdmin}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}

      {removeTarget && (
        <ConfirmDialog
          title="Remove this assignment?"
          icon={Unlink}
          tone="warning"
          confirmLabel="Yes, Remove"
          busy={isBusy}
          onCancel={closeRemove}
          onConfirm={confirmRemove}
          message={
            <>
              <span className="font-semibold text-slate-700">{removeTarget.row.provider.fullName}</span> will no longer be
              assigned to <span className="font-semibold text-slate-700">{removeTarget.entry.category.name}</span>.
              <span className="mt-2 block text-xs text-slate-400">You can assign the category again at any time.</span>
            </>
          }
        />
      )}
    </div>
  );
}

function EmptyState({ isSuperAdmin }) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-16">
      <div className="relative mb-5">
        <div className="absolute inset-0 rounded-3xl bg-teal-400/20 blur-xl" />
        <div className="relative w-16 h-16 rounded-2xl bg-linear-to-br from-teal-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-teal-500/30">
          <ClipboardList size={28} />
        </div>
      </div>
      <h3 className="text-lg font-bold text-slate-800">No providers to assign yet</h3>
      <p className="text-sm text-slate-500 mt-1 max-w-sm">
        {isSuperAdmin
          ? 'Add a provider first, then come back to choose the service categories they work in.'
          : 'Providers appear here once the Super Admin assigns them to one of your service categories.'}
      </p>
      {isSuperAdmin && (
        <Link
          to={ROUTES.SUPER_ADMIN_PROVIDERS}
          className="mt-6 px-5 py-2.5 rounded-xl flex items-center gap-2 font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors"
        >
          <HardHat size={18} />
          Go to Provider Management
        </Link>
      )}
    </div>
  );
}

function NoMatches({ onClear }) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-14">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
        <Search size={24} />
      </div>
      <h3 className="text-base font-bold text-slate-800">No providers match these filters</h3>
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
