import { PencilLine, Trash2 } from 'lucide-react';
import { getVerticalVisual } from '@/features/vertical/index.js';
import { formatDateTime } from '@/utils/formatDate.js';

// Verticals listing: a table from `md` up, stacked cards below it. Purely
// presentational - the page owns data loading and the modals.
export default function VerticalTable({ verticals, startIndex = 0, isLoading, onEdit, onDelete }) {
  if (isLoading && verticals.length === 0) return <TableSkeleton />;

  return (
    <div className={`transition-opacity duration-200 ${isLoading ? 'opacity-60' : ''}`}>
      {/* Desktop / tablet */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <th scope="col" className="w-14 px-6 py-3.5">#</th>
              <th scope="col" className="px-6 py-3.5">Vertical</th>
              <th scope="col" className="px-6 py-3.5">Key</th>
              <th scope="col" className="px-6 py-3.5">Created</th>
              <th scope="col" className="px-6 py-3.5">Last updated</th>
              <th scope="col" className="px-6 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {verticals.map((vertical, index) => (
              <tr
                key={vertical._id}
                className="group hover:bg-teal-50/30 transition-colors animate-rise-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <td className="px-6 py-4 text-slate-400 font-medium tabular-nums">{startIndex + index + 1}</td>
                <td className="px-6 py-4">
                  <VerticalIdentity vertical={vertical} />
                </td>
                <td className="px-6 py-4">
                  <code className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded-md">{vertical.name}</code>
                </td>
                <td className="px-6 py-4 text-slate-500 whitespace-nowrap">{formatDateTime(vertical.createdAt)}</td>
                <td className="px-6 py-4 text-slate-500 whitespace-nowrap">{formatDateTime(vertical.updatedAt)}</td>
                <td className="px-6 py-4">
                  <RowActions vertical={vertical} onEdit={onEdit} onDelete={onDelete} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <ul className="md:hidden divide-y divide-slate-100">
        {verticals.map((vertical, index) => (
          <li key={vertical._id} className="p-4 animate-rise-in" style={{ animationDelay: `${index * 50}ms` }}>
            <div className="flex items-start justify-between gap-3">
              <VerticalIdentity vertical={vertical} />
              <RowActions vertical={vertical} onEdit={onEdit} onDelete={onDelete} />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-xs">
              <div>
                <dt className="text-slate-400">Created</dt>
                <dd className="mt-0.5 text-slate-600">{formatDateTime(vertical.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Last updated</dt>
                <dd className="mt-0.5 text-slate-600">{formatDateTime(vertical.updatedAt)}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}

function VerticalIdentity({ vertical }) {
  const { icon: Icon, tone } = getVerticalVisual(vertical.name);
  return (
    <div className="flex items-center gap-3 min-w-0">
      <span className={`w-10 h-10 shrink-0 rounded-xl ring-1 flex items-center justify-center ${tone}`}>
        <Icon size={20} />
      </span>
      <div className="min-w-0">
        <p className="font-semibold text-slate-800 truncate">{vertical.display_name || vertical.name}</p>
        {/* The key has its own column from md up. */}
        <p className="md:hidden text-xs font-mono text-slate-400 truncate">{vertical.name}</p>
      </div>
    </div>
  );
}

function RowActions({ vertical, onEdit, onDelete }) {
  const label = vertical.display_name || vertical.name;
  return (
    <div className="flex items-center justify-end gap-1.5 shrink-0">
      <button
        type="button"
        onClick={() => onEdit(vertical)}
        aria-label={`Edit ${label}`}
        title="Edit"
        className="p-2 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-teal-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50"
      >
        <PencilLine size={17} />
      </button>
      <button
        type="button"
        onClick={() => onDelete(vertical)}
        aria-label={`Delete ${label}`}
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
    <div className="divide-y divide-slate-100 animate-pulse" aria-label="Loading verticals">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex items-center gap-4 px-4 md:px-6 py-4">
          <div className="w-10 h-10 rounded-xl bg-slate-100 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-40 max-w-full rounded bg-slate-100" />
            <div className="h-3 w-24 rounded bg-slate-100" />
          </div>
          <div className="hidden md:block h-3.5 w-32 rounded bg-slate-100" />
          <div className="hidden md:block h-3.5 w-32 rounded bg-slate-100" />
          <div className="h-8 w-20 rounded-lg bg-slate-100" />
        </div>
      ))}
    </div>
  );
}
