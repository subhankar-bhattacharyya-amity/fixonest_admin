import { PencilLine, PlayCircle, PauseCircle, Trash2 } from 'lucide-react';
import {
  SERVICE_CATEGORY_STATUS,
  getServiceCategoryStatus,
  buildServiceCategoryIconUrl,
} from '@/features/serviceCategory/index.js';
import { getVerticalVisual } from '@/features/vertical/index.js';
import { formatDate } from '@/utils/formatDate.js';
import ServiceCategoryIcon from './ServiceCategoryIcon.jsx';

// Service categories listing: a table from `lg` up, stacked cards below it.
// Purely presentational - the page owns data loading, filters and dialogs.
// `showVertical` adds the vertical each category belongs to (Super Admin
// only - an Admin's categories are all in their own vertical).
export default function ServiceCategoryTable({
  categories,
  startIndex = 0,
  isLoading,
  showVertical,
  onEdit,
  onToggleStatus,
  onDelete,
}) {
  if (isLoading && categories.length === 0) return <TableSkeleton />;

  const actions = { onEdit, onToggleStatus, onDelete };

  return (
    <div className={`transition-opacity duration-200 ${isLoading ? 'opacity-60' : ''}`}>
      {/* Desktop */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <th scope="col" className="w-14 px-6 py-3.5">#</th>
              <th scope="col" className="px-6 py-3.5">Category</th>
              <th scope="col" className="px-6 py-3.5">Description</th>
              {showVertical && <th scope="col" className="px-6 py-3.5">Vertical</th>}
              <th scope="col" className="px-6 py-3.5">Status</th>
              <th scope="col" className="px-6 py-3.5">Created</th>
              <th scope="col" className="px-6 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {categories.map((category, index) => (
              <tr
                key={category._id}
                className="group hover:bg-teal-50/30 transition-colors animate-rise-in"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <td className="px-6 py-4 text-slate-400 font-medium tabular-nums">{startIndex + index + 1}</td>
                <td className="px-6 py-4">
                  <CategoryIdentity category={category} />
                </td>
                <td className="px-6 py-4">
                  <Description text={category.description} className="max-w-xs" />
                </td>
                {showVertical && (
                  <td className="px-6 py-4">
                    <VerticalChip vertical={category.vertical_data} />
                  </td>
                )}
                <td className="px-6 py-4">
                  <StatusPill status={category.status} />
                </td>
                <td className="px-6 py-4 text-slate-500 whitespace-nowrap">{formatDate(new Date(category.createdAt))}</td>
                <td className="px-6 py-4">
                  <RowActions category={category} {...actions} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile / tablet */}
      <ul className="lg:hidden divide-y divide-slate-100">
        {categories.map((category, index) => (
          <li key={category._id} className="p-4 animate-rise-in" style={{ animationDelay: `${index * 40}ms` }}>
            <div className="flex items-start justify-between gap-3">
              <CategoryIdentity category={category} />
              <StatusPill status={category.status} />
            </div>
            <Description text={category.description} className="mt-3" />
            {showVertical && (
              <div className="mt-3">
                <VerticalChip vertical={category.vertical_data} />
              </div>
            )}
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-dashed border-slate-100 pt-3">
              <p className="text-xs text-slate-400">Created {formatDate(new Date(category.createdAt))}</p>
              <RowActions category={category} {...actions} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CategoryIdentity({ category }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <span className="relative shrink-0">
        <ServiceCategoryIcon src={buildServiceCategoryIconUrl(category)} className="w-11 h-11 rounded-xl" />
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-white ${getServiceCategoryStatus(category.status).dot}`}
          aria-hidden="true"
        />
      </span>
      <div className="min-w-0">
        <p className="font-semibold text-slate-800 truncate">{category.name}</p>
        <p className="text-xs font-mono text-slate-400 truncate">/{category.slug}</p>
      </div>
    </div>
  );
}

function Description({ text, className = '' }) {
  if (!text) return <p className={`text-xs italic text-slate-400 ${className}`}>No description</p>;
  return (
    <p title={text} className={`text-sm text-slate-500 line-clamp-2 ${className}`}>
      {text}
    </p>
  );
}

function VerticalChip({ vertical }) {
  if (!vertical?.name) return <span className="text-xs italic text-slate-400">No vertical</span>;
  const { icon: Icon, tone } = getVerticalVisual(vertical.name);
  return (
    <span className={`inline-flex max-w-full items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ring-1 ${tone}`}>
      <Icon size={13} className="shrink-0" />
      <span className="truncate">{vertical.display_name || vertical.name}</span>
    </span>
  );
}

function StatusPill({ status }) {
  const { label, badge, dot } = getServiceCategoryStatus(status);
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden="true" />
      {label}
    </span>
  );
}

function RowActions({ category, onEdit, onToggleStatus, onDelete }) {
  const isInactive = category.status === SERVICE_CATEGORY_STATUS.INACTIVE;
  const ToggleIcon = isInactive ? PlayCircle : PauseCircle;
  return (
    <div className="flex items-center justify-end gap-1 shrink-0">
      <button
        type="button"
        onClick={() => onEdit(category)}
        aria-label={`Edit ${category.name}`}
        title="Edit"
        className="p-2 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-teal-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50"
      >
        <PencilLine size={17} />
      </button>
      <button
        type="button"
        onClick={() => onToggleStatus(category)}
        aria-label={`${isInactive ? 'Activate' : 'Deactivate'} ${category.name}`}
        title={isInactive ? 'Activate' : 'Deactivate'}
        className={`p-2 rounded-lg text-slate-500 transition-colors focus:outline-none focus-visible:ring-2 ${
          isInactive
            ? 'hover:text-emerald-600 hover:bg-emerald-50 focus-visible:ring-emerald-500/50'
            : 'hover:text-amber-600 hover:bg-amber-50 focus-visible:ring-amber-500/50'
        }`}
      >
        <ToggleIcon size={17} />
      </button>
      <button
        type="button"
        onClick={() => onDelete(category)}
        aria-label={`Delete ${category.name}`}
        title="Delete"
        className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50"
      >
        <Trash2 size={17} />
      </button>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="divide-y divide-slate-100 animate-pulse" aria-label="Loading service categories">
      {[0, 1, 2, 3].map((row) => (
        <div key={row} className="flex items-center gap-4 px-4 lg:px-6 py-4">
          <div className="w-11 h-11 rounded-xl bg-slate-100 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-40 max-w-full rounded bg-slate-100" />
            <div className="h-3 w-28 max-w-full rounded bg-slate-100" />
          </div>
          <div className="hidden lg:block h-3.5 w-56 rounded bg-slate-100" />
          <div className="hidden lg:block h-6 w-28 rounded-lg bg-slate-100" />
          <div className="h-6 w-20 rounded-full bg-slate-100" />
        </div>
      ))}
    </div>
  );
}
