import { Check, Layers, UserX } from 'lucide-react';
import { formatMoney } from '@/features/providerBooking/index.js';

const ACTIVE = ['pending', 'accepted', 'in_progress'];

// Super Admin's "whole picture": one card per vertical with its booking count,
// share of all bookings, live jobs, rejected bookings and cash collected this
// month. Clicking a card filters the listing to that vertical (again to clear).
export default function VerticalOverview({ verticals, bookings, now, selectedId, onSelect }) {
  const isThisMonth = (iso) => {
    const date = new Date(iso);
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  };

  const rows = verticals
    .map((vertical) => {
      const list = bookings.filter((booking) => booking.vertical?.id === vertical.id);
      const paid = list.filter((booking) => booking.status === 'paid' && booking.cashPayment && isThisMonth(booking.cashPayment.receivedAt));
      return {
        ...vertical,
        total: list.length,
        active: list.filter((booking) => ACTIVE.includes(booking.status)).length,
        rejected: list.filter((booking) => booking.status === 'rejected').length,
        revenue: paid.reduce((sum, booking) => sum + booking.cashPayment.amountReceived, 0),
      };
    })
    .sort((a, b) => b.total - a.total);
  const grandTotal = bookings.length || 1;

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6 border-b border-slate-100">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-slate-800">By Vertical</h2>
          <p className="text-xs text-slate-400 mt-0.5">Tap a vertical to see only its bookings</p>
        </div>
        {selectedId && (
          <button type="button" onClick={() => onSelect(selectedId)} className="text-xs font-semibold text-teal-600 hover:text-teal-700">
            Show all verticals
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 sm:p-6">
        {rows.map((row, index) => {
          const selected = row.id === selectedId;
          const share = Math.round((row.total / grandTotal) * 100);
          return (
            <button
              key={row.id}
              type="button"
              onClick={() => onSelect(row.id)}
              aria-pressed={selected}
              className={`relative text-left rounded-2xl border p-4 transition-all animate-rise-in focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 ${
                selected
                  ? 'border-teal-300 bg-teal-50/50 ring-2 ring-teal-100'
                  : 'border-slate-100 hover:border-teal-200 hover:shadow-md hover:-translate-y-0.5'
              }`}
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${
                      selected ? 'bg-teal-500 text-white' : 'bg-teal-50 text-teal-600'
                    }`}
                  >
                    {selected ? <Check size={18} strokeWidth={3} /> : <Layers size={18} />}
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 truncate">{row.name}</p>
                    <p className="text-xs text-slate-400">
                      {row.total} booking{row.total === 1 ? '' : 's'} · {share}%
                    </p>
                  </div>
                </div>
                {row.rejected > 0 && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-600">
                    <UserX size={11} />
                    {row.rejected}
                  </span>
                )}
              </div>

              <div className="mt-4 h-1.5 rounded-full bg-slate-100 overflow-hidden" aria-hidden="true">
                <span className="block h-full rounded-full bg-teal-500 transition-all duration-500" style={{ width: `${share}%` }} />
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-slate-400">Live jobs</dt>
                  <dd className="font-bold text-slate-700">{row.active}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-400">Cash this month</dt>
                  <dd className="font-bold text-emerald-600">{formatMoney(row.revenue)}</dd>
                </div>
              </dl>
            </button>
          );
        })}
      </div>
    </section>
  );
}
