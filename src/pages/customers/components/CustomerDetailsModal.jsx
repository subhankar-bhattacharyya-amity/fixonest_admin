import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import {
  AtSign,
  CalendarDays,
  History,
  Mail,
  MapPin,
  MapPinOff,
  PauseCircle,
  Phone,
  PlayCircle,
  Star,
  UserRound,
} from 'lucide-react';
import { Avatar } from '@/components/common/avatar/index.js';
import { Modal } from '@/components/common/modal/index.js';
import { buildProfileImageUrl } from '@/features/auth/index.js';
import {
  useCustomers,
  fetchCustomerDetails,
  clearCustomerDetails,
  formatCustomerPhone,
  formatCustomerAddress,
} from '@/features/customer/index.js';
import { formatDate, formatDateTime } from '@/utils/formatDate.js';
import CustomerStatusPill from './CustomerStatusPill.jsx';

// Read-only profile of one customer. Opens straight away with what the listing
// row already has (`customer`), then loads the full record - which adds their
// saved addresses - from GET /v1/customers/details. Suspending/reactivating is
// handed back to the page (`onToggleStatus`), which owns the confirm dialog.
export default function CustomerDetailsModal({ customer, onClose, onToggleStatus }) {
  const dispatch = useDispatch();
  const { details } = useCustomers();

  useEffect(() => {
    dispatch(fetchCustomerDetails(customer._id));
    return () => {
      dispatch(clearCustomerDetails());
    };
  }, [dispatch, customer._id]);

  // The loaded record once it arrives (it also tracks status changes made
  // while the dialog is open); the listing row until then.
  const loaded = details.data?._id === customer._id ? details.data : null;
  const current = loaded ?? customer;
  const isLoadingDetails = details.status === 'loading' || details.status === 'idle';
  const addresses = loaded?.user_details?.addresses ?? [];
  const isSuspended = current.accountStatus === 'suspended';
  const ToggleIcon = isSuspended ? PlayCircle : PauseCircle;

  const facts = [
    { label: 'Email', value: current.email, icon: Mail },
    { label: 'Phone', value: formatCustomerPhone(current), icon: Phone },
    { label: 'Username', value: current.user_name, icon: AtSign },
    { label: 'Nickname', value: current.nick_name, icon: UserRound },
    { label: 'Joined', value: formatDate(new Date(current.createdAt)), icon: CalendarDays },
    { label: 'Last updated', value: formatDateTime(current.updatedAt), icon: History },
  ];

  return (
    <Modal
      title="Customer Details"
      description="Profile, contact details and saved addresses."
      icon={UserRound}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-slate-600 font-medium hover:bg-slate-100 transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => onToggleStatus(current)}
            className={`px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 font-medium text-white shadow-sm transition-colors ${
              isSuspended
                ? 'bg-teal-500 hover:bg-teal-600 shadow-teal-500/30'
                : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/30'
            }`}
          >
            <ToggleIcon size={18} />
            {isSuspended ? 'Reactivate Customer' : 'Suspend Customer'}
          </button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Identity */}
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-100 bg-linear-to-br from-teal-50/70 via-white to-white p-5 text-center sm:flex-row sm:text-left">
          <Avatar
            src={buildProfileImageUrl(current)}
            name={current.fullName}
            className="h-16 w-16 text-xl ring-4 ring-white shadow-md"
          />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold text-slate-800 truncate">{current.fullName}</p>
            <p className="text-sm text-slate-500 truncate">{current.email}</p>
          </div>
          <CustomerStatusPill status={current.accountStatus} />
        </div>

        {/* Account facts */}
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {facts.map((fact) => (
            <div key={fact.label} className="flex items-center gap-3 rounded-xl border border-slate-100 px-4 py-3">
              <div className="w-9 h-9 shrink-0 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center">
                <fact.icon size={16} />
              </div>
              <div className="min-w-0">
                <dt className="text-xs font-medium text-slate-400">{fact.label}</dt>
                <dd className={`text-sm truncate ${fact.value ? 'font-semibold text-slate-700' : 'italic text-slate-400'}`}>
                  {fact.value || 'Not provided'}
                </dd>
              </div>
            </div>
          ))}
        </dl>

        {/* Addresses */}
        <div>
          <div className="flex items-center justify-between gap-3 mb-3">
            <h3 className="text-sm font-bold text-slate-800">Saved Addresses</h3>
            {!isLoadingDetails && addresses.length > 0 && (
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 tabular-nums">
                {addresses.length}
              </span>
            )}
          </div>

          {isLoadingDetails ? (
            <div className="space-y-3 animate-pulse" aria-label="Loading addresses">
              {[0, 1].map((row) => (
                <div key={row} className="h-16 rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : details.status === 'failed' ? (
            <p className="rounded-xl border border-dashed border-rose-200 bg-rose-50/50 px-4 py-5 text-center text-sm text-rose-600">
              Couldn't load this customer's addresses. Close and open the details again to retry.
            </p>
          ) : addresses.length === 0 ? (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-200 px-4 py-7 text-center">
              <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                <MapPinOff size={20} />
              </div>
              <p className="text-sm font-semibold text-slate-700">No saved addresses</p>
              <p className="text-xs text-slate-400 mt-0.5">This customer hasn't added an address yet.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {addresses.map((address) => (
                <li
                  key={address._id}
                  className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${
                    address.is_default ? 'border-teal-200 bg-teal-50/40' : 'border-slate-100'
                  }`}
                >
                  <div
                    className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center ${
                      address.is_default ? 'bg-teal-100 text-teal-600' : 'bg-slate-50 text-slate-400'
                    }`}
                  >
                    <MapPin size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold capitalize text-slate-700">{address.label || 'Address'}</p>
                      {address.is_default && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-semibold text-teal-700">
                          <Star size={10} className="fill-current" />
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5 wrap-break-word">
                      {formatCustomerAddress(address) || 'No address details'}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
