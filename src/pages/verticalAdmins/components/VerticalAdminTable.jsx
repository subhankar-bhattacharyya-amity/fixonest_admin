import { Mail, PencilLine, Phone, PlayCircle, PauseCircle, Trash2 } from 'lucide-react';
import { Avatar } from '@/components/common/avatar/index.js';
import { buildProfileImageUrl } from '@/features/auth/index.js';
import { getAdminStatus } from '@/features/verticalAdmin/index.js';
import { getVerticalVisual } from '@/features/vertical/index.js';
import { formatDate } from '@/utils/formatDate.js';

// Vertical admins listing: a table from `lg` up, stacked cards below it.
// Purely presentational - the page owns data loading, filters and dialogs.
export default function VerticalAdminTable({
  admins,
  startIndex = 0,
  isLoading,
  onEdit,
  onToggleStatus,
  onDelete,
}) {
  if (isLoading && admins.length === 0) return <TableSkeleton />;

  const actions = { onEdit, onToggleStatus, onDelete };

  return (
    <div className={`transition-opacity duration-200 ${isLoading ? 'opacity-60' : ''}`}>
      {/* Desktop */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <th scope="col" className="w-14 px-6 py-3.5">#</th>
              <th scope="col" className="px-6 py-3.5">Admin</th>
              <th scope="col" className="px-6 py-3.5">Vertical</th>
              <th scope="col" className="px-6 py-3.5">Phone</th>
              <th scope="col" className="px-6 py-3.5">Status</th>
              <th scope="col" className="px-6 py-3.5">Joined</th>
              <th scope="col" className="px-6 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {admins.map((admin, index) => (
              <tr
                key={admin._id}
                className="group hover:bg-teal-50/30 transition-colors animate-rise-in"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <td className="px-6 py-4 text-slate-400 font-medium tabular-nums">{startIndex + index + 1}</td>
                <td className="px-6 py-4">
                  <AdminIdentity admin={admin} />
                </td>
                <td className="px-6 py-4">
                  <VerticalChip vertical={admin.vertical_id} />
                </td>
                <td className="px-6 py-4 text-slate-600 whitespace-nowrap tabular-nums">{admin.phone}</td>
                <td className="px-6 py-4">
                  <StatusBadge status={admin.accountStatus} />
                </td>
                <td className="px-6 py-4 text-slate-500 whitespace-nowrap">{formatDate(new Date(admin.createdAt))}</td>
                <td className="px-6 py-4">
                  <RowActions admin={admin} {...actions} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile / tablet */}
      <ul className="lg:hidden divide-y divide-slate-100">
        {admins.map((admin, index) => (
          <li key={admin._id} className="p-4 animate-rise-in" style={{ animationDelay: `${index * 40}ms` }}>
            <div className="flex items-start justify-between gap-3">
              <AdminIdentity admin={admin} />
              <StatusBadge status={admin.accountStatus} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <VerticalChip vertical={admin.vertical_id} />
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1 text-xs text-slate-600 tabular-nums">
                <Phone size={12} className="text-slate-400" />
                {admin.phone}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-dashed border-slate-100 pt-3">
              <p className="text-xs text-slate-400">Joined {formatDate(new Date(admin.createdAt))}</p>
              <RowActions admin={admin} {...actions} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AdminIdentity({ admin }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <span className="relative shrink-0">
        <Avatar
          src={buildProfileImageUrl(admin)}
          name={admin.fullName}
          className="h-10 w-10 text-sm ring-2 ring-white shadow-sm"
        />
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-white ${getAdminStatus(admin.accountStatus).dot}`}
          aria-hidden="true"
        />
      </span>
      <div className="min-w-0">
        <p className="font-semibold text-slate-800 truncate">{admin.fullName}</p>
        <p className="flex items-center gap-1 text-xs text-slate-400 truncate">
          <Mail size={11} className="shrink-0" />
          <span className="truncate">{admin.email}</span>
        </p>
      </div>
    </div>
  );
}

function VerticalChip({ vertical }) {
  if (!vertical?.name) {
    return <span className="text-xs italic text-slate-400">No vertical</span>;
  }
  const { icon: Icon, tone } = getVerticalVisual(vertical.name);
  return (
    <span className={`inline-flex max-w-full items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ring-1 ${tone}`}>
      <Icon size={13} className="shrink-0" />
      <span className="truncate">{vertical.display_name || vertical.name}</span>
    </span>
  );
}

function StatusBadge({ status }) {
  const { label, badge, dot } = getAdminStatus(status);
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden="true" />
      {label}
    </span>
  );
}

function RowActions({ admin, onEdit, onToggleStatus, onDelete }) {
  const isSuspended = admin.accountStatus === 'suspended';
  const ToggleIcon = isSuspended ? PlayCircle : PauseCircle;
  return (
    <div className="flex items-center justify-end gap-1 shrink-0">
      <button
        type="button"
        onClick={() => onEdit(admin)}
        aria-label={`Edit ${admin.fullName}`}
        title="Edit"
        className="p-2 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-teal-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50"
      >
        <PencilLine size={17} />
      </button>
      <button
        type="button"
        onClick={() => onToggleStatus(admin)}
        aria-label={`${isSuspended ? 'Reactivate' : 'Suspend'} ${admin.fullName}`}
        title={isSuspended ? 'Reactivate' : 'Suspend'}
        className={`p-2 rounded-lg text-slate-500 transition-colors focus:outline-none focus-visible:ring-2 ${
          isSuspended
            ? 'hover:text-emerald-600 hover:bg-emerald-50 focus-visible:ring-emerald-500/50'
            : 'hover:text-amber-600 hover:bg-amber-50 focus-visible:ring-amber-500/50'
        }`}
      >
        <ToggleIcon size={17} />
      </button>
      <button
        type="button"
        onClick={() => onDelete(admin)}
        aria-label={`Remove ${admin.fullName}`}
        title="Remove"
        className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50"
      >
        <Trash2 size={17} />
      </button>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="divide-y divide-slate-100 animate-pulse" aria-label="Loading admins">
      {[0, 1, 2, 3].map((row) => (
        <div key={row} className="flex items-center gap-4 px-4 lg:px-6 py-4">
          <div className="w-10 h-10 rounded-full bg-slate-100 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-40 max-w-full rounded bg-slate-100" />
            <div className="h-3 w-56 max-w-full rounded bg-slate-100" />
          </div>
          <div className="hidden lg:block h-6 w-32 rounded-lg bg-slate-100" />
          <div className="hidden lg:block h-3.5 w-28 rounded bg-slate-100" />
          <div className="h-6 w-20 rounded-full bg-slate-100" />
        </div>
      ))}
    </div>
  );
}
