import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Banknote,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  ExternalLink,
  FileText,
  Hash,
  History,
  Hourglass,
  Layers,
  MapPin,
  MessageSquareText,
  Phone,
  Receipt,
  SearchX,
  Star,
  Timer,
  UserCheck,
  UserX,
  Wrench,
  XCircle,
} from 'lucide-react';
import { Avatar } from '@/components/common/avatar/index.js';
import {
  BookingActivity,
  BookingStatusBadge,
  BookingStepper,
  DetailCard,
  DetailInfo,
  DetailRow,
  PLATFORM_COMMISSION_RATE,
  formatBookingDate,
  formatBookingNumber,
  formatDateTime,
  formatMoney,
  formatRelativeVisit,
  formatSlot,
  formatTimeLeft,
  getMapsUrl,
} from '@/features/providerBooking/index.js';
import { useAuth } from '@/features/auth/index.js';
import { fetchAdminBookings, useAdminBookings } from '@/features/adminBooking/index.js';
import { getBookingManagementPath } from '@/routes/constants.js';
import { InvoiceModal } from '@/components/common/invoice/index.js';

// One booking from the Super Admin's / an Admin's point of view, on its own
// page inside the dashboard layout: progress stepper, customer and provider,
// money split (cash, platform commission, provider earning) and the full
// activity log. An Admin only reaches bookings of their own vertical.
export default function AdminBookingDetailsPage() {
  const dispatch = useDispatch();
  const { role } = useAuth();
  const listPath = getBookingManagementPath(role);
  const { bookingId } = useParams();
  const { items, status, fetchedAt } = useAdminBookings();
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [now] = useState(() => new Date());

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!fetchedAt) dispatch(fetchAdminBookings());
  }, [dispatch, fetchedAt]);

  const booking = items.find(
    (item) =>
      String(item.id) === String(bookingId) ||
      String(item.bookingNumber) === String(bookingId) ||
      String(item._id) === String(bookingId)
  );

  if (!booking) {
    return status === 'loading' || !fetchedAt ? <DetailsSkeleton /> : <NotFound bookingId={bookingId} listPath={listPath} />;
  }

  const { provider, pricing, cashPayment } = booking;
  const isClosed = booking.status === 'rejected' || booking.status === 'cancelled';
  const firstName = provider.name.split(' ')[0];
  const timeLeft = booking.status === 'pending' && booking.expiresAt ? formatTimeLeft(booking.expiresAt, now) : null;

  const statusLine = {
    pending: { tone: 'bg-amber-50 text-amber-800', icon: Hourglass, text: `Waiting for ${provider.name} to accept the booking.` },
    accepted: { tone: 'bg-teal-50 text-teal-800', icon: CalendarCheck, text: `${provider.name} will visit on ${formatBookingDate(booking)}, ${formatSlot(booking)}.` },
    upcoming: { tone: 'bg-teal-50 text-teal-800', icon: CalendarCheck, text: `${provider.name} will visit on ${formatBookingDate(booking)}, ${formatSlot(booking)}.` },
    in_progress: { tone: 'bg-violet-50 text-violet-800', icon: Wrench, text: `${provider.name} is on the job right now.` },
    completed: { tone: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2, text: 'Service completed successfully.' },
    paid: { tone: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2, text: 'Service completed successfully.' },
    rejected: {
      tone: 'bg-rose-50 text-rose-700',
      icon: UserX,
      text: booking.rejectionReason
        ? `${provider.name} rejected this booking: ${booking.rejectionReason}.`
        : `${provider.name} rejected this booking.`,
    },
    cancelled: {
      tone: 'bg-rose-50 text-rose-700',
      icon: XCircle,
      text: `${booking.cancelledBy === 'admin' ? 'Cancelled by admin' : 'The customer cancelled'}: ${booking.cancellationReason || 'No reason provided'}`,
    },
  }[booking.status] || { tone: 'bg-slate-50 text-slate-700', icon: CalendarDays, text: `Booking status: ${booking.status}` };

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(formatBookingNumber(booking));
      toast.success('Booking number copied');
    } catch {
      toast.error("Couldn't copy the booking number");
    }
  };

  return (
    <div className="space-y-6 animate-rise-in">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-slate-500">
        <Link to={listPath} className="inline-flex items-center gap-1.5 hover:text-teal-600 transition-colors">
          <ArrowLeft size={15} />
          Booking Management
        </Link>
        <ChevronRight size={14} className="text-slate-300" />
        <span className="font-mono text-slate-700">{formatBookingNumber(booking)}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <BookingStatusBadge status={booking.status} />
            {booking.vertical && (
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700">
                <Layers size={12} />
                {booking.vertical.name}
              </span>
            )}
            <button
              type="button"
              onClick={copyId}
              title="Copy booking number"
              className="inline-flex items-center gap-1 font-mono text-xs font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-md hover:text-teal-700 transition-colors"
            >
              {formatBookingNumber(booking)}
              <Copy size={11} />
            </button>
          </div>
          <h1 className="mt-2 text-xl sm:text-2xl font-bold text-slate-800">{booking.service.name}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              {booking.bookingType === 'worker' ? <UserCheck size={14} /> : <Wrench size={14} />}
              {booking.bookingType === 'worker' ? `Customer booked ${provider.name} directly` : 'Service booking'}
            </span>
            <span className="text-slate-300">•</span>
            <span>{booking.service.category}</span>
            <span className="text-slate-300">•</span>
            <span>Booked {formatDateTime(booking.createdAt)}</span>
          </p>
        </div>

        {(booking.status === 'completed' || booking.status === 'paid') && (
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => setShowInvoiceModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 transition shadow-xs"
            >
              <FileText size={15} />
              View & Download Invoice
            </button>
          </div>
        )}
      </div>

      {/* Stepper */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 sm:p-6">
        <BookingStepper booking={booking} />
        <div className={`mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm ${statusLine.tone}`}>
          <span className="inline-flex items-center gap-2 font-medium">
            <statusLine.icon size={16} className="shrink-0" />
            {statusLine.text}
          </span>
          {timeLeft && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
              <Hourglass size={13} />
              {timeLeft} left to respond
            </span>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          <DetailCard title="Visit">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <DetailInfo icon={CalendarDays} label="Date">
                {formatBookingDate(booking)}
              </DetailInfo>
              <DetailInfo icon={Clock} label="Time">
                {formatSlot(booking)}
              </DetailInfo>
              <DetailInfo icon={Timer} label="Duration">
                {booking.hours} {booking.hours === 1 ? 'hour' : 'hours'}
              </DetailInfo>
              <DetailInfo icon={CalendarCheck} label="When">
                <span className={isClosed ? 'text-slate-500' : 'text-teal-600'}>{formatRelativeVisit(booking, now)}</span>
              </DetailInfo>
            </div>
          </DetailCard>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <PersonCard
              title="Customer"
              name={booking.customer.name}
              lines={[booking.customer.phone, booking.customer.email]}
              phone={booking.customer.phone}
            />
            <PersonCard
              title="Provider"
              name={provider.name}
              tinted
              lines={[provider.phone]}
              phone={provider.phone}
              meta={
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                  <span>{provider.category}</span>
                  <span className="inline-flex items-center gap-1">
                    <Star size={12} className="fill-amber-400 text-amber-400" />
                    {provider.rating.toFixed(1)}
                  </span>
                  <span>{provider.jobsDone} jobs done</span>
                </span>
              }
              warning={booking.status === 'rejected' ? `Rejected: ${booking.rejectionReason}` : null}
              extra={
                booking.previousProviders?.length > 0 && (
                  <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2.5">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                      <History size={12} />
                      Assignment history
                    </p>
                    <ul className="mt-1.5 space-y-1">
                      {booking.previousProviders.map((entry) => (
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
                )
              }
            />
          </div>

          <DetailCard title="Address & notes">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4">
                <MapPin size={18} className="shrink-0 mt-0.5 text-teal-600" />
                <div className="min-w-0 text-sm">
                  <p className="font-semibold text-slate-700">{booking.address.label}</p>
                  <p className="text-slate-500 leading-relaxed">
                    {[booking.address.line, booking.address.area, booking.address.landmark, `${booking.address.city} ${booking.address.pincode}`]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                  <a
                    href={getMapsUrl(booking.address)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700"
                  >
                    Open in Google Maps <ExternalLink size={11} />
                  </a>
                </div>
              </div>
              <div
                className={`flex items-start gap-3 rounded-xl p-4 text-sm ${
                  booking.instructions ? 'bg-amber-50 border border-amber-100 text-amber-900' : 'bg-slate-50 text-slate-400'
                }`}
              >
                <MessageSquareText size={18} className={`shrink-0 mt-0.5 ${booking.instructions ? 'text-amber-600' : ''}`} />
                <div>
                  <p className={`font-semibold ${booking.instructions ? 'text-amber-900' : 'text-slate-500'}`}>Customer notes</p>
                  <p className="leading-relaxed">{booking.instructions || 'No notes for this booking.'}</p>
                </div>
              </div>
            </div>
          </DetailCard>

          <DetailCard title="Activity">
            <BookingActivity activity={booking.activity} />
          </DetailCard>
        </div>

        {/* Right column */}
        <div className="space-y-6 lg:sticky lg:top-6">
          <DetailCard title="Money split">
            <dl className="space-y-2.5 text-sm">
              <DetailRow
                label={`Service charge${booking.bookingType === 'worker' ? ` (${booking.hours} hr${booking.hours > 1 ? 's' : ''})` : ''}`}
                value={formatMoney(pricing.base)}
              />
              <DetailRow label="Visiting charge" value={<span className="text-emerald-600 font-semibold">FREE</span>} />
              {pricing.convenienceFee > 0 && (
                <DetailRow label="Convenience fee" value={formatMoney(pricing.convenienceFee)} />
              )}
              {pricing.discount > 0 && (
                <DetailRow
                  label={pricing.couponCode ? `Coupon (${pricing.couponCode})` : 'Coupon discount'}
                  value={<span className="text-emerald-600">− {formatMoney(pricing.discount)}</span>}
                />
              )}
              <div className="flex items-center justify-between border-t border-dashed border-slate-200 pt-3">
                <dt className="font-bold text-slate-800">Customer pays (cash)</dt>
                <dd className={`text-xl font-extrabold ${isClosed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                  {formatMoney(pricing.total)}
                </dd>
              </div>
            </dl>

            {/* Split bar */}
            <div className="mt-5">
              <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                <span className="bg-teal-500" style={{ width: `${pricing.total > 0 ? (pricing.commission / pricing.total) * 100 : 0}%` }} />
                <span className="bg-slate-300" style={{ width: `${pricing.total > 0 ? (pricing.earning / pricing.total) * 100 : 0}%` }} />
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-teal-50 px-3 py-2.5">
                  <dt className="flex items-center gap-1.5 text-xs font-semibold text-teal-700">
                    <span className="w-2 h-2 rounded-full bg-teal-500" />
                    Fixonest ({booking.commissionRate !== undefined ? booking.commissionRate : Math.round(PLATFORM_COMMISSION_RATE * 100)}%)
                  </dt>
                  <dd className="mt-0.5 text-lg font-extrabold text-teal-700">{formatMoney(pricing.commission)}</dd>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                  <dt className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                    <span className="w-2 h-2 rounded-full bg-slate-300" />
                    Provider earns
                  </dt>
                  <dd className="mt-0.5 text-lg font-extrabold text-slate-700">{formatMoney(pricing.earning)}</dd>
                </div>
              </dl>
            </div>
          </DetailCard>

          <DetailCard title="Payment">
            <div className="flex items-center gap-3">
              <div
                className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center ${
                  booking.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                }`}
              >
                {booking.paymentStatus === 'paid' ? <Receipt size={20} /> : <Banknote size={20} />}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-slate-800">Cash on delivery</p>
                <p className="text-sm text-slate-500">
                  {booking.paymentStatus === 'paid' ? `Collected by ${firstName}` : isClosed ? 'Nothing to collect' : 'Not collected yet'}
                </p>
              </div>
            </div>
            {cashPayment && (
              <dl className="mt-4 space-y-2 rounded-xl bg-slate-50 p-3.5 text-sm">
                <DetailRow label="Amount received" value={formatMoney(cashPayment.amountReceived)} />
                <DetailRow label="Received on" value={formatDateTime(cashPayment.receivedAt)} />
                {cashPayment.amountReceived !== pricing.total && (
                  <p className="text-xs text-amber-700">
                    {formatMoney(Math.abs(cashPayment.amountReceived - pricing.total))}{' '}
                    {cashPayment.amountReceived > pricing.total ? 'more' : 'less'} than the amount due.
                  </p>
                )}
                {cashPayment.note && <p className="text-xs italic text-slate-500">"{cashPayment.note}"</p>}
              </dl>
            )}

            {(booking.status === 'completed' || booking.status === 'paid') && (
              <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                <span className="text-xs text-slate-500 font-medium">Official Tax Invoice</span>
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(true)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700 hover:underline"
                >
                  <FileText size={13} />
                  View & Download Invoice (PDF)
                </button>
              </div>
            )}
          </DetailCard>

          <DetailCard title="Booking info">
            <dl className="space-y-2.5 text-sm">
              <DetailRow
                label={
                  <span className="inline-flex items-center gap-1.5">
                    <Hash size={13} />
                    Booking Number
                  </span>
                }
                value={<span className="font-mono font-semibold text-slate-800">{booking.bookingNumber || booking.id}</span>}
              />
              {booking.vertical && <DetailRow label="Vertical" value={booking.vertical.name} />}
              <DetailRow label="Type" value={booking.bookingType === 'worker' ? 'Direct provider booking' : 'Service booking'} />
              <DetailRow label="Booked on" value={formatDateTime(booking.createdAt)} />
              <DetailRow label="Payment method" value="Cash" />
            </dl>
          </DetailCard>
        </div>
      </div>

      <InvoiceModal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        bookingId={booking.id || booking._id}
        bookingNumber={booking.bookingNumber}
        role={role}
      />
    </div>
  );
}

// Customer / provider card: avatar, name, contact lines and a Call button.
// `extra` goes under the details (e.g. the provider's assignment history).
function PersonCard({ title, name, lines, phone, meta, tinted = false, warning = null, extra = null }) {
  return (
    <DetailCard title={title}>
      <div className="flex items-start gap-3">
        <Avatar name={name} className={`h-12 w-12 text-sm ${tinted ? 'bg-slate-100 text-slate-600' : ''}`} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-800 truncate">{name}</p>
          {meta && <div className="mt-0.5">{meta}</div>}
          {lines.filter(Boolean).map((line) => (
            <p key={line} className="text-sm text-slate-500 truncate">
              {line}
            </p>
          ))}
        </div>
      </div>
      {warning && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{warning}</p>}
      {extra}
      <a
        href={`tel:${phone.replace(/\s/g, '')}`}
        className="mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-100 transition-colors"
      >
        <Phone size={14} />
        Call {name.split(' ')[0]}
      </a>
    </DetailCard>
  );
}

function DetailsSkeleton() {
  const block = 'animate-pulse rounded bg-slate-200/70';
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading booking">
      <div className={`h-4 w-48 ${block}`} />
      <div className={`h-8 w-72 ${block}`} />
      <div className={`h-36 rounded-2xl ${block}`} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`lg:col-span-2 h-80 rounded-2xl ${block}`} />
        <div className={`h-80 rounded-2xl ${block}`} />
      </div>
    </div>
  );
}

function NotFound({ bookingId, listPath }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center px-6 py-16 animate-rise-in">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
        <SearchX size={24} />
      </div>
      <h1 className="text-lg font-bold text-slate-800">Booking not found</h1>
      <p className="text-sm text-slate-500 mt-1">
        There's no booking <span className="font-mono">{bookingId}</span> you can access.
      </p>
      <Link
        to={listPath}
        className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors"
      >
        <ArrowLeft size={15} />
        Back to Booking Management
      </Link>
    </div>
  );
}
