import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import { CalendarCheck, XCircle } from 'lucide-react';
import { ConfirmDialog } from '@/components/common/modal/index.js';
import { ADMIN_BOOKING_ACTIONS, DUMMY_PROVIDERS, updateAdminBooking } from '@/features/adminBooking/index.js';
import { RejectBookingModal } from '@/pages/providerBookings/components/index.js';
import ReassignProviderModal from './ReassignProviderModal.jsx';
import CancelBookingModal from './CancelBookingModal.jsx';

// The dialog for an Admin / Super Admin action (reassign / cancel / accept / reject) on one
// booking. It dispatches updateAdminBooking and toasts the result.
export default function AdminBookingActionDialogs({ action, booking, initialProviderId = null, onClose }) {
  const dispatch = useDispatch();
  // Every booking - to spot a provider's clashes.
  const allBookings = useSelector((state) => state.adminBooking.items);
  const [submitting, setSubmitting] = useState(false);

  if (!action || !booking) return null;

  const close = () => !submitting && onClose();

  const run = async (payload = {}) => {
    setSubmitting(true);
    try {
      await dispatch(updateAdminBooking({ id: booking.id, action, payload })).unwrap();
      if (action === ADMIN_BOOKING_ACTIONS.REASSIGN) {
        toast.success(`Reassigned to ${payload.provider?.name || 'new provider'}`, {
          description: 'They need to accept the booking.',
        });
      } else if (action === ADMIN_BOOKING_ACTIONS.CANCEL) {
        toast.success('Booking cancelled', {
          description: `The customer and ${booking.provider?.name || 'provider'} have been told.`,
        });
      } else if (action === ADMIN_BOOKING_ACTIONS.ACCEPT) {
        toast.success('Booking accepted', {
          description: `Timeslot confirmed for ${booking.provider?.name || 'the provider'}.`,
        });
      } else if (action === ADMIN_BOOKING_ACTIONS.REJECT) {
        toast.success('Booking rejected', {
          description: 'Booking marked as rejected and ready for reassignment.',
        });
      }
      onClose();
    } catch {
      toast.error("Couldn't update the booking", { description: 'Nothing was changed. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (action === ADMIN_BOOKING_ACTIONS.ACCEPT) {
    return (
      <ConfirmDialog
        title="Accept this booking?"
        message={
          <>
            Accept <strong className="text-slate-700">{booking.service.name}</strong> for customer{' '}
            <strong className="text-slate-700">{booking.customer.name}</strong> on behalf of{' '}
            <strong className="text-slate-700">{booking.provider.name}</strong>?
          </>
        }
        confirmLabel="Accept booking"
        cancelLabel="Dismiss"
        icon={CalendarCheck}
        tone="success"
        busy={submitting}
        onCancel={close}
        onConfirm={() => run()}
      />
    );
  }

  if (action === ADMIN_BOOKING_ACTIONS.REJECT) {
    return <RejectBookingModal booking={booking} busy={submitting} onConfirm={run} onClose={close} />;
  }

  if (action === ADMIN_BOOKING_ACTIONS.REASSIGN) {
    return (
      <ReassignProviderModal
        booking={booking}
        providers={DUMMY_PROVIDERS}
        allBookings={allBookings}
        initialProviderId={initialProviderId}
        busy={submitting}
        onConfirm={run}
        onClose={close}
      />
    );
  }

  if (action === ADMIN_BOOKING_ACTIONS.CANCEL) {
    return <CancelBookingModal booking={booking} busy={submitting} onConfirm={run} onClose={close} />;
  }

  return null;
}
