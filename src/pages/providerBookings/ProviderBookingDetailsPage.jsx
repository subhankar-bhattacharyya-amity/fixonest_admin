import { useEffect, useMemo, useState } from 'react';
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
  Hourglass,
  Mail,
  MapPin,
  MessageSquareText,
  Phone,
  Receipt,
  SearchX,
  ShieldAlert,
  Timer,
  UserCheck,
  Wrench,
  XCircle,
} from 'lucide-react';
import { Avatar } from '@/components/common/avatar/index.js';
import { useAuth } from '@/features/auth/index.js';
import {
  BOOKING_ACTIONS,
  BOOKING_STATUS,
  BookingActivity,
  BookingStatusBadge,
  BookingStepper,
  DetailCard as Card,
  DetailInfo as Info,
  DetailRow as Row,
  PLATFORM_COMMISSION_RATE,
  fetchProviderBookings,
  formatBookingDate,
  formatBookingNumber,
  formatDateTime,
  formatMoney,
  formatRelativeVisit,
  formatSlot,
  formatTimeLeft,
  getMapsUrl,
  isPhoneVisible,
  maskPhone,
  useProviderBookings,
} from '@/features/providerBooking/index.js';
import { ROUTES } from '@/routes/constants.js';
import { InvoiceModal } from '@/components/common/invoice/index.js';
import { BookingActionButtons, BookingActionDialogs } from './components/index.js';

const NEXT_STEP = {
  pending: 'Accept or reject this request to confirm or release the timeslot.',
  accepted: 'Start the job when you reach the customer location.',
  upcoming: 'Start the job when you reach the customer location.',
  in_progress: 'Mark the job completed when you finish.',
  completed: 'Service completed successfully.',
  paid: 'Service completed successfully.',
};

// One booking, on its own page inside the dashboard layout (sidebar and
// topbar stay). A stepper across the top shows progress; next action in the header.
export default function ProviderBookingDetailsPage() {
  const dispatch = useDispatch();
  const { bookingId } = useParams();
  const { user } = useAuth();
  const { items, status, fetchedAt, rollback } = useProviderBookings();
  const [dialogAction, setDialogAction] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!fetchedAt) dispatch(fetchProviderBookings());
  }, [dispatch, fetchedAt]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const userId = String(user?._id || user?.id || '').trim();
  const userName = String(user?.fullName || user?.name || '').trim().toLowerCase();
  const userPhone = String(user?.phone || user?.mobileNumber || '').replace(/\D/g, '');

  const booking = items.find(
    (item) =>
      String(item.id) === String(bookingId) ||
      String(item.bookingNumber) === String(bookingId) ||
      String(item._id) === String(bookingId),
  );

  // Validate that this booking belongs strictly to this provider
  const isAssignedToMe = useMemo(() => {
    if (!booking) return false;
    const p = booking.provider;
    if (!p) return false;
    if (userId && (String(p.id) === userId || String(p._id) === userId)) return true;
    if (userName && p.name && p.name.trim().toLowerCase() === userName) return true;
    if (userPhone && p.phone && p.phone.replace(/\D/g, '').endsWith(userPhone.slice(-10))) return true;
    return false;
  }, [booking, userId, userName, userPhone]);

  if (!booking) {
    return status === 'loading' || !fetchedAt ? <DetailsSkeleton /> : <NotFound bookingId={formatBookingNumber(bookingId)} />;
  }

  if (!isAssignedToMe) {
    return <NotAuthorized bookingId={formatBookingNumber(booking)} />;
  }

  const isPending = booking.status === BOOKING_STATUS.PENDING;
  const isClosed = booking.status === BOOKING_STATUS.REJECTED || booking.status === BOOKING_STATUS.CANCELLED;
  const busy = Boolean(rollback[booking.id]);
  const showPhone = isPhoneVisible(booking);
  const { pricing, cashPayment } = booking;
  const timeLeft = isPending && booking.expiresAt ? formatTimeLeft(booking.expiresAt, now) : null;

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
        <Link to={ROUTES.PROVIDER_BOOKINGS} className="inline-flex items-center gap-1.5 hover:text-teal-600 transition-colors">
          <ArrowLeft size={15} />
          My Bookings
        </Link>
        <ChevronRight size={14} className="text-slate-300" />
        <span className="font-mono text-slate-700">{formatBookingNumber(booking)}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <BookingStatusBadge status={booking.status} />
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
              {booking.bookingType === 'worker' ? 'The customer booked you directly' : 'Service booking assigned to you'}
            </span>
            <span className="text-slate-300">•</span>
            <span>{booking.service.category}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {(booking.status === BOOKING_STATUS.COMPLETED || booking.status === BOOKING_STATUS.PAID) && (
            <button
              type="button"
              onClick={() => setShowInvoiceModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 transition shadow-xs"
            >
              <FileText size={15} />
              Invoice (PDF)
            </button>
          )}
          <BookingActionButtons booking={booking} busy={busy} onAction={(action) => setDialogAction(action)} />
        </div>
      </div>

      {/* Stepper */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 sm:p-6">
        <BookingStepper booking={booking} />
        <div
          className={`mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm ${
            isClosed
              ? 'bg-rose-50 text-rose-700'
              : (booking.status === BOOKING_STATUS.COMPLETED || booking.status === BOOKING_STATUS.PAID)
                ? 'bg-emerald-50 text-emerald-700'
                : isPending
                  ? 'bg-amber-50 text-amber-800'
                  : 'bg-teal-50 text-teal-800'
          }`}
        >
          <span className="inline-flex items-center gap-2 font-medium">
            {isClosed ? (
              <XCircle size={16} />
            ) : (booking.status === BOOKING_STATUS.COMPLETED || booking.status === BOOKING_STATUS.PAID) ? (
              <CheckCircle2 size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
            {isClosed
              ? booking.rejectionReason
                ? `You rejected this booking: ${booking.rejectionReason}`
                : `The customer cancelled: ${booking.cancellationReason}`
              : (booking.status === BOOKING_STATUS.COMPLETED || booking.status === BOOKING_STATUS.PAID)
                ? 'Service completed successfully.'
                : NEXT_STEP[booking.status] || NEXT_STEP.accepted}
          </span>
          {timeLeft && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
              <Hourglass size={13} />
              Respond within {timeLeft}
            </span>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          <Card title="Visit Details">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Info icon={CalendarDays} label="Visit Date">
                {formatBookingDate(booking)}
              </Info>
              <Info icon={Clock} label="Timeslot">
                {formatSlot(booking)}
              </Info>
              <Info icon={Timer} label="Duration">
                {booking.hours} {booking.hours === 1 ? 'hour' : 'hours'}
              </Info>
              <Info icon={CalendarCheck} label="When">
                <span className="text-teal-600">{formatRelativeVisit(booking, now)}</span>
              </Info>
            </div>
          </Card>

          <Card title="Customer Information">
            <div className="flex flex-wrap items-center gap-4">
              <Avatar name={booking.customer.name} className="h-12 w-12 text-sm" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-800">{booking.customer.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1.5">
                    <Phone size={13} className="text-slate-400" />
                    {showPhone ? (
                      <a href={`tel:${booking.customer.phone.replace(/\s/g, '')}`} className="font-medium text-teal-600 hover:underline">
                        {booking.customer.phone}
                      </a>
                    ) : (
                      <span title="Visible once you accept the request">{maskPhone(booking.customer.phone)}</span>
                    )}
                  </span>
                  {booking.customer.email && (
                    <span className="inline-flex items-center gap-1.5">
                      <Mail size={13} className="text-slate-400" />
                      {showPhone ? booking.customer.email : '••••••••@••••.com'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex items-start gap-3">
              <MapPin size={16} className="text-slate-400 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-medium text-slate-700">{booking.address.line}</p>
                <p className="text-slate-500 mt-0.5">
                  {booking.address.area}, {booking.address.city} {booking.address.pincode}
                </p>
                {booking.address.landmark && (
                  <p className="text-xs text-slate-400 mt-0.5">Landmark: {booking.address.landmark}</p>
                )}
              </div>
              <a
                href={getMapsUrl(booking.address)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:text-teal-600 hover:border-teal-200 hover:bg-teal-50 transition-colors shrink-0"
              >
                Directions
                <ExternalLink size={12} />
              </a>
            </div>

            {booking.instructions && (
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-start gap-3">
                <MessageSquareText size={16} className="text-slate-400 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1 text-sm">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Customer Instructions</p>
                  <p className="text-slate-700 mt-1 bg-slate-50 p-3 rounded-xl border border-slate-100 italic">
                    "{booking.instructions}"
                  </p>
                </div>
              </div>
            )}
          </Card>

          <Card title="Activity Timeline">
            <BookingActivity activity={booking.activity} actorLabels={{ provider: 'You' }} />
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <Card title="Payment & Earnings">
            <div className="space-y-3 text-sm">
              <Row label="Service Base Price" value={formatMoney(pricing.base)} />
              {pricing.discount > 0 && (
                <Row
                  label={pricing.couponCode ? `Coupon (${pricing.couponCode})` : 'Discount'}
                  value={`− ${formatMoney(pricing.discount)}`}
                  muted
                />
              )}
              {pricing.convenienceFee > 0 && (
                <Row label="Convenience Fee" value={formatMoney(pricing.convenienceFee)} />
              )}
              <div className="pt-2 border-t border-slate-100">
                <Row label="Total Payable by Customer" value={formatMoney(pricing.total)} />
              </div>
              <div className="pt-2 border-t border-dashed border-slate-100 text-xs text-slate-500 space-y-1.5">
                <div className="flex justify-between">
                  <span>
                    Platform Fee ({booking.commissionRate !== undefined ? booking.commissionRate : Math.round(PLATFORM_COMMISSION_RATE * 100)}%)
                  </span>
                  <span>-{formatMoney(pricing.commission)}</span>
                </div>
                <div className="flex justify-between font-bold text-teal-700 text-sm pt-1">
                  <span>Your Net Earnings</span>
                  <span>{formatMoney(pricing.earning)}</span>
                </div>
              </div>
            </div>

            {cashPayment && (
              <div className="mt-4 pt-4 border-t border-slate-100 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">
                <p className="font-semibold flex items-center gap-1.5">
                  <CheckCircle2 size={14} />
                  Cash Payment Recorded
                </p>
                <p className="mt-1">
                  {formatMoney(cashPayment.amountReceived)} received on {formatDateTime(cashPayment.receivedAt)}.
                </p>
              </div>
            )}

            {(booking.status === BOOKING_STATUS.COMPLETED || booking.status === BOOKING_STATUS.PAID) && (
              <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                <span className="text-xs text-slate-500 font-medium">Official Tax Invoice</span>
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(true)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700 hover:underline"
                >
                  <FileText size={13} />
                  View & Download Invoice
                </button>
              </div>
            )}
          </Card>

          <Card title="Booking Details">
            <div className="space-y-2.5 text-sm">
              <Row
                label={
                  <span className="inline-flex items-center gap-1.5 text-slate-500">
                    <Hash size={13} />
                    Booking Number
                  </span>
                }
                value={
                  <span className="font-mono font-semibold text-slate-800">
                    {formatBookingNumber(booking)}
                  </span>
                }
              />
              <Row
                label="Booking Type"
                value={booking.bookingType === 'worker' ? 'Direct provider booking' : 'Service booking'}
              />
              <Row label="Booked On" value={formatDateTime(booking.createdAt)} />
              <Row label="Payment Method" value="Cash on Delivery" />
            </div>
          </Card>
        </div>
      </div>

      <BookingActionDialogs
        action={dialogAction}
        booking={booking}
        showViewLink={false}
        onClose={() => setDialogAction(null)}
      />

      <InvoiceModal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        bookingId={booking.id || booking._id}
        bookingNumber={booking.bookingNumber}
        role="provider"
      />
    </div>
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

function NotFound({ bookingId }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center px-6 py-16 animate-rise-in">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
        <SearchX size={24} />
      </div>
      <h1 className="text-lg font-bold text-slate-800">Booking not found</h1>
      <p className="text-sm text-slate-500 mt-1">
        There's no booking <span className="font-mono">{bookingId}</span> in your list.
      </p>
      <Link
        to={ROUTES.PROVIDER_BOOKINGS}
        className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors"
      >
        <ArrowLeft size={15} />
        Back to My Bookings
      </Link>
    </div>
  );
}

function NotAuthorized({ bookingId }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center px-6 py-16 animate-rise-in">
      <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mb-4 ring-8 ring-amber-50/50">
        <ShieldAlert size={26} />
      </div>
      <h1 className="text-lg font-bold text-slate-800">Booking Assigned to Another Provider</h1>
      <p className="text-sm text-slate-500 mt-1.5 max-w-md">
        Booking <span className="font-mono font-medium text-slate-700">{bookingId}</span> is not assigned to your account.
        As a service provider, you can only view and manage your own assigned jobs.
      </p>
      <Link
        to={ROUTES.PROVIDER_BOOKINGS}
        className="mt-6 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-teal-500 hover:bg-teal-600 shadow-sm shadow-teal-500/30 transition-colors"
      >
        <ArrowLeft size={15} />
        Back to My Bookings
      </Link>
    </div>
  );
}
