import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarCheck2, CalendarX2, Loader2 } from 'lucide-react';
import { Modal } from '@/components/common/modal/index.js';
import { Avatar } from '@/components/common/avatar/index.js';
import { buildProfileImageUrl } from '@/features/auth/index.js';
import {
  NOTE_MAX,
  formatLongDay,
  formatStamp,
  formatTimeOffSpan,
  rejectTimeOffSchema,
  relativeDay,
} from '@/features/providerAvailability/index.js';

const REJECT_PRESETS = [
  'Too many bookings that day',
  'Not enough providers available',
  'Please pick another date',
];

// What the reviewer is deciding on - shared by both dialogs.
function RequestSummary({ record }) {
  const provider = record.provider_id ?? {};
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
      <div className="flex items-center gap-3">
        <Avatar src={buildProfileImageUrl(provider)} name={provider.fullName} className="h-10 w-10 text-sm" />
        <div className="min-w-0">
          <p className="font-semibold text-slate-800 truncate">{provider.fullName ?? 'Provider'}</p>
          <p className="text-xs text-slate-500 truncate">{provider.email}</p>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-slate-400">Date</dt>
          <dd className="font-semibold text-slate-700">{formatLongDay(record.date)}</dd>
          <dd className="text-xs text-slate-500">{relativeDay(record.date)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-400">Time</dt>
          <dd className="font-semibold text-slate-700">{formatTimeOffSpan(record)}</dd>
          <dd className="text-xs text-slate-500">Asked {formatStamp(record.createdAt)}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs text-slate-400">Reason</dt>
          <dd className="text-slate-700">{record.reason}</dd>
        </div>
      </dl>
    </div>
  );
}

const cancelButton = 'px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors disabled:opacity-50';

// Approve: an optional note, then the provider is unavailable that day.
export function ApproveTimeOffModal({ record, busy, onConfirm, onClose }) {
  const [notes, setNotes] = useState('');
  return (
    <Modal
      title="Approve this time off?"
      description="The provider will be unavailable for bookings on this date."
      icon={CalendarCheck2}
      busy={busy}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={busy} className={cancelButton}>
            Not now
          </button>
          <button
            type="button"
            onClick={() => onConfirm({ notes })}
            disabled={busy}
            className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-medium shadow-sm shadow-teal-500/30 transition-colors disabled:opacity-70 inline-flex items-center justify-center gap-2"
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            Approve
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <RequestSummary record={record} />
        <div className="space-y-1">
          <label htmlFor="approve-notes" className="text-sm font-medium text-gray-700">
            Internal note <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <textarea
            id="approve-notes"
            rows={2}
            maxLength={NOTE_MAX}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="e.g. Bookings on this day moved to another provider"
            className="input-field bg-slate-50 resize-none"
          />
        </div>
        <p className="text-xs text-slate-500">
          Remember to reassign any bookings the provider already has that day from Booking Management.
        </p>
      </div>
    </Modal>
  );
}

// Reject: a reason is required - the provider sees it on their calendar.
export function RejectTimeOffModal({ record, busy, onConfirm, onClose }) {
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm({ resolver: zodResolver(rejectTimeOffSchema), defaultValues: { rejectReason: '' } });
  const rejectReason = useWatch({ control, name: 'rejectReason' });

  return (
    <Modal
      title="Reject this time off?"
      description="The provider stays available and sees your reason."
      icon={CalendarX2}
      iconClassName="bg-rose-50 text-rose-500"
      busy={busy}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={busy} className={cancelButton}>
            Keep pending
          </button>
          <button
            type="submit"
            form="reject-time-off-form"
            disabled={busy}
            className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-medium shadow-sm shadow-rose-500/30 transition-colors disabled:opacity-70 inline-flex items-center justify-center gap-2"
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            Reject
          </button>
        </>
      }
    >
      <form id="reject-time-off-form" noValidate onSubmit={handleSubmit(onConfirm)} className="space-y-4">
        <RequestSummary record={record} />
        <div className="space-y-2">
          <label htmlFor="reject-reason" className="text-sm font-medium text-gray-700">
            Why can't they take it off?
          </label>
          <div className="flex flex-wrap gap-2">
            {REJECT_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setValue('rejectReason', preset, { shouldValidate: Boolean(errors.rejectReason) })}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold ring-1 ring-inset transition-colors ${
                  rejectReason?.trim() === preset
                    ? 'bg-rose-500 text-white ring-rose-500'
                    : 'bg-white text-slate-600 ring-slate-200 hover:ring-rose-300 hover:text-rose-600'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
          <textarea
            id="reject-reason"
            rows={3}
            maxLength={NOTE_MAX}
            placeholder="Pick one above or write your own"
            aria-invalid={Boolean(errors.rejectReason)}
            className={`input-field bg-slate-50 resize-none ${errors.rejectReason ? 'border-rose-300' : ''}`}
            {...register('rejectReason')}
          />
          {errors.rejectReason && (
            <p role="alert" className="text-xs font-medium text-rose-500">
              {errors.rejectReason.message}
            </p>
          )}
        </div>
      </form>
    </Modal>
  );
}
