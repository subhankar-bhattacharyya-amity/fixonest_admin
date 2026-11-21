import { useMemo, useState } from 'react';
import { Ban, CalendarClock, Check, ChevronDown, History, Loader2, Search, Star, UserCog, UserX } from 'lucide-react';
import { Avatar } from '@/components/common/avatar/index.js';
import { Modal } from '@/components/common/modal/index.js';
import { formatBookingDate, formatSlot } from '@/features/providerBooking/index.js';
import { isAssignable, rankProvidersForBooking } from '@/features/adminBooking/index.js';

// Hand a booking to another provider of its vertical. Providers who are free
// at the booking's time and haven't rejected it can be picked - same-category
// ("Best match") first. Busy providers and those who already rejected it are
// listed below, greyed out, with the reason. `initialProviderId` preselects
// one (e.g. a suggestion clicked on the details page).
export default function ReassignProviderModal({ booking, providers, allBookings, initialProviderId = null, busy, onConfirm, onClose }) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(initialProviderId);
  const [note, setNote] = useState('');
  const [showUnavailable, setShowUnavailable] = useState(false);

  const ranked = useMemo(() => rankProvidersForBooking(booking, providers, allBookings), [booking, providers, allBookings]);
  const text = query.trim().toLowerCase();
  const matches = (row) => !text || `${row.name} ${row.category}`.toLowerCase().includes(text);
  const assignable = ranked.filter((row) => isAssignable(row) && matches(row));
  const unavailable = ranked.filter((row) => !isAssignable(row) && matches(row));
  const selected = ranked.find((row) => row.id === selectedId && isAssignable(row)) ?? null;
  const history = booking.previousProviders ?? [];

  return (
    <Modal
      title="Reassign provider"
      description={`${booking.bookingNumber || booking.id} · ${booking.service.name} (${booking.service.category})`}
      icon={UserCog}
      size="md"
      busy={busy}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm({ provider: selected, note })}
            disabled={busy || !selected}
            className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-medium shadow-sm shadow-teal-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            {selected ? `Assign to ${selected.name.split(' ')[0]}` : 'Choose a provider'}
          </button>
        </>
      }
    >
      {/* The slot that needs covering */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-teal-50 px-2.5 py-1.5 text-xs font-semibold text-teal-700">
          <CalendarClock size={13} />
          {formatBookingDate(booking)} · {formatSlot(booking)}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600">
          Currently: <span className="font-semibold">{booking.provider.name}</span>
          {booking.status === 'rejected' && <span className="text-rose-600">(rejected)</span>}
        </span>
      </div>

      {history.length > 0 && (
        <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-2.5">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <History size={13} />
            Offered before
          </p>
          <ul className="mt-1.5 space-y-1">
            {history.map((entry) => (
              <li key={`${entry.id}-${entry.at}`} className="text-xs text-slate-600">
                <span className="font-semibold">{entry.name}</span>{' '}
                <span className={entry.outcome === 'rejected' ? 'text-rose-600' : 'text-slate-400'}>
                  {entry.outcome === 'rejected' ? 'rejected' : 'was reassigned'}
                </span>
                {entry.reason ? ` - ${entry.reason}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="relative mt-4">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search providers"
          aria-label="Search providers"
          className="input-field bg-white pl-10"
        />
      </div>

      <p className="mt-4 mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
        Free at this time · {assignable.length}
      </p>
      <div role="radiogroup" aria-label="Provider" className="max-h-64 overflow-y-auto space-y-2 pr-1">
        {assignable.map((row) => (
          <ProviderOption key={row.id} row={row} selected={row.id === selectedId} onSelect={() => setSelectedId(row.id)} />
        ))}
        {assignable.length === 0 && (
          <div className="flex items-center gap-2.5 rounded-xl bg-amber-50 px-3.5 py-3 text-sm text-amber-800">
            <UserX size={16} className="shrink-0" />
            {text ? `No free provider matches "${query}".` : 'Nobody else is free at this time. Consider asking the customer to reschedule, or cancel the booking.'}
          </div>
        )}
      </div>

      {unavailable.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowUnavailable((value) => !value)}
            aria-expanded={showUnavailable}
            className="flex w-full items-center justify-between rounded-lg px-1 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700"
          >
            Not available · {unavailable.length}
            <ChevronDown size={14} className={`transition-transform ${showUnavailable ? 'rotate-180' : ''}`} />
          </button>
          {showUnavailable && (
            <ul className="mt-1 space-y-1.5">
              {unavailable.map((row) => (
                <li key={row.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-2.5 opacity-75">
                  <Avatar name={row.name} className="h-8 w-8 text-xs grayscale" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-600">{row.name}</span>
                    <span className="block truncate text-xs text-slate-400">{row.category}</span>
                  </span>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      row.rejectedBefore ? 'bg-rose-50 text-rose-600' : 'bg-slate-200/70 text-slate-500'
                    }`}
                  >
                    {row.rejectedBefore ? <Ban size={11} /> : <CalendarClock size={11} />}
                    {row.rejectedBefore ? 'Rejected this booking' : row.availability.reason}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mt-4 space-y-1">
        <label htmlFor="reassign-note" className="text-sm font-medium text-gray-700">
          Note for the activity log <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <input
          id="reassign-note"
          type="text"
          value={note}
          maxLength={150}
          onChange={(event) => setNote(event.target.value)}
          placeholder="e.g. Original provider unavailable"
          className="input-field bg-slate-50"
        />
      </div>
    </Modal>
  );
}

function ProviderOption({ row, selected, onSelect }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`w-full flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-all ${
        selected ? 'border-teal-400 bg-teal-50/60 ring-2 ring-teal-100' : 'border-slate-200 hover:border-teal-200 hover:bg-teal-50/30'
      }`}
    >
      <span className="relative">
        <Avatar name={row.name} className="h-10 w-10 text-sm" />
        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" title="Free at this time" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate font-semibold text-slate-800">{row.name}</span>
          {row.bestMatch && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">Best match</span>
          )}
        </span>
        <span className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
          {row.category}
          <span className="inline-flex items-center gap-0.5">
            <Star size={11} className="fill-amber-400 text-amber-400" />
            {row.rating.toFixed(1)}
          </span>
          <span>{row.jobsDone} jobs</span>
        </span>
      </span>
      <span
        className={`w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center ${
          selected ? 'border-teal-500 bg-teal-500 text-white' : 'border-slate-300'
        }`}
      >
        {selected && <Check size={12} strokeWidth={3} />}
      </span>
    </button>
  );
}
