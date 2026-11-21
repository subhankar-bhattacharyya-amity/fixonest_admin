import { useState } from 'react';
import { CheckCircle2, ChevronDown, CircleDashed, Tags } from 'lucide-react';
import { SERVICE_CATEGORY_STATUS, buildServiceCategoryIconUrl } from '@/features/serviceCategory/index.js';
import { ServiceCategoryIcon } from '@/pages/serviceCategories/components/index.js';

// Tiles shown before the "Show all" toggle.
const COLLAPSED_COUNT = 6;

// One tile per service category with how many providers are assigned to it -
// same card and progress bar as VerticalCoverageBoard. Clicking a tile filters
// the listing below to that category; clicking it again clears the filter.
export default function CategoryCoverageBoard({ categories, providerCountByCategory, isLoading, showVertical, activeCategoryId, onSelect }) {
  const [expanded, setExpanded] = useState(false);

  const covered = categories.filter((category) => providerCountByCategory.has(category._id)).length;
  const percent = categories.length ? Math.round((covered / categories.length) * 100) : 0;
  const visible = expanded ? categories : categories.slice(0, COLLAPSED_COUNT);
  const hiddenCount = categories.length - COLLAPSED_COUNT;

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-4 py-4 sm:px-6 border-b border-slate-100">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-slate-800">Category Coverage</h2>
          <p className="text-xs text-slate-400 mt-0.5">Every category needs at least one provider. Click one to filter the list.</p>
        </div>
        {categories.length > 0 && (
          <div className="flex items-center gap-3 sm:min-w-56">
            <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden" aria-hidden="true">
              <div
                className="h-full rounded-full bg-linear-to-r from-teal-400 to-emerald-500 transition-[width] duration-700 ease-out"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="text-xs font-semibold text-slate-600 tabular-nums whitespace-nowrap">
              {covered}/{categories.length} covered
            </p>
          </div>
        )}
      </div>

      {isLoading && categories.length === 0 ? (
        <BoardSkeleton />
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center text-center px-6 py-10">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
            <Tags size={22} />
          </div>
          <p className="text-sm font-semibold text-slate-700">No service categories yet</p>
          <p className="text-xs text-slate-400 mt-1">Create a service category first, then assign providers to it.</p>
        </div>
      ) : (
        <>
          <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 p-3 min-[420px]:gap-3 min-[420px]:p-4 sm:p-6">
            {visible.map((category, index) => (
              <li key={category._id} className="animate-rise-in" style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}>
                <CoverageTile
                  category={category}
                  providerCount={providerCountByCategory.get(category._id) ?? 0}
                  showVertical={showVertical}
                  isActive={activeCategoryId === category._id}
                  onSelect={onSelect}
                />
              </li>
            ))}
          </ul>
          {hiddenCount > 0 && (
            <div className="flex justify-center border-t border-slate-100 bg-slate-50/60 px-4 py-2.5">
              <button
                type="button"
                onClick={() => setExpanded((current) => !current)}
                aria-expanded={expanded}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50"
              >
                {expanded ? 'Show fewer' : `Show all ${categories.length} categories`}
                <ChevronDown size={14} className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function CoverageTile({ category, providerCount, showVertical, isActive, onSelect }) {
  const isCovered = providerCount > 0;
  const isInactive = category.status === SERVICE_CATEGORY_STATUS.INACTIVE;
  const vertical = category.vertical_data?.display_name || category.vertical_data?.name;
  const subtitle = [showVertical && vertical, isInactive && 'Inactive'].filter(Boolean).join(' · ');
  const countLabel = isCovered ? `${providerCount} ${providerCount === 1 ? 'provider' : 'providers'}` : 'No provider';

  const surface = isActive
    ? 'border-teal-500 bg-teal-50/50 ring-2 ring-teal-500/20'
    : isCovered
      ? 'border-slate-100 bg-linear-to-br from-white to-slate-50/80 hover:border-teal-300 hover:bg-teal-50/30'
      : 'border-dashed border-slate-200 bg-white hover:border-teal-300 hover:bg-teal-50/30';

  return (
    <button
      type="button"
      onClick={() => onSelect(isActive ? '' : category._id)}
      aria-pressed={isActive}
      title={isActive ? 'Clear this filter' : `Show providers assigned to ${category.name}`}
      className={`flex w-full items-center gap-2.5 rounded-2xl border p-3 text-left transition-all min-[420px]:gap-3 min-[420px]:p-4 duration-200 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 ${surface}`}
    >
      <ServiceCategoryIcon src={buildServiceCategoryIconUrl(category)} className="w-11 h-11 rounded-xl" glyphSize={21} />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-slate-800 truncate">{category.name}</span>
        <span className="hidden text-xs text-slate-400 truncate min-[420px]:block">{subtitle || category.slug}</span>
        {/* Below 420px the badge on the right is hidden and the count sits here instead */}
        <span
          className={`flex items-center gap-1 text-xs font-semibold truncate min-[420px]:hidden ${
            isCovered ? 'text-emerald-600' : 'text-slate-400'
          }`}
        >
          {isCovered ? <CheckCircle2 size={12} className="shrink-0" /> : <CircleDashed size={12} className="shrink-0" />}
          <span className="truncate">{[countLabel, isInactive && 'Inactive'].filter(Boolean).join(' · ')}</span>
        </span>
      </span>
      <span
        className={`hidden shrink-0 items-center gap-1 min-[420px]:inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${
          isCovered ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/15' : 'bg-slate-50 text-slate-500 ring-slate-200'
        }`}
      >
        {isCovered ? <CheckCircle2 size={12} /> : <CircleDashed size={12} />}
        {countLabel}
      </span>
    </button>
  );
}

function BoardSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 p-4 sm:p-6 animate-pulse" aria-label="Loading categories">
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
