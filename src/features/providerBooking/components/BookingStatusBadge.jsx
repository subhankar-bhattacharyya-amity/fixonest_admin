import { BOOKING_STATUS_META } from '../definitions/providerBookings.js';

// Coloured pill with a dot and the status in words. Shared by the provider's
// "My Bookings" and the Admin's "Bookings" pages.
export default function BookingStatusBadge({ status, className = '' }) {
  const meta = BOOKING_STATUS_META[status] ?? BOOKING_STATUS_META.cancelled;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset whitespace-nowrap ${meta.badge} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot} ${status === 'in_progress' ? 'animate-pulse' : ''}`} />
      {meta.label}
    </span>
  );
}
