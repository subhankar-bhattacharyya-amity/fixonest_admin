import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { CalendarCheck, Play } from 'lucide-react';
import { ConfirmDialog } from '@/components/common/modal/index.js';
import { BOOKING_ACTIONS, formatBookingNumber, formatMoney, updateProviderBooking } from '@/features/providerBooking/index.js';
import { getProviderBookingDetailsPath } from '@/routes/constants.js';
import RejectBookingModal from './RejectBookingModal.jsx';
import CompleteBookingModal from './CompleteBookingModal.jsx';
import RecordPaymentModal from './RecordPaymentModal.jsx';

const SUCCESS_TOASTS = {
  accept: () => ({ title: 'Booking accepted', description: "The customer's phone number is now visible." }),
  reject: () => ({ title: 'Booking rejected', description: 'The customer has been told.' }),
  start: () => ({ title: 'Job started', description: 'Mark it completed when you finish.' }),
  complete: (booking, payload) => ({
    title: 'Job completed',
    description: payload?.paidAmount !== undefined
      ? `${formatMoney(payload.paidAmount)} cash payment recorded.`
      : `Collect ${formatMoney(booking?.pricing?.total || 0)} in cash.`,
  }),
  recordPayment: (_, payload) => ({
    title: `${formatMoney(payload.amountReceived)} recorded`,
    description: "Added to this month's cash collected.",
  }),
};

// The dialog for one booking action (accept / reject / start / complete /
// record cash), shared by the listing and the details page. `action` is a
// BOOKING_ACTIONS value; it dispatches updateProviderBooking and toasts the
// result. `showViewLink` adds a "View" button to the success toast that opens
// the booking's details page (off on the details page itself).
export default function BookingActionDialogs({ action, booking, onClose, showViewLink = true }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  if (!action || !booking) return null;

  const close = () => !submitting && onClose();

  const run = async (payload = {}) => {
    setSubmitting(true);
    try {
      await dispatch(updateProviderBooking({ id: booking.id, action, payload })).unwrap();
      const message = SUCCESS_TOASTS[action](booking, payload);
      toast.success(message.title, {
        description: message.description,
        action: showViewLink
          ? { label: 'View', onClick: () => navigate(getProviderBookingDetailsPath(formatBookingNumber(booking) || booking.id)) }
          : undefined,
      });
      onClose();
    } catch {
      toast.error("Couldn't update the booking", { description: 'Nothing was changed. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  switch (action) {
    case BOOKING_ACTIONS.ACCEPT:
      return (
        <ConfirmDialog
          title="Accept this booking?"
          message={
            <>
              <strong className="text-slate-700">{booking.service.name}</strong> for {booking.customer.name}. You'll see
              their phone number and can call them before the visit.
            </>
          }
          confirmLabel="Accept"
          cancelLabel="Not now"
          icon={CalendarCheck}
          tone="success"
          busy={submitting}
          onCancel={close}
          onConfirm={() => run()}
        />
      );
    case BOOKING_ACTIONS.START:
      return (
        <ConfirmDialog
          title="Start this job?"
          message={`Start ${booking.service.name} at ${booking.customer.name}'s place now.`}
          confirmLabel="Start job"
          icon={Play}
          tone="success"
          busy={submitting}
          onCancel={close}
          onConfirm={() => run()}
        />
      );
    case BOOKING_ACTIONS.REJECT:
      return <RejectBookingModal booking={booking} busy={submitting} onConfirm={run} onClose={close} />;
    case BOOKING_ACTIONS.COMPLETE:
      return <CompleteBookingModal booking={booking} busy={submitting} onConfirm={run} onClose={close} />;
    case BOOKING_ACTIONS.RECORD_PAYMENT:
      return <RecordPaymentModal booking={booking} busy={submitting} onConfirm={run} onClose={close} />;
    default:
      return null;
  }
}
