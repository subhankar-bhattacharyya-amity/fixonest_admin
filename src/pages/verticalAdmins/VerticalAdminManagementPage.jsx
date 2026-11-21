import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'sonner';
import {
  ChevronLeft,
  ChevronRight,
  Layers,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  UserPlus,
  UserX,
  Users,
  X,
} from 'lucide-react';
import {
  useVerticalAdmins,
  VERTICAL_ADMINS_PER_PAGE,
  getAdminVerticalId,
  fetchVerticalAdmins,
  fetchVerticalAdminOverview,
  updateVerticalAdminStatus,
  deleteVerticalAdmin,
} from '@/features/verticalAdmin/index.js';
import { useVerticals, fetchVerticals } from '@/features/vertical/index.js';
import { ConfirmDialog } from '@/components/common/modal/index.js';
import { VerticalAdminFormModal, VerticalAdminTable, VerticalCoverageBoard } from './components/index.js';

// The backend caps per_page at 100 - enough for every vertical.
const ALL_VERTICALS = { page: 1, perPage: 100 };
const SEARCH_DEBOUNCE_MS = 350;

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
];

// Super Admin's "User Management > Admin Management": create, edit, suspend /
// reactivate and remove (soft delete) the admin of each vertical. The table is
// filtered + paginated server-side; the stat cards and the coverage board read
// an unfiltered overview so they never depend on the table's current view.
export default function VerticalAdminManagementPage() {
  const dispatch = useDispatch();
  const { items, meta, status, overview } = useVerticalAdmins();
  const { items: verticals, status: verticalStatus } = useVerticals();

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [verticalFilter, setVerticalFilter] = useState('');

  // null (closed) | { admin: null, verticalId? } (add) | { admin } (edit)
  const [formState, setFormState] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isBusy, setIsBusy] = useState(false);

  const isLoading = status === 'loading' || status === 'idle';
  const total = meta?.total ?? items.length;
  const totalPages = Math.max(meta?.totalPages ?? 1, 1);
  const hasFilters = Boolean(search || statusFilter || verticalFilter);

  // Debounce typing, and go back to page 1 whenever the query changes.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadTable = useCallback(
    () =>
      dispatch(
        fetchVerticalAdmins({
          page,
          perPage: VERTICAL_ADMINS_PER_PAGE,
          search,
          verticalId: verticalFilter,
          accountStatus: statusFilter,
        }),
      ),
    [dispatch, page, search, verticalFilter, statusFilter],
  );
  const loadOverview = useCallback(() => dispatch(fetchVerticalAdminOverview()), [dispatch]);

  useEffect(() => {
    loadTable();
  }, [loadTable]);

  useEffect(() => {
    loadOverview();
    dispatch(fetchVerticals(ALL_VERTICALS));
  }, [dispatch, loadOverview]);

  const refreshAll = useCallback(() => {
    loadTable();
    loadOverview();
  }, [loadTable, loadOverview]);

  // vertical id -> how many live admins it has (a vertical can have several).
  const adminCountByVertical = useMemo(() => {
    const map = new Map();
    overview.items.forEach((admin) => {
      const verticalId = getAdminVerticalId(admin);
      if (verticalId) map.set(verticalId, (map.get(verticalId) ?? 0) + 1);
    });
    return map;
  }, [overview.items]);

  const counts = useMemo(() => {
    const active = overview.items.filter((admin) => admin.accountStatus === 'active').length;
    return { total: overview.items.length, active, suspended: overview.items.length - active };
  }, [overview.items]);

  const covered = verticals.filter((vertical) => adminCountByVertical.has(vertical._id)).length;
  const freeVerticals = verticals.length - covered;
  const overviewLoading = overview.status === 'loading' || overview.status === 'idle';

  const changeFilter = (setter) => (value) => {
    setter(value);
    setPage(1);
  };
  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setStatusFilter('');
    setVerticalFilter('');
    setPage(1);
  };

  const openCreate = useCallback((verticalId = '') => setFormState({ admin: null, verticalId }), []);
  const closeForm = useCallback(() => setFormState(null), []);
  const handleSaved = useCallback(() => {
    setFormState(null);
    refreshAll();
  }, [refreshAll]);

  const closeStatus = useCallback(() => setStatusTarget(null), []);
  const confirmStatus = async () => {
    const nextStatus = statusTarget.accountStatus === 'suspended' ? 'active' : 'suspended';
    setIsBusy(true);
    try {
      const result = await dispatch(updateVerticalAdminStatus({ id: statusTarget._id, accountStatus: nextStatus })).unwrap();
      toast.success(result.message);
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
    setIsBusy(true);
    try {
      const result = await dispatch(deleteVerticalAdmin(deleteTarget._id)).unwrap();
      toast.success(result.message);
      setDeleteTarget(null);
      // Removing the last row of a later page steps back one page.
      if (items.length === 1 && page > 1) setPage(page - 1);
      else loadTable();
      loadOverview();
    } catch {
      // Already surfaced globally by lib/httpClient.js's response interceptor.
    } finally {
      setIsBusy(false);
    }
  };

  const rangeStart = total === 0 ? 0 : (page - 1) * VERTICAL_ADMINS_PER_PAGE + 1;
  const rangeEnd = Math.min(page * VERTICAL_ADMINS_PER_PAGE, total);
  const dash = (value) => (overviewLoading && !overview.items.length ? '—' : value);

  const stats = [
    { label: 'Total Admins', value: dash(counts.total), hint: 'across all verticals', icon: Users, tone: 'bg-teal-50 text-teal-600' },
    {
      label: 'Active',
      value: dash(counts.active),
      hint: 'can sign in right now',
      icon: ShieldCheck,
      tone: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Suspended',
      value: dash(counts.suspended),
      hint: 'temporarily blocked',
      icon: PauseCircle,
      tone: 'bg-amber-50 text-amber-600',
    },
    {
      label: 'Unassigned Verticals',
      value: verticalStatus === 'succeeded' ? freeVerticals : '—',
      hint: freeVerticals > 0 ? 'still need an admin' : 'every vertical is covered',
      icon: Layers,
      tone: freeVerticals > 0 ? 'bg-rose-50 text-rose-500' : 'bg-sky-50 text-sky-600',
    },
  ];

  const isSuspending = statusTarget && statusTarget.accountStatus !== 'suspended';

  return (
    <div className="space-y-6 animate-rise-in">
      {/* Header - same layout and classes as VerticalManagementPage's header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Vertical Admins</h1>
          <p className="text-sm text-slate-500 mt-1">Appoint and manage the administrators of each vertical.</p>
        </div>
        <button
          type="button"
          onClick={() => openCreate()}
          className="btn-primary shrink-0 w-full sm:w-auto px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 font-medium bg-linear-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 shadow-md shadow-teal-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <UserPlus size={18} />
          Add Vertical Admin
        </button>
      </div>

      {/* Stats */}
      {/* Same card markup as VerticalManagementPage's stats; 4 cards, so 2 -> 4 columns. */}
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
      <VerticalCoverageBoard
        verticals={verticals}
        adminCountByVertical={adminCountByVertical}
        isLoading={verticalStatus === 'loading' || verticalStatus === 'idle' || overviewLoading}
        onAssign={(vertical) => openCreate(vertical._id)}
      />

      {/* Listing */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Same header bar as VerticalManagementPage's "All Verticals" */}
        <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6 border-b border-slate-100">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-800">All Admins</h2>
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
              aria-label="Search admins"
              className="input-field bg-slate-50 pl-10 pr-9"
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

            <select
              value={verticalFilter}
              onChange={(event) => changeFilter(setVerticalFilter)(event.target.value)}
              aria-label="Filter by vertical"
              className="input-field bg-slate-50 sm:w-52 py-2 text-sm text-slate-700"
            >
              <option value="">All verticals</option>
              {verticals.map((vertical) => (
                <option key={vertical._id} value={vertical._id}>
                  {vertical.display_name || vertical.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!isLoading && items.length === 0 ? (
          hasFilters ? (
            <NoMatches onClear={clearFilters} />
          ) : (
            <EmptyState onAdd={() => openCreate()} />
          )
        ) : (
          <VerticalAdminTable
            admins={items}
            startIndex={(page - 1) * VERTICAL_ADMINS_PER_PAGE}
            isLoading={isLoading}
            onEdit={(admin) => setFormState({ admin })}
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
        <VerticalAdminFormModal
          admin={formState.admin}
          initialVerticalId={formState.verticalId}
          verticals={verticals}
          adminCountByVertical={adminCountByVertical}
          onClose={closeForm}
          onSaved={handleSaved}
        />
      )}

      {statusTarget && (
        <ConfirmDialog
          title={isSuspending ? 'Suspend this admin?' : 'Reactivate this admin?'}
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
                immediately and can't sign in until you reactivate them. Their vertical stays assigned to them.
              </>
            ) : (
              <>
                <span className="font-semibold text-slate-700">{statusTarget.fullName}</span> will be able to sign in
                and manage their vertical again.
              </>
            )
          }
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Remove this admin?"
          icon={UserX}
          confirmLabel="Yes, Remove"
          busy={isBusy}
          onCancel={closeDelete}
          onConfirm={confirmDelete}
          message={
            <>
              <span className="font-semibold text-slate-700">{deleteTarget.fullName}</span>'s account will be deleted
              and they'll lose access right away. Their email and phone stay reserved and can't be reused.
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
          <ShieldCheck size={28} />
        </div>
      </div>
      <h3 className="text-lg font-bold text-slate-800">No vertical admins yet</h3>
      <p className="text-sm text-slate-500 mt-1 max-w-sm">
        Vertical admins manage their vertical's categories and services. Appoint the first one to get started.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-6 px-5 py-2.5 rounded-xl flex items-center gap-2 font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors"
      >
        <UserPlus size={18} />
        Add your first admin
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
      <h3 className="text-base font-bold text-slate-800">No admins match these filters</h3>
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
