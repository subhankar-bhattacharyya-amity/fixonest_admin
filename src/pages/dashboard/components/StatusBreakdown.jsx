import { Link } from 'react-router-dom';
import { BOOKING_STATUS_META } from '@/features/providerBooking/index.js';
import { STATUS_CHART_COLORS } from '../definitions/chartTheme.js';

const ORDER = ['pending', 'accepted', 'in_progress', 'completed', 'rejected', 'cancelled'];

// Where every booking stands: one stacked bar, then a row per status with its
// count and share. Each row links to the bookings list filtered to that status
// (`listPath` + ?status=...).
export default function StatusBreakdown({ bookings = [], counts = null, listPath }) {
  const total = counts?.total ?? (bookings.length || 1);
  const rows = ORDER.map((status) => {
    let count = 0;
    if (counts) {
      if (status === 'accepted') count = (counts.accepted ?? 0) || (counts.upcoming ?? 0);
      else if (status === 'completed') count = counts.completed ?? 0;
      else count = counts[status] ?? 0;
    } else {
      count = bookings.filter(
        (booking) =>
          booking.status === status ||
          (status === 'accepted' && booking.status === 'upcoming') ||
          (status === 'completed' && booking.status === 'paid'),
      ).length;
    }
    return {
      status,
      label: BOOKING_STATUS_META[status]?.label || (status === 'completed' ? 'Completed' : status),
      count,
    };
  });

  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-slate-100" role="img" aria-label="Bookings by status">
        {rows
          .filter((row) => row.count > 0)
          .map((row) => (
            <span
              key={row.status}
              title={`${row.label}: ${row.count}`}
              className="h-full transition-all duration-500"
              style={{ width: `${(row.count / (total || 1)) * 100}%`, backgroundColor: STATUS_CHART_COLORS[row.status] }}
            />
          ))}
      </div>

      <ul className="mt-4 space-y-1">
        {rows.map((row) => (
          <li key={row.status}>
            <Link
              to={`${listPath}?status=${row.status}`}
              className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50 transition-colors"
            >
              <span className="w-2.5 h-2.5 shrink-0 rounded-full" style={{ backgroundColor: STATUS_CHART_COLORS[row.status] }} />
              <span className="flex-1 text-slate-600">{row.label}</span>
              <span className="font-semibold text-slate-800 tabular-nums">{row.count}</span>
              <span className="w-10 text-right text-xs text-slate-400 tabular-nums">{Math.round((row.count / (total || 1)) * 100)}%</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
