import { useMemo, useState } from 'react';
import { CalendarDays, CalendarPlus, Clock, DoorClosed, History, PencilLine, Repeat, Sparkles, Trash2 } from 'lucide-react';
import {
  HOLIDAY_TYPE_OPTIONS,
  getHolidayType,
  nextOccurrence,
  parseDate,
  relativeDayLabel,
  daysUntil,
  formatTime,
  todayString,
} from '@/features/workingHours/index.js';

const VIEWS = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
  { value: 'all', label: 'All' },
];

const monthFormat = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' });
const shortMonth = new Intl.DateTimeFormat('en-IN', { month: 'short' });
const shortWeekday = new Intl.DateTimeFormat('en-IN', { weekday: 'short' });

// "Manage Holidays": the dates the business closes, or opens for special
// hours. Upcoming shows yearly holidays on their next anniversary; Past shows
// one-off dates already gone, newest first. Rows are grouped by month.
export default function HolidaySection({ id, holidays, isLoading, onAdd, onEdit, onDelete }) {
  const [view, setView] = useState('upcoming');
  const [typeFilter, setTypeFilter] = useState('');
  const today = todayString();

  // Every holiday with the date it's shown on and whether it's still ahead.
  const entries = useMemo(
    () =>
      holidays.map((holiday) => {
        const shownDate = nextOccurrence(holiday, today);
        return { holiday, shownDate, isPast: shownDate < today };
      }),
    [holidays, today],
  );

  const counts = useMemo(
    () => ({
      upcoming: entries.filter((entry) => !entry.isPast).length,
      past: entries.filter((entry) => entry.isPast).length,
      all: entries.length,
    }),
    [entries],
  );

  const groups = useMemo(() => {
    const visible = entries
      .filter((entry) => (view === 'all' ? true : view === 'past' ? entry.isPast : !entry.isPast))
      .filter((entry) => !typeFilter || entry.holiday.type === typeFilter)
      .sort((a, b) =>
        view === 'past' ? b.shownDate.localeCompare(a.shownDate) : a.shownDate.localeCompare(b.shownDate),
      );
    const byMonth = new Map();
    visible.forEach((entry) => {
      const key = entry.shownDate.slice(0, 7);
      if (!byMonth.has(key)) byMonth.set(key, []);
      byMonth.get(key).push(entry);
    });
    return Array.from(byMonth, ([month, items]) => ({ month, items }));
  }, [entries, view, typeFilter]);

  const nextId = useMemo(() => {
    const upcoming = entries.filter((entry) => !entry.isPast).sort((a, b) => a.shownDate.localeCompare(b.shownDate));
    return upcoming[0]?.holiday._id ?? null;
  }, [entries]);

  const isEmpty = !isLoading && groups.length === 0;

  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden scroll-mt-6"
    >
      {/* Same header bar as VerticalManagementPage's "All Verticals" */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-4 sm:px-6 border-b border-slate-100">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <CalendarDays size={20} />
          </div>
          <div className="min-w-0">
            <h2 id={`${id}-title`} className="text-lg font-bold text-slate-800">
              Manage Holidays
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Dates the business closes or runs on special hours</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onAdd}
          disabled={isLoading}
          className="btn-primary shrink-0 w-full sm:w-auto px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm font-medium bg-linear-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 shadow-md shadow-teal-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CalendarPlus size={17} />
          Add Holiday
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between border-b border-slate-100 bg-slate-50/40">
        <div className="inline-flex rounded-xl bg-slate-100 p-1" role="group" aria-label="Which holidays to show">
          {VIEWS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setView(option.value)}
              aria-pressed={view === option.value}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                view === option.value ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {option.label}
              <span
                className={`rounded-full px-1.5 text-[10px] tabular-nums ${
                  view === option.value ? 'bg-teal-50 text-teal-700' : 'bg-slate-200/70 text-slate-500'
                }`}
              >
                {isLoading ? '–' : counts[option.value]}
              </span>
            </button>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0 -mx-1 px-1" role="group" aria-label="Filter by type">
          <TypeChip active={!typeFilter} onClick={() => setTypeFilter('')} label="All types" />
          {HOLIDAY_TYPE_OPTIONS.map((option) => (
            <TypeChip
              key={option.value}
              active={typeFilter === option.value}
              onClick={() => setTypeFilter(typeFilter === option.value ? '' : option.value)}
              label={option.label}
              icon={option.icon}
            />
          ))}
        </div>
      </div>

      {isLoading ? (
        <HolidaySkeleton />
      ) : isEmpty ? (
        <EmptyState
          view={view}
          filtered={Boolean(typeFilter)}
          onAdd={onAdd}
          onClear={() => setTypeFilter('')}
          onShowAll={() => setView('all')}
          hasAny={holidays.length > 0}
        />
      ) : (
        <div className="divide-y divide-slate-100">
          {groups.map((group) => (
            <div key={group.month}>
              <p className="px-4 pt-3 pb-1 sm:px-6 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {monthFormat.format(parseDate(`${group.month}-01`))}
              </p>
              <ul className="px-2 pb-2 sm:px-3">
                {group.items.map((entry, index) => (
                  <HolidayRow
                    key={entry.holiday._id}
                    entry={entry}
                    today={today}
                    isNext={entry.holiday._id === nextId}
                    index={index}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function HolidayRow({ entry, today, isNext, index, onEdit, onDelete }) {
  const { holiday, shownDate, isPast } = entry;
  const type = getHolidayType(holiday.type);
  const date = parseDate(shownDate);
  const soon = !isPast && daysUntil(shownDate, today) <= 7;

  return (
    <li
      className={`group relative flex items-center gap-3 sm:gap-4 rounded-xl px-2 py-3 sm:px-3 transition-colors hover:bg-slate-50 animate-rise-in ${
        isNext ? 'bg-teal-50/40 ring-1 ring-teal-100' : ''
      } ${isPast ? 'opacity-70' : ''}`}
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
    >
      {/* Calendar tile */}
      <div
        className={`flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-linear-to-br text-white shadow-md ${
          isPast ? 'from-slate-400 to-slate-500 shadow-slate-400/20' : type.tile
        }`}
        aria-hidden="true"
      >
        <span className="text-[10px] font-semibold uppercase tracking-wider opacity-90">{shortMonth.format(date)}</span>
        <span className="text-xl sm:text-2xl font-bold leading-none">{date.getDate()}</span>
        <span className="text-[10px] font-medium opacity-80">{shortWeekday.format(date)}</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="truncate text-sm sm:text-[15px] font-semibold text-slate-800">{holiday.title}</p>
          {isNext && (
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-500 px-2 py-0.5 text-[10px] font-semibold text-white">
              <Sparkles size={10} />
              Next up
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${type.badge}`}
          >
            <type.icon size={11} />
            {type.label}
          </span>
          {holiday.isClosed ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
              <DoorClosed size={11} />
              Closed all day
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
              <Clock size={11} />
              {formatTime(holiday.openTime)} – {formatTime(holiday.closeTime)}
            </span>
          )}
          {holiday.recurringAnnually && (
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700">
              <Repeat size={11} />
              Every year
            </span>
          )}
        </div>
        {holiday.description && <p className="mt-1 truncate text-xs text-slate-400">{holiday.description}</p>}
      </div>

      <span
        className={`hidden md:inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold ${
          isPast ? 'text-slate-400' : soon ? 'bg-amber-50 text-amber-700' : 'text-slate-500'
        }`}
      >
        {isPast && <History size={12} />}
        {relativeDayLabel(shownDate, today)}
      </span>

      <div className="flex shrink-0 items-center gap-1 sm:opacity-60 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={() => onEdit(holiday)}
          aria-label={`Edit ${holiday.title}`}
          title="Edit"
          className="p-2 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
        >
          <PencilLine size={16} />
        </button>
        <button
          type="button"
          onClick={() => onDelete(holiday)}
          aria-label={`Delete ${holiday.title}`}
          title="Delete"
          className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </li>
  );
}

function TypeChip({ active, onClick, label, icon: Icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition-colors ${
        active ? 'bg-teal-600 text-white ring-teal-600' : 'bg-white text-slate-600 ring-slate-200 hover:ring-slate-300'
      }`}
    >
      {Icon && <Icon size={12} />}
      {label}
    </button>
  );
}

function HolidaySkeleton() {
  return (
    <ul className="p-3 space-y-2" aria-hidden="true">
      {[0, 1, 2].map((key) => (
        <li key={key} className="flex items-center gap-4 rounded-xl px-3 py-3">
          <div className="h-16 w-16 rounded-2xl bg-slate-100 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/3 rounded bg-slate-100 animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-slate-100 animate-pulse" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function EmptyState({ view, filtered, hasAny, onAdd, onClear, onShowAll }) {
  if (filtered) {
    return (
      <div className="flex flex-col items-center text-center px-6 py-14">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
          <CalendarDays size={24} />
        </div>
        <h3 className="text-base font-bold text-slate-800">No holidays of this type</h3>
        <p className="text-sm text-slate-500 mt-1">Pick another type, or show every type.</p>
        <button
          type="button"
          onClick={onClear}
          className="mt-5 px-4 py-2 rounded-xl text-sm font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors"
        >
          Show all types
        </button>
      </div>
    );
  }

  if (view === 'past') {
    return (
      <div className="flex flex-col items-center text-center px-6 py-14">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
          <History size={24} />
        </div>
        <h3 className="text-base font-bold text-slate-800">No past holidays</h3>
        <p className="text-sm text-slate-500 mt-1">One-off dates move here once they’ve gone by.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center px-6 py-16">
      <div className="relative mb-5">
        <div className="absolute inset-0 rounded-3xl bg-teal-400/20 blur-xl" />
        <div className="relative w-16 h-16 rounded-2xl bg-linear-to-br from-teal-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-teal-500/30">
          <CalendarDays size={28} />
        </div>
      </div>
      <h3 className="text-lg font-bold text-slate-800">
        {hasAny ? 'No upcoming holidays' : 'No holidays set yet'}
      </h3>
      <p className="text-sm text-slate-500 mt-1 max-w-sm">
        Add the days Fixonest closes, so customers can’t book a provider on them.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={onAdd}
          className="px-5 py-2.5 rounded-xl flex items-center gap-2 font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors"
        >
          <CalendarPlus size={18} />
          Add a holiday
        </button>
        {hasAny && (
          <button
            type="button"
            onClick={onShowAll}
            className="px-5 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            See all
          </button>
        )}
      </div>
    </div>
  );
}
