import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, ArrowLeft, Banknote, Loader2, ShieldCheck } from 'lucide-react';
import { Avatar } from '@/components/common/avatar/index.js';
import { Modal } from '@/components/common/modal/index.js';
import { formatBookingNumber, formatMoney } from '@/features/providerBooking/index.js';

const MAX_AMOUNT = 100000;

const pad = (value) => String(value).padStart(2, '0');
// Local "YYYY-MM-DDTHH:mm" for <input type="datetime-local">.
const toLocalInput = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

const buildSchema = (amountDue) =>
  z
    .object({
      amountReceived: z
        .number({ error: 'Enter the amount you received' })
        .positive('Amount must be more than ₹0')
        .max(MAX_AMOUNT, `Amount can't be more than ${formatMoney(MAX_AMOUNT)}`),
      receivedAt: z
        .string()
        .min(1, 'Pick when you received it')
        .refine((value) => new Date(value).getTime() <= Date.now() + 5 * 60000, "This can't be in the future"),
      note: z.string().trim().max(200, 'Keep the note under 200 characters'),
    })
    .superRefine((values, ctx) => {
      if (values.amountReceived !== amountDue && !values.note) {
        ctx.addIssue({ code: 'custom', path: ['note'], message: 'Add a note explaining the different amount' });
      }
    });

// Record the cash the customer paid after a completed job. Two steps: fill
// in the amount, then an explicit "I received ₹X from <customer>" confirmation.
export default function RecordPaymentModal({ booking, busy, onConfirm, onClose }) {
  const amountDue = booking.pricing.total;
  const [step, setStep] = useState('form');

  const {
    register,
    control,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(buildSchema(amountDue)),
    defaultValues: { amountReceived: amountDue, receivedAt: toLocalInput(new Date()), note: '' },
  });
  const values = useWatch({ control });
  const amount = Number(values.amountReceived) || 0;
  const difference = amount - amountDue;

  const review = handleSubmit(() => setStep('confirm'));
  const confirm = handleSubmit((data) =>
    onConfirm({
      amountReceived: data.amountReceived,
      receivedAt: new Date(data.receivedAt).toISOString(),
      note: data.note,
    }),
  );

  const footer =
    step === 'form' ? (
      <>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={review}
          className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium shadow-sm shadow-emerald-500/30 transition-colors"
        >
          Continue
        </button>
      </>
    ) : (
      <>
        <button
          type="button"
          onClick={() => setStep('form')}
          disabled={busy}
          className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <button
          type="button"
          onClick={confirm}
          disabled={busy}
          className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium shadow-sm shadow-emerald-500/30 transition-colors disabled:opacity-70 inline-flex items-center justify-center gap-2"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
          Yes, I received {formatMoney(amount)}
        </button>
      </>
    );

  return (
    <Modal
      title={step === 'form' ? 'Record cash payment' : 'Confirm cash received'}
      description={`${formatBookingNumber(booking)} · ${booking.service.name}`}
      icon={Banknote}
      iconClassName="bg-emerald-50 text-emerald-600"
      size="sm"
      busy={busy}
      onClose={onClose}
      footer={footer}
    >
      {step === 'form' ? (
        <form noValidate onSubmit={review} className="space-y-4">
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
            <span className="text-sm text-slate-500">Amount due</span>
            <span className="text-lg font-extrabold text-slate-800">{formatMoney(amountDue)}</span>
          </div>

          <div className="space-y-1">
            <label htmlFor="payment-amount" className="text-sm font-medium text-gray-700">
              Amount received
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">₹</span>
              <input
                id="payment-amount"
                type="number"
                inputMode="decimal"
                min="1"
                step="1"
                aria-invalid={Boolean(errors.amountReceived)}
                className={`input-field bg-slate-50 pl-8 text-lg font-bold ${errors.amountReceived ? 'border-rose-300' : ''}`}
                {...register('amountReceived', { valueAsNumber: true })}
              />
            </div>
            {errors.amountReceived ? (
              <p role="alert" className="text-xs font-medium text-rose-500">
                {errors.amountReceived.message}
              </p>
            ) : difference !== 0 && amount > 0 ? (
              <p className="flex items-center gap-1 text-xs font-medium text-amber-600">
                <AlertTriangle size={12} />
                {formatMoney(Math.abs(difference))} {difference > 0 ? 'more' : 'less'} than due - add a note below.
              </p>
            ) : null}
            {difference !== 0 && (
              <button
                type="button"
                onClick={() => setValue('amountReceived', amountDue, { shouldValidate: true })}
                className="text-xs font-semibold text-teal-600 hover:text-teal-700"
              >
                Use exact amount ({formatMoney(amountDue)})
              </button>
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor="payment-time" className="text-sm font-medium text-gray-700">
              Received on
            </label>
            <input
              id="payment-time"
              type="datetime-local"
              max={toLocalInput(new Date())}
              aria-invalid={Boolean(errors.receivedAt)}
              className={`input-field bg-slate-50 ${errors.receivedAt ? 'border-rose-300' : ''}`}
              {...register('receivedAt')}
            />
            {errors.receivedAt && (
              <p role="alert" className="text-xs font-medium text-rose-500">
                {errors.receivedAt.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor="payment-note" className="text-sm font-medium text-gray-700">
              Note{' '}
              <span className="font-normal text-slate-400">{difference !== 0 ? '(required)' : '(optional)'}</span>
            </label>
            <textarea
              id="payment-note"
              rows={2}
              placeholder={difference !== 0 ? 'e.g. Customer paid ₹50 extra for a new washer' : 'Anything worth noting'}
              aria-invalid={Boolean(errors.note)}
              className={`input-field bg-slate-50 resize-none ${errors.note ? 'border-rose-300' : ''}`}
              {...register('note')}
            />
            {errors.note && (
              <p role="alert" className="text-xs font-medium text-rose-500">
                {errors.note.message}
              </p>
            )}
          </div>
        </form>
      ) : (
        <div className="text-center py-2">
          <div className="relative mx-auto w-fit">
            <div className="absolute inset-0 rounded-full bg-emerald-400/25 blur-xl" />
            <Avatar name={booking.customer.name} className="relative h-16 w-16 text-lg ring-4 ring-white shadow-md" />
          </div>
          <p className="mt-4 text-sm text-slate-500">Confirm you received</p>
          <p className="text-4xl font-extrabold text-emerald-600 mt-1">{formatMoney(amount)}</p>
          <p className="mt-1 text-sm text-slate-500">
            in cash from <span className="font-semibold text-slate-700">{booking.customer.name}</span>
          </p>
          {difference !== 0 && (
            <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {formatMoney(Math.abs(difference))} {difference > 0 ? 'more' : 'less'} than the {formatMoney(amountDue)} due
              {values.note ? `: "${values.note.trim()}"` : ''}
            </p>
          )}
          <p className="mt-4 text-xs text-slate-400">This closes the booking and adds it to your earnings.</p>
        </div>
      )}
    </Modal>
  );
}
