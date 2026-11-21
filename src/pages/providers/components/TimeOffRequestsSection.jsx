import { useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'sonner';
import {
  Ban,
  CalendarCheck2,
  CalendarOff,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  RefreshCw,
  X,
} from 'lucide-react';
import { Avatar } from '@/components/common/avatar/index.js';
import { buildProfileImageUrl } from '@/features/auth/index.js';
import {
  TIME_OFF_FILTERS,
  TIME_OFF_PER_PAGE,
  TIME_OFF_STATUS,
  approveTimeOff,
  daysFromToday,
  fetchTimeOffCounts,
  fetchTimeOffRequests,
  formatShortMonth,
  formatStamp,
  formatTimeOffSpan,
  formatWeekdayShort,
  getTimeOffStatus,
  parseDateKey,
  rejectTimeOff,
  relativeDay,
  useProviderAvailability,
} from '@/features/providerAvailability/index.js';
import { ApproveTimeOffModal, RejectTimeOffModal } from './TimeOffDecisionModals.jsx';

const EMPTY_COPY = {
  pending: { title: 'No requests waiting', text: 'When a provider asks for time off, it shows up here for you to approve.' },
  approved: { title: 'No approved time off', text: 'Approved days off appear here.' },
  rejected: { title: 'Nothing rejected', text: "Requests you didn't approve appear here." },
  cancelled: { title: 'Nothing withdrawn', text: 'Requests a provider withdrew appear here.' },
  '': { title: 'No time-off requests yet', text: 'Providers ask for time off from their Booking Calendar.' },
};

// Provider Management's "Time-off Requests" tab (Super Admin and Admin - the
// backend limits an Admin to providers of their own vertical). A provider's
// day off only counts once it's approved here.
export default function TimeOffRequestsSection({ isSuperAdmin, adminVertical }) {
  const dispatch = useDispatch();
  const { requests, counts } = useProviderAvailability();
  const [statusFilter, setStatusFilter] = useState(TIME_OFF_STATUS.PENDING);
  const [upcomingOnly, setUpcomingOnly] = useState(true);
  const [page, setPage] = useState(1);
  const [decision, setDecision] = useState(null); // { type: 'approve' | 'reject', record }
  const [busy, setBusy] = useState(false);

  const isLoading = requests.status === 'loading' || requests.status === 'idle';
  const { items, meta } = requests;
  const total = meta?.total ?? items.length;
  const totalPages = Math.max(meta?.totalPages ?? 1, 1);
  const countsReady = counts.status === 'succeeded';

  const loadTable = useCallback(
    () => dispatch(fetchTimeOffRequests({ page, status: statusFilter, upcoming: upcomingOnly })),
    [dispatch, page, statusFilter, upcomingOnly],
  );
  const loadCounts = useCallback(() => dispatch(fetchTimeOffCounts()), [dispatch]);

  useEffect(() => {
    loadTable();
  }, [loadTable]);
  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  const refreshAll = () => {
    loadTable();
    loadCounts();
  };

  const pickFilter = (value) => {
    setStatusFilter(value);
    setPage(1);
  };

  const decide = async (values) => {
    const { type, record } = decision;
    setBusy(true);
    try {
      if (type === 'approve') {
        await dispatch(approveTimeOff({ id: record._id, notes: values.notes })).unwrap();
        toast.success('Time off approved', {
          description: `${record.provider_id?.fullName ?? 'The provider'} is off on ${relativeDay(record.date).toLowerCase()}.`,
        });
      } else {
        await dispatch(rejectTimeOff({ id: record._id, rejectReason: values.rejectReason })).unwrap();
        toast.success('Time off rejected', { description: 'The provider can see your reason on their calendar.' });
      }
      setDecision(null);
      // The row leaves the "Pending" list; step back if it was the last on its page.
      if (items.length === 1 && page > 1) setPage(page - 1);
      else loadTable();
      loadCounts();
    } catch {
      // Already toasted globally by lib/httpClient.js.
    } finally {
      setBusy(false);
    }
  };

  const stats = [
    {
      key: TIME_OFF_STATUS.PENDING,
      label: 'Awaiting Approval',
      value: counts.data.pending,
      hint: counts.data.pending ? 'Needs your decision - tap to review' : 'All caught up',
      icon: Clock3,
      tone: 'bg-amber-50 text-amber-600',
      highlight: counts.data.pending > 0,
    },
    {
      key: TIME_OFF_STATUS.APPROVED,
      label: 'Approved',
      value: counts.data.approved,
      hint: isSuperAdmin ? 'days off across all providers' : `days off in ${adminVertical || 'your vertical'}`,
      icon: CalendarCheck2,
      tone: 'bg-teal-50 text-teal-600',
    },
    {
      key: TIME_OFF_STATUS.REJECTED,
      label: 'Rejected',
      value: counts.data.rejected,
      hint: 'provider stayed available',
      icon: Ban,
      tone: 'bg-rose-50 text-rose-500',
    },
  ];

  const rangeStart = total === 0 ? 0 : (page - 1) * TIME_OFF_PER_PAGE + 1;
  const rangeEnd = Math.min(page * TIME_OFF_PER_PAGE, total);
  const activeFilter = TIME_OFF_FILTERS.find((item) => item.value === statusFilter);

  return (
    <>
      {/* Stats - same card markup as the Providers tab */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        {stats.map((stat, index) => (
          <button
            key={stat.key}
            type="button"
            onClick={() => pickFilter(stat.key)}
            aria-pressed={statusFilter === stat.key}
            className={`text-left bg-white rounded-2xl p-5 sm:p-6 shadow-sm border hover:shadow-md hover:-translate-y-0.5 transition-all animate-rise-in focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 ${
              stat.highlight ? 'border-amber-200 ring-1 ring-amber-100' : 'border-slate-100'
            }`}
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-500 mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-800 truncate">{countsReady ? stat.value : '—'}</p>
              </div>
              <div className={`relative w-12 h-12 shrink-0 rounded-xl flex items-center justify-center ${stat.tone}`}>
                <stat.icon size={24} />
                {stat.highlight && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 animate-ping" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500 ring-2 ring-white" />
                  </span>
                )}
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-400">{stat.hint}</p>
          </button>
        ))}
      </div>

      <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6 border-b border-slate-100">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-800">Time-off Requests</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {activeFilter?.label} · {upcomingOnly ? 'today onwards' : 'all dates'} · soonest first
            </p>
          </div>
          <button
            type="button"
            onClick={refreshAll}
            disabled={isLoading}
            aria-label="Refresh requests"
            title="Refresh"
            className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-teal-600 hover:border-teal-200 hover:bg-teal-50 transition-colors disabled:opacity-60"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 px-4 py-3 sm:px-6 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 bg-slate-50/40">
          <div className="overflow-x-auto no-scrollbar">
            <div className="inline-flex rounded-xl bg-slate-100 p-1" role="group" aria-label="Filter by status">
              {TIME_OFF_FILTERS.map((option) => {
                const active = statusFilter === option.value;
                const showCount = option.value === TIME_OFF_STATUS.PENDING && counts.data.pending > 0;
                return (
                  <button
                    key={option.value || 'all'}
                    type="button"
                    onClick={() => pickFilter(option.value)}
                    aria-pressed={active}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      active ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {option.label}
                    {showCount && (
                      <span className="min-w-4.5 px-1 rounded-full bg-amber-400 text-slate-900 text-[10px] font-bold tabular-nums">
                        {counts.data.pending}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="inline-flex items-center gap-2.5 text-sm text-slate-600 cursor-pointer select-none">
            <span className="relative inline-flex">
              <input
                type="checkbox"
                checked={upcomingOnly}
                onChange={(event) => {
                  setUpcomingOnly(event.target.checked);
                  setPage(1);
                }}
                className="peer sr-only"
              />
              <span className="w-9 h-5 rounded-full bg-slate-200 peer-checked:bg-teal-500 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-teal-500/50" />
              <span className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
            </span>
            Upcoming only
          </label>
        </div>

        {isLoading && items.length === 0 ? (
          <ListSkeleton />
        ) : items.length === 0 ? (
          <EmptyState copy={EMPTY_COPY[statusFilter] ?? EMPTY_COPY['']} upcomingOnly={upcomingOnly} onShowAll={() => setUpcomingOnly(false)} />
        ) : (
          <ul className={`divide-y divide-slate-100 transition-opacity duration-200 ${isLoading ? 'opacity-60' : ''}`}>
            {items.map((record, index) => (
              <RequestRow
                key={record._id}
                record={record}
                index={index}
                onApprove={() => setDecision({ type: 'approve', record })}
                onReject={() => setDecision({ type: 'reject', record })}
              />
            ))}
          </ul>
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

      {decision?.type === 'approve' && (
        <ApproveTimeOffModal record={decision.record} busy={busy} onConfirm={decide} onClose={() => !busy && setDecision(null)} />
      )}
      {decision?.type === 'reject' && (
        <RejectTimeOffModal record={decision.record} busy={busy} onConfirm={decide} onClose={() => !busy && setDecision(null)} />
      )}
    </>
  );
}

function RequestRow({ record, index, onApprove, onReject }) {
  const provider = record.provider_id ?? {};
  const meta = getTimeOffStatus(record.status);
  const isPending = record.status === TIME_OFF_STATUS.PENDING;
  const daysAway = daysFromToday(record.date);
  const isPast = daysAway < 0;
  const isSoon = isPending && daysAway >= 0 && daysAway <= 3;

  return (
    <li
      className={`flex flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center hover:bg-teal-50/30 transition-colors animate-rise-in ${
        isPast ? 'opacity-70' : ''
      }`}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex items-center gap-4 min-w-0 lg:w-80 lg:shrink-0">
        <DateTile date={record.date} tone={isPending ? 'amber' : record.status === TIME_OFF_STATUS.APPROVED ? 'teal' : 'slate'} />
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar src={buildProfileImageUrl(provider)} name={provider.fullName} className="h-8 w-8 text-xs" />
            <div className="min-w-0">
              <p className="font-semibold text-slate-800 truncate">{provider.fullName ?? 'Provider'}</p>
              <p className="text-xs text-slate-500 truncate">{provider.phone || provider.email}</p>
            </div>
          </div>
          <p className={`mt-1.5 text-xs font-medium ${isSoon ? 'text-amber-700' : 'text-slate-500'}`}>
            {relativeDay(record.date)} · {formatTimeOffSpan(record)}
          </p>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm text-slate-700 line-clamp-2">{record.reason}</p>
        <p className="text-xs text-slate-400 mt-1">
          Asked {formatStamp(record.createdAt)}
          {record.requestedByRole && record.requestedByRole !== 'provider' ? ' · added by an admin' : ''}
          {record.reviewedBy?.fullName && !isPending
            ? ` · ${record.status === TIME_OFF_STATUS.CANCELLED ? 'reviewed' : record.status} by ${record.reviewedBy.fullName}`
            : ''}
        </p>
        {record.status === TIME_OFF_STATUS.REJECTED && record.rejectReason && (
          <p className="text-xs text-rose-600 mt-1">Reason: {record.rejectReason}</p>
        )}
        {record.notes && record.status === TIME_OFF_STATUS.APPROVED && (
          <p className="text-xs text-slate-500 mt-1">Note: {record.notes}</p>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 lg:justify-end lg:w-64 lg:shrink-0">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset whitespace-nowrap ${meta.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
          {meta.short}
        </span>
        {isPending && !isPast && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onReject}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold border border-rose-200 text-rose-600 bg-white hover:bg-rose-50 transition-colors"
            >
              <X size={15} />
              Reject
            </button>
            <button
              type="button"
              onClick={onApprove}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold text-white bg-teal-500 hover:bg-teal-600 shadow-sm shadow-teal-500/30 transition-colors"
            >
              <Check size={15} />
              Approve
            </button>
          </div>
        )}
        {isPending && isPast && <span className="text-xs text-slate-400">Date has passed</span>}
      </div>
    </li>
  );
}

const TILE_TONES = {
  teal: 'bg-teal-50 text-teal-700',
  amber: 'bg-amber-50 text-amber-700',
  slate: 'bg-slate-100 text-slate-500',
};

function DateTile({ date, tone }) {
  return (
    <span className={`shrink-0 w-14 h-16 flex flex-col items-center justify-center rounded-xl ${TILE_TONES[tone]}`}>
      <span className="text-[11px] font-semibold uppercase leading-none">{formatShortMonth(date)}</span>
      <span className="text-xl font-bold leading-tight tabular-nums">{parseDateKey(date).getDate()}</span>
      <span className="text-[10px] font-medium opacity-70 leading-none">{formatWeekdayShort(date)}</span>
    </span>
  );
}

function ListSkeleton() {
  const block = 'animate-pulse rounded bg-slate-100';
  return (
    <ul className="divide-y divide-slate-100" aria-busy="true" aria-label="Loading requests">
      {Array.from({ length: 4 }, (_, index) => (
        <li key={index} className="flex items-center gap-4 px-4 py-4 sm:px-6">
          <div className={`w-14 h-16 rounded-xl ${block}`} />
          <div className="flex-1 space-y-2">
            <div className={`h-4 w-40 ${block}`} />
            <div className={`h-3 w-64 max-w-full ${block}`} />
          </div>
          <div className={`hidden sm:block h-9 w-44 rounded-xl ${block}`} />
        </li>
      ))}
    </ul>
  );
}

function EmptyState({ copy, upcomingOnly, onShowAll }) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-16">
      <div className="relative mb-5">
        <div className="absolute inset-0 rounded-3xl bg-teal-400/20 blur-xl" />
        <div className="relative w-16 h-16 rounded-2xl bg-linear-to-br from-teal-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-teal-500/30">
          <CalendarOff size={28} />
        </div>
      </div>
      <h3 className="text-lg font-bold text-slate-800">{copy.title}</h3>
      <p className="text-sm text-slate-500 mt-1 max-w-sm">{copy.text}</p>
      {upcomingOnly && (
        <button
          type="button"
          onClick={onShowAll}
          className="mt-5 px-4 py-2 rounded-xl text-sm font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors"
        >
          Include past dates
        </button>
      )}
    </div>
  );
}
