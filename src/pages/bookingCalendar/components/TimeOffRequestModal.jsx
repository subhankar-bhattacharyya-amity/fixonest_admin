import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { CalendarOff, Loader2, ShieldCheck, TriangleAlert } from 'lucide-react';
import { Modal } from '@/components/common/modal/index.js';
import {
  MIN_NOTICE_DAYS,
  REASON_MAX,
  TIME_OFF_REASONS,
  TIME_OFF_STATUS,
  formatLongDay,
  formatMediumDay,
  requestTimeOff,
  timeOffRequestSchema,
} from '@/features/providerAvailability/index.js';

// Ask for time off on one date: full day or part of it, with a reason. It goes
// to the Admin and Super Admin as "pending"; the provider stays bookable until
// it's approved. `getDayInfo(date)` is the page's dayInfo, used to warn about
// bookings already on that day and to stop requests Fixonest doesn't need
// (holidays, closed weekdays, a day already asked off).
export default function TimeOffRequestModal({ initialDate, earliest, getDayInfo, onClose, onSubmitted }) {
  const dispatch = useDispatch();
  const [busy, setBusy] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(timeOffRequestSchema),
    defaultValues: { date: initialDate, isFullDay: true, startTime: '10:00', endTime: '14:00', reason: '' },
  });

  const [date, isFullDay, reason] = useWatch({ control, name: ['date', 'isFullDay', 'reason'] });
  const info = date && date >= earliest ? getDayInfo(date) : null;
  const clashCount = info?.activeBookings.length ?? 0;

  const submit = async (values) => {
    const day = getDayInfo(values.date);
    if (day.holiday || day.closed) {
      setError('date', { message: 'Fixonest is closed that day - no need to ask for time off' });
      return;
    }
    if (day.startedBookings.length > 0) {
      setError('date', { message: "You've already started a job on this date - pick another day" });
      return;
    }
    const existing = day.timeOff;
    if (existing && (values.isFullDay || existing.isFullDay)) {
      setError('date', {
        message:
          existing.status === TIME_OFF_STATUS.APPROVED
            ? "You're already off that day"
            : 'You already asked for time off that day',
      });
      return;
    }

    setBusy(true);
    try {
      await dispatch(requestTimeOff(values)).unwrap();
      toast.success('Time-off request sent', {
        description: `${formatMediumDay(values.date)} - you'll see it on the calendar once an admin approves it.`,
      });
      onSubmitted(values.date);
    } catch {
      // Already toasted globally by lib/httpClient.js (e.g. an overlapping request).
    } finally {
      setBusy(false);
    }
  };

  const close = () => !busy && onClose();

  return (
    <Modal
      title="Request time off"
      description="Your Admin and Super Admin will review it."
      icon={CalendarOff}
      iconClassName="bg-rose-50 text-rose-500"
      busy={busy}
      onClose={close}
      footer={
        <>
          <button
            type="button"
            onClick={close}
            disabled={busy}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="time-off-form"
            disabled={busy}
            className="px-5 py-2.5 rounded-xl bg-linear-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-medium shadow-md shadow-teal-500/30 transition-colors disabled:opacity-70 inline-flex items-center justify-center gap-2"
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            Send request
          </button>
        </>
      }
    >
      <form id="time-off-form" onSubmit={handleSubmit(submit)} noValidate className="space-y-5">
        {/* Date */}
        <div className="space-y-1">
          <label htmlFor="time-off-date" className="text-sm font-medium text-gray-700">
            Date
          </label>
          <input
            id="time-off-date"
            type="date"
            min={earliest}
            aria-invalid={Boolean(errors.date)}
            className={`input-field bg-slate-50 ${errors.date ? 'border-rose-300' : ''}`}
            {...register('date')}
          />
          {errors.date ? (
            <p role="alert" className="text-xs font-medium text-rose-500">
              {errors.date.message}
            </p>
          ) : (
            <p className="text-xs text-slate-400">
              {date ? formatLongDay(date) : ''} · needs {MIN_NOTICE_DAYS} days' notice, earliest {formatMediumDay(earliest)}
            </p>
          )}
        </div>

        {/* Full day / part */}
        <div className="space-y-2">
          <span className="text-sm font-medium text-gray-700">How long?</span>
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1" role="group" aria-label="Time off length">
            {[
              { value: true, label: 'Full day' },
              { value: false, label: 'Part of the day' },
            ].map((option) => (
              <button
                key={option.label}
                type="button"
                aria-pressed={isFullDay === option.value}
                onClick={() => setValue('isFullDay', option.value, { shouldValidate: false })}
                className={`py-2 rounded-lg text-sm font-semibold transition-all ${
                  isFullDay === option.value ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {!isFullDay && (
            <div className="grid grid-cols-2 gap-3 pt-1 animate-rise-in">
              <TimeInput id="time-off-from" label="From" error={errors.startTime?.message} registration={register('startTime')} />
              <TimeInput id="time-off-to" label="To" error={errors.endTime?.message} registration={register('endTime')} />
            </div>
          )}
        </div>

        {/* Reason */}
        <div className="space-y-2">
          <label htmlFor="time-off-reason" className="text-sm font-medium text-gray-700">
            Reason
          </label>
          <div className="flex flex-wrap gap-2">
            {TIME_OFF_REASONS.map((preset) => {
              const active = reason?.trim() === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setValue('reason', preset, { shouldValidate: Boolean(errors.reason) })}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold ring-1 ring-inset transition-colors ${
                    active
                      ? 'bg-teal-500 text-white ring-teal-500'
                      : 'bg-white text-slate-600 ring-slate-200 hover:ring-teal-300 hover:text-teal-700'
                  }`}
                >
                  {preset}
                </button>
              );
            })}
          </div>
          <textarea
            id="time-off-reason"
            rows={3}
            maxLength={REASON_MAX}
            placeholder="Pick one above or write your own"
            aria-invalid={Boolean(errors.reason)}
            className={`input-field bg-slate-50 resize-none ${errors.reason ? 'border-rose-300' : ''}`}
            {...register('reason')}
          />
          <div className="flex justify-between gap-3">
            {errors.reason ? (
              <p role="alert" className="text-xs font-medium text-rose-500">
                {errors.reason.message}
              </p>
            ) : (
              <span />
            )}
            <span className="text-xs text-slate-400 tabular-nums">
              {reason?.length ?? 0}/{REASON_MAX}
            </span>
          </div>
        </div>

        {clashCount > 0 && (
          <div className="flex gap-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <TriangleAlert size={18} className="shrink-0 mt-0.5 text-amber-500" />
            <p>
              You have <strong>{clashCount} booking{clashCount === 1 ? '' : 's'}</strong> that day. If your time off is
              approved, an admin will move {clashCount === 1 ? 'it' : 'them'} to another provider.
            </p>
          </div>
        )}

        <div className="flex gap-3 rounded-xl bg-teal-50/70 px-4 py-3 text-sm text-teal-900">
          <ShieldCheck size={18} className="shrink-0 mt-0.5 text-teal-600" />
          <p>
            You stay available for bookings until an admin approves the request. You can withdraw it any time before
            then.
          </p>
        </div>
      </form>
    </Modal>
  );
}

function TimeInput({ id, label, error, registration }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-xs font-medium text-slate-600">
        {label}
      </label>
      <input
        id={id}
        type="time"
        aria-invalid={Boolean(error)}
        className={`input-field bg-slate-50 ${error ? 'border-rose-300' : ''}`}
        {...registration}
      />
      {error && (
        <p role="alert" className="text-xs font-medium text-rose-500">
          {error}
        </p>
      )}
    </div>
  );
}
