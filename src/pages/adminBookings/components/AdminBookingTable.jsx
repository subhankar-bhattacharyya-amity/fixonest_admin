import { ChevronRight, Clock, Eye, Layers, Star, UserCheck, Wrench } from 'lucide-react';
import { Avatar } from '@/components/common/avatar/index.js';
import {
  BookingStatusBadge,
  formatBookingNumber,
  formatMoney,
  formatRelativeVisit,
  formatSlot,
  getBookingStart,
} from '@/features/providerBooking/index.js';

const shortDate = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

// The Admin's bookings listing: a table from `lg` up, stacked cards below it
// (same pattern as ContactTable). The whole row opens the booking's details page.
// `showVertical` (Super Admin) adds each booking's vertical.
export default function AdminBookingTable({ bookings, now, isLoading, showVertical = false, onOpen }) {
  if (isLoading && bookings.length === 0) return <TableSkeleton />;

  return (
    <div className={`transition-opacity duration-200 ${isLoading ? 'opacity-60' : ''}`}>
      {/* Desktop */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <th scope="col" className="px-6 py-3.5">Booking</th>
              <th scope="col" className="px-6 py-3.5">Customer</th>
              <th scope="col" className="px-6 py-3.5">Provider</th>
              <th scope="col" className="px-6 py-3.5">Visit</th>
              <th scope="col" className="px-6 py-3.5 text-right">Amount</th>
              <th scope="col" className="px-6 py-3.5">Status</th>
              <th scope="col" className="px-6 py-3.5 text-right font-semibold">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {bookings.map((booking, index) => {
              const isClosed = booking.status === 'rejected' || booking.status === 'cancelled';
              return (
                <tr
                  key={booking.id}
                  onClick={() => onOpen(booking)}
                  className={`group cursor-pointer transition-colors animate-rise-in ${
                    booking.status === 'rejected' ? 'bg-rose-50/30 hover:bg-rose-50/60' : 'hover:bg-teal-50/30'
                  }`}
                  style={{ animationDelay: `${Math.min(index * 35, 300)}ms` }}
                >
                  <td className="px-6 py-4 min-w-[220px]">
                    <button
                      type="button"
                      className="block max-w-full truncate text-left font-semibold text-slate-800 group-hover:text-teal-600 transition-colors rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50"
                    >
                      {booking.service.name}
                    </button>
                    <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                      <span className="font-mono whitespace-nowrap font-medium text-slate-500">{formatBookingNumber(booking)}</span>
                      <span className="text-slate-300">•</span>
                      <span className="inline-flex items-center gap-1" title={booking.bookingType === 'worker' ? 'Customer booked the provider directly' : 'Service booking'}>
                        {booking.bookingType === 'worker' ? <UserCheck size={11} className="shrink-0" /> : <Wrench size={11} className="shrink-0" />}
                        <span className="truncate">{booking.service.category}</span>
                      </span>
                    </p>
                    {showVertical && booking.vertical && <VerticalTag name={booking.vertical.name} className="mt-1.5" />}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={booking.customer.name} className="h-9 w-9 text-xs ring-2 ring-white shadow-sm" />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-700">{booking.customer.name}</p>
                        <p className="truncate text-xs text-slate-400">{booking.customer.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={booking.provider?.name || 'Provider'} className="h-9 w-9 text-xs bg-slate-100 text-slate-600 ring-2 ring-white shadow-sm" />
                      <div className="min-w-0">
                        <p className={`truncate font-medium ${booking.status === 'rejected' ? 'text-rose-600' : 'text-slate-700'}`}>
                          {booking.provider?.name || 'Unassigned'}
                        </p>
                        <p className="flex items-center gap-1 text-xs text-slate-400">
                          <Star size={11} className="fill-amber-400 text-amber-400" />
                          {booking.provider?.rating ? Number(booking.provider.rating).toFixed(1) : '4.8'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="font-medium text-slate-700">{shortDate.format(getBookingStart(booking))}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {formatSlot(booking)}
                      <span className={isClosed ? '' : 'text-teal-600 font-medium'}> · {formatRelativeVisit(booking, now)}</span>
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <p className={`font-bold ${isClosed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{formatMoney(booking.pricing?.total)}</p>
                    <p className={`text-xs ${booking.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-slate-400'}`}>
                      Cash · {booking.paymentStatus === 'paid' ? 'Paid' : isClosed ? 'Not due' : 'Unpaid'}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <BookingStatusBadge status={booking.status} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpen(booking);
                        }}
                        className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 shadow-xs hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 transition-colors"
                        title="View details"
                      >
                        <Eye size={13} />
                        <span>View</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile / tablet */}
      <ul className="lg:hidden divide-y divide-slate-100">
        {bookings.map((booking, index) => (
          <li key={booking.id} className="animate-rise-in" style={{ animationDelay: `${Math.min(index * 35, 300)}ms` }}>
            <button
              type="button"
              onClick={() => onOpen(booking)}
              className="block w-full p-4 text-left hover:bg-teal-50/30 active:bg-teal-50/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500/50"
            >
              <span className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-slate-800">{booking.service.name}</span>
                  <span className="block font-mono text-xs text-slate-400">{formatBookingNumber(booking)}</span>
                  {showVertical && booking.vertical && <VerticalTag name={booking.vertical.name} className="mt-1" />}
                </span>
                <BookingStatusBadge status={booking.status} />
              </span>
              <span className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <span className="min-w-0">
                  <span className="block text-slate-400">Customer</span>
                  <span className="block truncate font-medium text-slate-700">{booking.customer.name}</span>
                </span>
                <span className="min-w-0">
                  <span className="block text-slate-400">Provider</span>
                  <span className={`block truncate font-medium ${booking.status === 'rejected' ? 'text-rose-600' : 'text-slate-700'}`}>
                    {booking.provider.name}
                  </span>
                </span>
              </span>
              <span className="mt-3 flex items-center justify-between gap-3 border-t border-dashed border-slate-100 pt-3">
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                  <Clock size={12} />
                  {shortDate.format(getBookingStart(booking))}, {formatSlot(booking)}
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-800">{formatMoney(booking.pricing?.total)}</span>
                  <Eye size={14} className="text-teal-600" />
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function VerticalTag({ name, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md bg-teal-50 px-1.5 py-0.5 text-[11px] font-semibold text-teal-700 ${className}`}>
      <Layers size={10} />
      {name}
    </span>
  );
}

function TableSkeleton() {
  return (
    <div className="divide-y divide-slate-100 animate-pulse" aria-label="Loading bookings">
      {[0, 1, 2, 3, 4].map((row) => (
        <div key={row} className="flex items-center gap-4 px-4 lg:px-6 py-4">
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-44 max-w-full rounded bg-slate-100" />
            <div className="h-3 w-28 rounded bg-slate-100" />
          </div>
          <div className="hidden lg:block w-9 h-9 rounded-full bg-slate-100" />
          <div className="hidden lg:block h-3.5 w-32 rounded bg-slate-100" />
          <div className="hidden sm:block h-3.5 w-24 rounded bg-slate-100" />
          <div className="h-6 w-20 rounded-full bg-slate-100" />
        </div>
      ))}
    </div>
  );
}
