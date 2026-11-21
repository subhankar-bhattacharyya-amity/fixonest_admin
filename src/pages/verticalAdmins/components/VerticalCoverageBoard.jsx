import { CheckCircle2, CircleDashed, Layers, Plus } from 'lucide-react';
import { getVerticalVisual } from '@/features/vertical/index.js';

// One tile per vertical - just the vertical itself (icon, name, key) plus how
// many admins it has. Who those admins are lives in the "All Admins" table
// below. A vertical can have any number of admins, so every tile is
// clickable and opens "Add Vertical Admin" with that vertical pre-selected.
export default function VerticalCoverageBoard({ verticals, adminCountByVertical, isLoading, onAssign }) {
  const covered = verticals.filter((vertical) => adminCountByVertical.has(vertical._id)).length;
  const percent = verticals.length ? Math.round((covered / verticals.length) * 100) : 0;

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-4 py-4 sm:px-6 border-b border-slate-100">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-slate-800">Vertical Coverage</h2>
          <p className="text-xs text-slate-400 mt-0.5">Every vertical should have at least one admin.</p>
        </div>
        {verticals.length > 0 && (
          <div className="flex items-center gap-3 sm:min-w-56">
            <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden" aria-hidden="true">
              <div
                className="h-full rounded-full bg-linear-to-r from-teal-400 to-emerald-500 transition-[width] duration-700 ease-out"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="text-xs font-semibold text-slate-600 tabular-nums whitespace-nowrap">
              {covered}/{verticals.length} covered
            </p>
          </div>
        )}
      </div>

      {isLoading && verticals.length === 0 ? (
        <BoardSkeleton />
      ) : verticals.length === 0 ? (
        <div className="flex flex-col items-center text-center px-6 py-10">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
            <Layers size={22} />
          </div>
          <p className="text-sm font-semibold text-slate-700">No verticals yet</p>
          <p className="text-xs text-slate-400 mt-1">Create a vertical first, then assign it an admin.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 p-4 sm:p-6">
          {verticals.map((vertical, index) => (
            <li key={vertical._id} className="animate-rise-in" style={{ animationDelay: `${index * 50}ms` }}>
              <CoverageTile
                vertical={vertical}
                adminCount={adminCountByVertical.get(vertical._id) ?? 0}
                onAssign={onAssign}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CoverageTile({ vertical, adminCount, onAssign }) {
  const { icon: Icon, tone } = getVerticalVisual(vertical.name);
  const label = vertical.display_name || vertical.name;
  const isCovered = adminCount > 0;

  // Resting badge: the admin count (green) or "No admin" (grey). On hover it
  // turns into the "+ Add admin" action for the whole tile.
  const restingBadge = isCovered
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/15'
    : 'bg-slate-50 text-slate-500 ring-slate-200';

  return (
    <button
      type="button"
      onClick={() => onAssign(vertical)}
      title={`Add an admin to ${label}`}
      className={`group flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-all duration-200 hover:border-teal-300 hover:bg-teal-50/30 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 ${
        isCovered ? 'border-slate-100 bg-linear-to-br from-white to-slate-50/80' : 'border-dashed border-slate-200 bg-white'
      }`}
    >
      <span className={`w-11 h-11 shrink-0 rounded-xl ring-1 flex items-center justify-center ${tone}`}>
        <Icon size={21} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-slate-800 truncate">{label}</span>
        <span className="block text-xs font-mono text-slate-400 truncate">{vertical.name}</span>
      </span>
      <span
        className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset transition-colors group-hover:bg-teal-600 group-hover:text-white group-hover:ring-teal-600 ${restingBadge}`}
      >
        <span className="inline-flex items-center gap-1 group-hover:hidden">
          {isCovered ? <CheckCircle2 size={12} /> : <CircleDashed size={12} />}
          {isCovered ? `${adminCount} ${adminCount === 1 ? 'admin' : 'admins'}` : 'No admin'}
        </span>
        <span className="hidden items-center gap-1 group-hover:inline-flex">
          <Plus size={12} />
          Add admin
        </span>
      </span>
    </button>
  );
}

function BoardSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 p-4 sm:p-6 animate-pulse" aria-label="Loading verticals">
      {[0, 1, 2].map((tile) => (
        <div key={tile} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-4">
          <div className="w-11 h-11 rounded-xl bg-slate-100" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-32 rounded bg-slate-100" />
            <div className="h-3 w-20 rounded bg-slate-100" />
          </div>
          <div className="h-6 w-20 rounded-full bg-slate-100" />
        </div>
      ))}
    </div>
  );
}
