import { Check, ListChecks, Mail, Plus, X } from 'lucide-react';
import { Avatar } from '@/components/common/avatar/index.js';
import { buildProfileImageUrl } from '@/features/auth/index.js';
import { getAccountStatus } from '@/features/provider/index.js';
import { isProviderSuspended } from '@/features/providerAssignment/index.js';
import { buildServiceCategoryIconUrl } from '@/features/serviceCategory/index.js';
import { ServiceCategoryIcon } from '@/pages/serviceCategories/components/index.js';

// How many category chips to show before collapsing the rest into "+N more".
const MAX_CATEGORY_CHIPS = 4;

const noop = () => {};

// Faded, "not-allowed" look for a suspended provider's row.
const BLOCKED_ROW = 'opacity-60 bg-slate-50/70 cursor-not-allowed [&_button]:cursor-not-allowed';

// Provider assignment listing: a table from `lg` up, stacked cards below it.
// Purely presentational - the page owns data loading, filters and dialogs.
// Each row is { provider, assignments } (see buildAssignmentBoard). A chip's
// "x" removes that one assignment; "Manage" opens the full category picker.
// A suspended provider's row is disabled: its buttons do nothing and any
// click on the row calls onBlocked(row) instead (the page shows a toast).
export default function ProviderAssignmentTable({
  rows,
  startIndex = 0,
  isLoading,
  onManage,
  onRemove,
  onStatusChange,
  onBlocked,
}) {
  if (isLoading && rows.length === 0) return <TableSkeleton />;

  // Per-row props: real handlers for a live row; for a suspended one the
  // buttons are no-ops and the click bubbles to the row's onBlocked.
  const rowProps = (row) => {
    const blocked = isProviderSuspended(row.provider);
    return {
      blocked,
      onManage: blocked ? noop : onManage,
      onRemove: blocked ? noop : onRemove,
      onStatusChange: blocked ? noop : onStatusChange,
      containerProps: blocked
        ? { onClick: () => onBlocked(row), 'aria-disabled': true, title: 'Provider is suspended' }
        : {},
    };
  };

  return (
    <div className={`transition-opacity duration-200 ${isLoading ? 'opacity-60' : ''}`}>
      {/* Desktop */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <th scope="col" className="w-14 px-6 py-3.5">#</th>
              <th scope="col" className="w-72 px-6 py-3.5">Provider</th>
              <th scope="col" className="px-6 py-3.5">Assigned categories</th>
              <th scope="col" className="px-6 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, index) => {
              const { blocked, onManage: manage, onRemove: remove, onStatusChange: statusChange, containerProps } = rowProps(row);
              return (
                <tr
                  key={row.provider._id}
                  {...containerProps}
                  className={`group transition-colors animate-rise-in ${blocked ? BLOCKED_ROW : 'hover:bg-teal-50/30'}`}
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  <td className="px-6 py-4 align-top text-slate-400 font-medium tabular-nums">{startIndex + index + 1}</td>
                  <td className="px-6 py-4 align-top">
                    <ProviderIdentity provider={row.provider} />
                  </td>
                  <td className="px-6 py-4">
                    <CategoryChips row={row} onManage={manage} onRemove={remove} onStatusChange={statusChange} />
                  </td>
                  <td className="px-6 py-4 align-top">
                    <div className="flex justify-end">
                      <ManageButton row={row} onManage={manage} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile / tablet */}
      <ul className="lg:hidden divide-y divide-slate-100">
        {rows.map((row, index) => {
          const { blocked, onManage: manage, onRemove: remove, onStatusChange: statusChange, containerProps } = rowProps(row);
          return (
            <li
              key={row.provider._id}
              {...containerProps}
              className={`p-3.5 min-[420px]:p-4 animate-rise-in ${blocked ? BLOCKED_ROW : ''}`}
              style={{ animationDelay: `${index * 40}ms` }}
            >
              <div className="flex items-start justify-between gap-2 min-[420px]:gap-3">
                <ProviderIdentity provider={row.provider} />
                <CountBadge count={row.assignments.length} />
              </div>
              <div className="mt-3">
                <CategoryChips row={row} onManage={manage} onRemove={remove} onStatusChange={statusChange} />
              </div>
              <div className="mt-3 flex justify-end border-t border-dashed border-slate-100 pt-3">
                <ManageButton row={row} onManage={manage} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ProviderIdentity({ provider }) {
  const status = getAccountStatus(provider.accountStatus);
  return (
    <div className="flex items-center gap-3 min-w-0">
      <span className="relative shrink-0">
        <Avatar
          src={buildProfileImageUrl(provider)}
          name={provider.fullName}
          className="h-10 w-10 text-sm ring-2 ring-white shadow-sm"
        />
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-white ${status.dot}`}
          title={status.label}
          aria-hidden="true"
        />
      </span>
      <div className="min-w-0">
        <p className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-slate-800 truncate">{provider.fullName}</span>
          {isProviderSuspended(provider) && (
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${status.badge}`}>
              {status.label}
            </span>
          )}
        </p>
        <p className="flex items-center gap-1 text-xs text-slate-400 truncate">
          <Mail size={11} className="shrink-0" />
          <span className="truncate">{provider.email}</span>
        </p>
      </div>
    </div>
  );
}

function CountBadge({ count }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
        count > 0 ? 'bg-teal-50 text-teal-700 ring-teal-600/15' : 'bg-slate-50 text-slate-500 ring-slate-200'
      }`}
    >
      {count}
      <span className="ml-1 hidden min-[380px]:inline">{count === 1 ? 'category' : 'categories'}</span>
      <span className="sr-only min-[380px]:hidden"> {count === 1 ? 'category' : 'categories'}</span>
    </span>
  );
}

// The provider's categories as removable chips; beyond MAX_CATEGORY_CHIPS the
// rest collapse into a "+N more" chip that opens the picker.
function CategoryChips({ row, onManage, onRemove, onStatusChange }) {
  const { provider, assignments } = row;

  if (assignments.length === 0) {
    return (
      <button
        type="button"
        onClick={() => onManage(row)}
        className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-left text-xs font-medium text-slate-500 hover:border-teal-400 hover:bg-teal-50/50 hover:text-teal-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50"
      >
        <Plus size={13} className="shrink-0" />
        Not assigned yet - assign a category
      </button>
    );
  }

  const shown = assignments.slice(0, MAX_CATEGORY_CHIPS);
  const hidden = assignments.slice(MAX_CATEGORY_CHIPS);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {shown.map((entry) => {
        const isPending = entry.status === 'Pending';
        const isRejected = entry.status === 'Rejected';
        const isApproved = !isPending && !isRejected;

        let tooltip = `${entry.category.name} (${entry.status || 'Approved'})`;
        if (entry.assignedBy?.fullName) tooltip += ` • Added by: ${entry.assignedBy.fullName}`;
        if (entry.statusChangedBy?.fullName) tooltip += ` • Decided by: ${entry.statusChangedBy.fullName}`;

        return (
          <span
            key={entry.assignmentId}
            title={tooltip}
            className={`inline-flex max-w-full items-center gap-1.5 rounded-lg py-1 pl-1 pr-1.5 text-xs font-semibold ring-1 ring-inset transition-all ${
              entry.category.isRemoved
                ? 'bg-slate-50 text-slate-500 ring-slate-200'
                : isPending
                ? 'bg-amber-50 text-amber-900 ring-amber-300/80 border border-amber-200 shadow-xs'
                : isApproved
                ? 'bg-emerald-50 text-emerald-900 ring-emerald-400/80 border border-emerald-300 shadow-xs hover:bg-emerald-100/60'
                : 'opacity-50 bg-slate-100 text-slate-400 ring-slate-200 border border-slate-200 cursor-not-allowed select-none'
            }`}
          >
            <ServiceCategoryIcon
              src={buildServiceCategoryIconUrl(entry.category)}
              className="w-5 h-5 rounded-md"
              glyphSize={12}
            />
            <span
              className={`min-w-0 truncate ${
                entry.category.isRemoved || isRejected ? 'line-through text-slate-400' : isApproved ? 'text-emerald-900 font-semibold' : ''
              }`}
            >
              {entry.category.name}
            </span>

            {/* Status indicator badge (only shown for Pending) */}
            {isPending && (
              <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold bg-amber-200/90 text-amber-900">
                Pending
              </span>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-0.5 ml-0.5">
              {isPending && onStatusChange && (
                <>
                  <button
                    type="button"
                    onClick={() => onStatusChange(row, entry, 'Approved')}
                    aria-label={`Approve ${entry.category.name} for ${provider.fullName}`}
                    title="Approve category (turns green)"
                    className="shrink-0 rounded p-0.5 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 transition-colors focus:outline-none cursor-pointer"
                  >
                    <Check size={13} strokeWidth={2.5} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onStatusChange(row, entry, 'Rejected')}
                    aria-label={`Reject ${entry.category.name} for ${provider.fullName}`}
                    title="Reject category (marks disabled)"
                    className="shrink-0 rounded p-0.5 text-rose-500 hover:bg-rose-100 hover:text-rose-700 transition-colors focus:outline-none cursor-pointer"
                  >
                    <X size={13} strokeWidth={2.5} />
                  </button>
                </>
              )}
              {isApproved && onStatusChange && (
                <>
                  <button
                    type="button"
                    onClick={() => onStatusChange(row, entry, 'Rejected')}
                    aria-label={`Reject ${entry.category.name} for ${provider.fullName}`}
                    title="Reject category (disable)"
                    className="shrink-0 rounded p-0.5 text-emerald-700/60 hover:bg-rose-100 hover:text-rose-700 transition-colors focus:outline-none cursor-pointer"
                  >
                    <X size={13} strokeWidth={2.5} />
                  </button>
                </>
              )}
              {isRejected && onStatusChange && (
                <>
                  <button
                    type="button"
                    onClick={() => onStatusChange(row, entry, 'Approved')}
                    aria-label={`Approve ${entry.category.name} for ${provider.fullName}`}
                    title="Approve / Re-enable category (turns green)"
                    className="shrink-0 rounded p-0.5 text-slate-500 hover:bg-emerald-100 hover:text-emerald-700 transition-colors focus:outline-none cursor-pointer"
                  >
                    <Check size={13} strokeWidth={2.5} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(row, entry)}
                    aria-label={`Remove ${provider.fullName} from ${entry.category.name}`}
                    title="Remove assignment"
                    className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors focus:outline-none cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                </>
              )}
            </div>
          </span>
        );
      })}
      {hidden.length > 0 && (
        <button
          type="button"
          onClick={() => onManage(row)}
          title={hidden.map((entry) => `${entry.category.name} (${entry.status || 'Approved'})`).join(', ')}
          className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-teal-50 hover:text-teal-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50"
        >
          +{hidden.length} more
        </button>
      )}
    </div>
  );
}

function ManageButton({ row, onManage }) {
  return (
    <button
      type="button"
      onClick={() => onManage(row)}
      aria-label={`Manage categories of ${row.provider.fullName}`}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50"
    >
      <ListChecks size={14} />
      Manage
    </button>
  );
}

function TableSkeleton() {
  return (
    <div className="divide-y divide-slate-100 animate-pulse" aria-label="Loading provider assignments">
      {[0, 1, 2, 3].map((row) => (
        <div key={row} className="flex items-center gap-4 px-4 lg:px-6 py-4">
          <div className="w-10 h-10 rounded-full bg-slate-100 shrink-0" />
          <div className="min-w-0 flex-1 lg:w-44 lg:flex-none space-y-2">
            <div className="h-3.5 w-32 max-w-full rounded bg-slate-100" />
            <div className="h-3 w-44 max-w-full rounded bg-slate-100" />
          </div>
          <div className="hidden lg:flex flex-1 gap-2">
            <div className="h-7 w-28 rounded-lg bg-slate-100" />
            <div className="h-7 w-24 rounded-lg bg-slate-100" />
          </div>
          <div className="ml-auto h-7 w-16 shrink-0 rounded-lg bg-slate-100 sm:w-20" />
        </div>
      ))}
    </div>
  );
}
