import { Star, X } from 'lucide-react';
import { StarDisplay } from './ReviewStars.jsx';

// The overall score and the 5-to-1 star bars for every visible rating in the
// viewer's scope - the same numbers customers see. Clicking a bar filters the
// list to that many stars; clicking it again clears it.
export default function RatingBreakdown({ summary, ready, activeRating, onPickRating }) {
  const visible = ready ? summary.visible : 0;
  const ratedCount = Object.values(summary.distribution ?? {}).reduce((sum, count) => sum + count, 0);

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-100">
      <div className="px-4 sm:px-6 py-4 border-b border-slate-100">
        <h2 className="text-lg font-bold text-slate-800">Rating breakdown</h2>
        <p className="text-xs text-slate-400 mt-0.5">Visible ratings - what customers see</p>
      </div>

      <div className="px-4 py-5 sm:px-6">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-2xl bg-linear-to-br from-amber-50 to-amber-100/60 ring-1 ring-amber-200/60">
            <span className="text-3xl font-bold leading-none text-slate-800 tabular-nums">
              {ready && ratedCount ? summary.average.toFixed(1) : '—'}
            </span>
            <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-amber-700">out of 5</span>
          </div>
          <div className="min-w-0">
            <StarDisplay value={ready ? summary.average : 0} size={18} />
            <p className="mt-1.5 text-xs text-slate-500">
              {ready ? `Based on ${visible.toLocaleString('en-IN')} visible rating${visible === 1 ? '' : 's'}` : 'Loading…'}
            </p>
          </div>
        </div>

        <ul className="mt-5 space-y-1.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = summary.distribution?.[star] ?? 0;
            const percent = ratedCount ? Math.round((count / ratedCount) * 100) : 0;
            const isActive = activeRating === star;
            return (
              <li key={star}>
                <button
                  type="button"
                  onClick={() => onPickRating(isActive ? null : star)}
                  aria-pressed={isActive}
                  title={isActive ? 'Show every rating' : `Show ${star}-star reviews only`}
                  className={`group flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-xs transition-colors ${
                    isActive ? 'bg-amber-50 ring-1 ring-amber-300' : 'hover:bg-slate-50'
                  }`}
                >
                  <span className="inline-flex w-8 shrink-0 items-center gap-0.5 font-semibold text-slate-600">
                    {star}
                    <Star size={11} className="fill-amber-400 text-amber-400" />
                  </span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <span
                      className="block h-full rounded-full bg-amber-400 transition-[width] duration-500"
                      style={{ width: `${ready ? percent : 0}%` }}
                    />
                  </span>
                  <span className="w-14 shrink-0 text-right tabular-nums text-slate-500">
                    {ready ? count.toLocaleString('en-IN') : '—'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {activeRating ? (
          <button
            type="button"
            onClick={() => onPickRating(null)}
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700"
          >
            <X size={13} />
            Show every rating
          </button>
        ) : (
          <p className="mt-3 text-[11px] text-slate-400">Tip: click a bar to see only those reviews.</p>
        )}
      </div>
    </section>
  );
}
