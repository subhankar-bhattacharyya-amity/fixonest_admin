import { BOOKING_STATUS_META, formatDateTime } from '../definitions/providerBookings.js';

// Small building blocks of a booking details page, shared by the provider's
// and the Admin's details pages so both read the same.

// A white card with the panel's standard header bar.
export function DetailCard({ title, action, children }) {
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6 border-b border-slate-100">
        <h2 className="text-base font-bold text-slate-800">{title}</h2>
        {action}
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </section>
  );
}

// Icon tile + small label + value.
export function DetailInfo({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="w-9 h-9 shrink-0 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
        <Icon size={16} />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-semibold text-slate-700">{children}</p>
      </div>
    </div>
  );
}

// One label/value line of a breakdown.
export function DetailRow({ label, value, muted = false }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className={muted ? 'text-slate-400' : 'text-slate-500'}>{label}</dt>
      <dd className={`font-semibold text-right ${muted ? 'text-slate-400' : 'text-slate-700'}`}>{value}</dd>
    </div>
  );
}

// Newest-first activity timeline. `actorLabels` names who did each step from
// the viewer's point of view, e.g. { provider: 'You' } for the provider.
export function BookingActivity({ activity, actorLabels = {} }) {
  const labels = { provider: 'Provider', customer: 'Customer', system: 'Fixonest', admin: 'Admin', ...actorLabels };
  return (
    <ol>
      {[...activity].reverse().map((entry, index, list) => (
        <li key={`${entry.status}-${entry.at}-${index}`} className="relative flex gap-3 pb-5 last:pb-0">
          {index < list.length - 1 && <span aria-hidden="true" className="absolute left-1.75 top-5 bottom-0 w-px bg-slate-200" />}
          <span
            className={`relative mt-1 w-3.75 h-3.75 shrink-0 rounded-full ring-4 ring-white ${
              BOOKING_STATUS_META[entry.status]?.dot ?? 'bg-slate-300'
            }`}
          />
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-700">{entry.note}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {formatDateTime(entry.at)} · {labels[entry.actor] ?? entry.actor}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
