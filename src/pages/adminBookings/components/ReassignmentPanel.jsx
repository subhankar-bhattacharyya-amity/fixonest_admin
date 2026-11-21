import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { ArrowRight, Ban, Star, UserCog, UserX } from 'lucide-react';
import { Avatar } from '@/components/common/avatar/index.js';
import { DUMMY_PROVIDERS, getRejectedProviderIds, isAssignable, rankProvidersForBooking } from '@/features/adminBooking/index.js';

const SUGGESTIONS = 3;

// Shown on a rejected booking's details page: why it was rejected, how many
// providers have turned it down, and the best providers who are free at that
// time - "Assign" opens the Reassign dialog with that provider picked.
export default function ReassignmentPanel({ booking, onAssign, onBrowseAll, onCancel }) {
  const allBookings = useSelector((state) => state.adminBooking.items);
  const ranked = useMemo(() => rankProvidersForBooking(booking, DUMMY_PROVIDERS, allBookings), [booking, allBookings]);
  const suggestions = ranked.filter(isAssignable).slice(0, SUGGESTIONS);
  const freeCount = ranked.filter(isAssignable).length;
  const rejectedCount = getRejectedProviderIds(booking).size;

  return (
    <section className="overflow-hidden rounded-2xl border border-rose-200 bg-white shadow-sm ring-1 ring-rose-100 animate-rise-in">
      <div className="flex flex-col gap-3 bg-linear-to-r from-rose-50 to-orange-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-start gap-3">
          <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white shadow-md shadow-rose-500/30">
            <UserX size={20} />
            <span className="absolute -right-1 -top-1 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-rose-500 ring-2 ring-white" />
            </span>
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-800">Reassignment needed</h2>
            <p className="mt-0.5 text-sm text-slate-600">
              <span className="font-semibold">{booking.provider.name}</span> rejected it: {booking.rejectionReason}.
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1 text-rose-600">
                <Ban size={12} />
                Rejected by {rejectedCount} provider{rejectedCount === 1 ? '' : 's'} so far
              </span>
              <span>{freeCount} free for this slot</span>
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onBrowseAll}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-teal-500/30 transition-colors hover:bg-teal-600"
        >
          <UserCog size={15} />
          Choose a provider
        </button>
      </div>

      <div className="px-4 py-4 sm:px-6">
        {suggestions.length > 0 ? (
          <>
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Suggested - free at this time</p>
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {suggestions.map((row, index) => (
                <li
                  key={row.id}
                  className="flex flex-col rounded-xl border border-slate-100 p-3.5 transition-all hover:border-teal-200 hover:shadow-md animate-rise-in"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <span className="relative">
                      <Avatar name={row.name} className="h-10 w-10 text-sm" />
                      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">{row.name}</p>
                      <p className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Star size={11} className="fill-amber-400 text-amber-400" />
                        {row.rating.toFixed(1)}
                        <span className="text-slate-300">·</span>
                        <span className="truncate">{row.category}</span>
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    {row.bestMatch ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">Best match</span>
                    ) : (
                      <span className="text-[11px] text-slate-400">{row.jobsDone} jobs done</span>
                    )}
                    <button
                      type="button"
                      onClick={() => onAssign(row.id)}
                      className="group inline-flex items-center gap-1 rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 transition-colors hover:bg-teal-100"
                    >
                      Assign
                      <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="flex flex-col gap-3 rounded-xl bg-amber-50 px-4 py-3.5 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between">
            <span>No other provider in this vertical is free at this time. Ask the customer to reschedule, or cancel the booking.</span>
            <button
              type="button"
              onClick={onCancel}
              className="shrink-0 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50"
            >
              Cancel booking
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
