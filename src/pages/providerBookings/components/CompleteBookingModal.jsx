import { useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Loader2, Receipt, ShieldCheck } from 'lucide-react';
import { Modal } from '@/components/common/modal/index.js';
import { formatMoney } from '@/features/providerBooking/index.js';

const MAX_NOTE = 300;

// Mark an in-progress job as done, with price breakdown and cash payment amount entry.
export default function CompleteBookingModal({ booking, busy, onConfirm, onClose }) {
  const totalDue = Number(booking?.pricing?.total) || 0;
  const commissionRate = booking?.commissionRate ?? booking?.pricing?.commissionRate ?? 10;
  const commission = Number(booking?.pricing?.commission) || Math.round(totalDue * (commissionRate / 100));
  const netEarnings = Number(booking?.pricing?.earning) || (totalDue - commission);

  const [paidAmount, setPaidAmount] = useState(String(totalDue));
  const [note, setNote] = useState('');
  const [showBreakdown, setShowBreakdown] = useState(true);

  const amount = Number(paidAmount) || 0;
  const difference = amount - totalDue;

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    onConfirm({
      note,
      paidAmount: amount,
      amountReceived: amount,
    });
  };

  return (
    <Modal
      title="Complete Job & Record Payment"
      description={`${booking.service?.name || 'Service'} for ${booking.customer?.name || 'Customer'}`}
      icon={CheckCircle2}
      iconClassName="bg-emerald-50 text-emerald-600"
      size="sm"
      busy={busy}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Not yet
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={busy || amount < 0}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium shadow-sm shadow-emerald-500/30 transition-colors disabled:opacity-70 inline-flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
            Complete & Record {formatMoney(amount)}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Price Breakdown Banner */}
        <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 text-xs text-slate-600">
          <div className="flex items-center justify-between font-bold text-slate-800 text-sm">
            <span className="flex items-center gap-1.5">
              <Receipt size={15} className="text-teal-600" />
              Price Breakdown
            </span>
            <button
              type="button"
              onClick={() => setShowBreakdown((prev) => !prev)}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showBreakdown ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          </div>

          {showBreakdown && (
            <div className="mt-2.5 space-y-1.5 border-t border-slate-200/60 pt-2">
              <div className="flex justify-between text-slate-500">
                <span>Customer Total Bill</span>
                <span className="font-semibold text-slate-800">{formatMoney(totalDue)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Platform Commission ({commissionRate}%)</span>
                <span className="font-semibold text-rose-600">− {formatMoney(commission)}</span>
              </div>
              <div className="flex justify-between font-bold text-teal-700 text-xs pt-1 border-t border-dashed border-slate-200">
                <span>Your Net Payout</span>
                <span>{formatMoney(netEarnings)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Cash Collected Input */}
        <div className="space-y-1.5">
          <label htmlFor="cash-paid-amount" className="text-sm font-semibold text-slate-800 flex items-center justify-between">
            <span>Cash Paid by Customer (₹)</span>
            <span className="text-xs font-normal text-emerald-600 font-medium">Cash on Delivery</span>
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">₹</span>
            <input
              id="cash-paid-amount"
              type="number"
              inputMode="decimal"
              min="0"
              step="1"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              className="input-field bg-slate-50 pl-8 text-lg font-bold text-slate-900 focus:bg-white"
              placeholder={String(totalDue)}
            />
          </div>

          {difference !== 0 && (
            <div className="flex items-center justify-between text-xs pt-1">
              <span className={`inline-flex items-center gap-1 font-medium ${difference < 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                <AlertCircle size={13} />
                {formatMoney(Math.abs(difference))} {difference > 0 ? 'more' : 'less'} than standard total ({formatMoney(totalDue)})
              </span>
              <button
                type="button"
                onClick={() => setPaidAmount(String(totalDue))}
                className="font-semibold text-teal-600 hover:text-teal-700"
              >
                Reset to exact
              </button>
            </div>
          )}
        </div>

        {/* Work Done Note */}
        <div className="space-y-1">
          <label htmlFor="complete-note" className="text-sm font-medium text-slate-700">
            Work done / completion note <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <textarea
            id="complete-note"
            value={note}
            onChange={(event) => setNote(event.target.value.slice(0, MAX_NOTE))}
            rows={2}
            placeholder="e.g. Job completed successfully, cash collected in full"
            className="input-field bg-slate-50 resize-none text-xs"
          />
          <p className="text-right text-[11px] text-slate-400">
            {note.length}/{MAX_NOTE}
          </p>
        </div>
      </div>
    </Modal>
  );
}
