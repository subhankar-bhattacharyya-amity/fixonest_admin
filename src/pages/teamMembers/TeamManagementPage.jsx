import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'sonner';
import {
  ArrowLeftRight,
  Eye,
  EyeOff,
  Info,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Search,
  Trash2,
  UserPlus,
  UsersRound,
  X,
} from 'lucide-react';
import {
  useTeamMembers,
  TEAM_MEMBER_STATUS,
  fetchTeamMembers,
  updateTeamMemberStatus,
  deleteTeamMember,
  reorderTeamMembers,
} from '@/features/teamMember/index.js';
import { ConfirmDialog } from '@/components/common/modal/index.js';
import { TeamMemberDetailsModal, TeamMemberFormModal, TeamMemberGrid } from './components/index.js';
import LinkedinIcon from './components/LinkedinIcon.jsx';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: TEAM_MEMBER_STATUS.ACTIVE, label: 'Live' },
  { value: TEAM_MEMBER_STATUS.INACTIVE, label: 'Hidden' },
];

// "Team Management", Super Admin only. Lists every person shown in the
// About page's "The people building Fixonest." section, as cards shaped like
// the website's, in display order. The Super Admin adds, views, edits,
// reorders, shows/hides and deletes them here. A team is small, so it's all
// loaded at once and searched, filtered and counted in the browser.
export default function TeamManagementPage() {
  const dispatch = useDispatch();
  const { items, status } = useTeamMembers();

  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // null (closed) | { member: null } (add) | { member } (edit)
  const [formState, setFormState] = useState(null);
  const [viewTarget, setViewTarget] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isReordering, setIsReordering] = useState(false);

  const isLoading = status === 'loading' || status === 'idle';
  const search = searchInput.trim().toLowerCase();
  const hasFilters = Boolean(search || statusFilter);

  const loadMembers = useCallback(() => dispatch(fetchTeamMembers()), [dispatch]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const counts = useMemo(() => {
    const active = items.filter((item) => item.status !== TEAM_MEMBER_STATUS.INACTIVE).length;
    const withLinkedin = items.filter((item) => item.linkedin).length;
    return { total: items.length, active, inactive: items.length - active, withLinkedin };
  }, [items]);

  const visibleMembers = useMemo(
    () =>
      items.filter(
        (item) =>
          (!statusFilter || item.status === statusFilter) &&
          (!search || [item.name, item.designation].some((text) => text?.toLowerCase().includes(search))),
      ),
    [items, search, statusFilter],
  );

  // A new member goes after every existing one, hidden ones included.
  const nextOrder = items.reduce((max, item) => Math.max(max, item.order ?? 0), 0) + 1;

  const clearFilters = () => {
    setSearchInput('');
    setStatusFilter('');
  };

  const openCreate = useCallback(() => setFormState({ member: null }), []);
  const closeForm = useCallback(() => setFormState(null), []);
  const handleSaved = useCallback(() => {
    setFormState(null);
    loadMembers();
  }, [loadMembers]);

  const closeView = useCallback(() => setViewTarget(null), []);
  const editFromView = (member) => {
    setViewTarget(null);
    setFormState({ member });
  };

  const moveMember = async (member, step) => {
    const reordered = [...items];
    const from = reordered.findIndex((item) => item._id === member._id);
    const to = from + step;
    if (from === -1 || to < 0 || to >= reordered.length) return;
    [reordered[from], reordered[to]] = [reordered[to], reordered[from]];
    setIsReordering(true);
    try {
      await dispatch(reorderTeamMembers({ items: reordered })).unwrap();
    } catch {
      // Toasted globally by lib/httpClient.js; reload so the list shows the
      // order that was actually saved.
      loadMembers();
    } finally {
      setIsReordering(false);
    }
  };

  const closeStatus = useCallback(() => setStatusTarget(null), []);
  const confirmStatus = async () => {
    const nextStatus =
      statusTarget.status === TEAM_MEMBER_STATUS.INACTIVE ? TEAM_MEMBER_STATUS.ACTIVE : TEAM_MEMBER_STATUS.INACTIVE;
    setIsBusy(true);
    try {
      const result = await dispatch(updateTeamMemberStatus({ id: statusTarget._id, status: nextStatus })).unwrap();
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
      const result = await dispatch(deleteTeamMember({ id: deleteTarget._id })).unwrap();
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
      label: 'Team Members',
      value: dash(counts.total),
      hint: 'on the About page',
      icon: UsersRound,
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
      label: 'LinkedIn Linked',
      value: dash(`${counts.withLinkedin} / ${counts.total}`),
      hint: counts.total > counts.withLinkedin ? 'add the missing profile links' : 'every profile is linked',
      icon: LinkedinIcon,
      tone: 'bg-sky-50 text-sky-600',
    },
  ];

  const isHiding = statusTarget && statusTarget.status !== TEAM_MEMBER_STATUS.INACTIVE;
  const canReorder = !hasFilters && items.length > 1;
  const viewPosition = viewTarget ? items.findIndex((item) => item._id === viewTarget._id) + 1 : 0;

  return (
    <div className="space-y-6 animate-rise-in">
      {/* Header - same layout and classes as VerticalManagementPage's header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Team Management</h1>
          <p className="text-sm text-slate-500 mt-1">Manage the people shown in the website's About page team section.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          disabled={isLoading}
          className="btn-primary shrink-0 w-full sm:w-auto px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 font-medium bg-linear-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 shadow-md shadow-teal-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <UserPlus size={18} />
          Add Team Member
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
            <h2 className="text-lg font-bold text-slate-800">All Team Members</h2>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
              <Info size={12} className="shrink-0" />
              In the order customers see them on the About page
            </p>
          </div>
          <button
            type="button"
            onClick={loadMembers}
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
              placeholder="Search by name or designation"
              aria-label="Search team members"
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

          <SegmentedFilter label="Filter by visibility" options={STATUS_FILTERS} value={statusFilter} onChange={setStatusFilter} />
        </div>

        {!isLoading && visibleMembers.length === 0 ? (
          hasFilters ? (
            <NoMatches onClear={clearFilters} />
          ) : (
            <EmptyState onAdd={openCreate} />
          )
        ) : (
          <TeamMemberGrid
            members={visibleMembers}
            isLoading={isLoading}
            canReorder={canReorder}
            reorderBusy={isReordering}
            onMove={moveMember}
            onView={setViewTarget}
            onEdit={(member) => setFormState({ member })}
            onToggleStatus={setStatusTarget}
            onDelete={setDeleteTarget}
          />
        )}

        {ready && items.length > 0 && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-4 py-3.5 sm:px-6 border-t border-slate-100 bg-slate-50/60">
            <p className="text-xs text-slate-500 text-center sm:text-left">
              Showing <span className="font-semibold text-slate-700">{visibleMembers.length}</span> of{' '}
              <span className="font-semibold text-slate-700">{counts.total}</span> members ·{' '}
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
        <TeamMemberFormModal member={formState.member} nextOrder={nextOrder} onClose={closeForm} onSaved={handleSaved} />
      )}

      {viewTarget && (
        <TeamMemberDetailsModal member={viewTarget} position={viewPosition} onClose={closeView} onEdit={editFromView} />
      )}

      {statusTarget && (
        <ConfirmDialog
          title={isHiding ? 'Hide this team member?' : 'Show this team member?'}
          icon={isHiding ? PauseCircle : PlayCircle}
          tone={isHiding ? 'warning' : 'success'}
          confirmLabel={isHiding ? 'Yes, Hide' : 'Yes, Show'}
          busy={isBusy}
          onCancel={closeStatus}
          onConfirm={confirmStatus}
          message={
            <>
              <span className="font-semibold text-slate-700">{statusTarget.name}</span>{' '}
              {isHiding
                ? 'will be removed from the About page until you show them again.'
                : 'will appear in the About page’s team section again.'}
            </>
          }
        />
      )}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete this team member?"
          icon={Trash2}
          confirmLabel="Yes, Delete"
          busy={isBusy}
          onCancel={closeDelete}
          onConfirm={confirmDelete}
          message={
            <>
              <span className="font-semibold text-slate-700">{deleteTarget.name}</span> will be removed from this list and
              from the About page.
              <span className="mt-2 block text-xs text-slate-400">To take the card down only for a while, hide it instead.</span>
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
          <UsersRound size={28} />
        </div>
      </div>
      <h3 className="text-lg font-bold text-slate-800">No team members yet</h3>
      <p className="text-sm text-slate-500 mt-1 max-w-sm">
        Until you add someone, the “Meet the team” section stays hidden on the About page. Start with your founders.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-6 px-5 py-2.5 rounded-xl flex items-center gap-2 font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors"
      >
        <UserPlus size={18} />
        Add your first team member
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
      <h3 className="text-base font-bold text-slate-800">No team members match these filters</h3>
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
