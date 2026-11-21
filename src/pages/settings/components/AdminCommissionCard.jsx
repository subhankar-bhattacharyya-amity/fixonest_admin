import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import {
  Percent,
  Layers,
  Loader2,
  Save,
  RotateCcw,
  CheckCircle2,
  Coins,
  Calculator,
  ShieldCheck,
  TrendingUp,
  Plus,
  Minus,
  Sparkles,
  Info,
} from 'lucide-react';
import { getJson, patchJson } from '@/lib/httpClient.js';
import { getVerticalVisual } from '@/features/vertical/index.js';

const QUICK_PRESETS = [5, 8, 10, 12, 15, 20];
const SIMULATION_AMOUNTS = [500, 1000, 2500, 5000];

export default function AdminCommissionCard({ id = 'vertical-commission-rate', onCommissionUpdated }) {
  const [vertical, setVertical] = useState(null);
  const [savedRate, setSavedRate] = useState(10);
  const [rateInput, setRateInput] = useState(10);
  const [simAmount, setSimAmount] = useState(1000);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const onCommissionUpdatedRef = useRef(onCommissionUpdated);
  useEffect(() => {
    onCommissionUpdatedRef.current = onCommissionUpdated;
  }, [onCommissionUpdated]);

  const loadCommission = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getJson('/admin/api/v1/vertical/commission');
      if (res.data) {
        setVertical(res.data);
        const rate = res.data.commissionRate !== undefined ? Number(res.data.commissionRate) : 10;
        setSavedRate(rate);
        setRateInput(rate);
        onCommissionUpdatedRef.current?.(rate, res.data);
      }
    } catch {
      // Handled globally by httpClient
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCommission();
  }, [loadCommission]);

  const numRate = Math.min(100, Math.max(0, Number(rateInput) || 0));
  const providerShare = Math.max(0, 100 - numRate);
  const isDirty = numRate !== savedRate;

  const handleStep = (delta) => {
    setRateInput((prev) => {
      const next = Math.min(100, Math.max(0, parseFloat(((Number(prev) || 0) + delta).toFixed(1))));
      return next;
    });
  };

  const handlePreset = (val) => {
    setRateInput(val);
  };

  const handleReset = () => {
    setRateInput(savedRate);
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (isNaN(numRate) || numRate < 0 || numRate > 100) {
      toast.error('Commission rate must be between 0% and 100%');
      return;
    }

    try {
      setSaving(true);
      const res = await patchJson('/admin/api/v1/vertical/commission', {
        commissionRate: numRate,
      });
      if (res.data) {
        setVertical(res.data);
        setSavedRate(numRate);
        onCommissionUpdatedRef.current?.(numRate, res.data);
      }
      toast.success('Vertical commission rate updated successfully!', {
        description: `Platform fee set to ${numRate}% · Provider earnings set to ${providerShare}%`,
      });
    } catch {
      // Handled globally
    } finally {
      setSaving(false);
    }
  };

  const verticalVisual = useMemo(() => {
    if (!vertical?.name) return { icon: Layers, tone: 'bg-teal-50 text-teal-600 ring-teal-100' };
    return getVerticalVisual(vertical.name);
  }, [vertical?.name]);

  const VerticalIcon = verticalVisual.icon;

  // Simulator calculation
  const platformFee = (simAmount * (numRate / 100));
  const providerEarning = (simAmount * (providerShare / 100));

  return (
    <section id={id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-rise-in">
      {/* Header */}
      <div className="p-5 sm:p-6 border-b border-slate-100 bg-linear-to-r from-slate-50/70 via-white to-teal-50/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-600 ring-1 ring-teal-100 flex items-center justify-center shrink-0 shadow-xs">
            <Percent size={22} className="stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-800">Vertical Commission Rate</h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live on Platform
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Configure the revenue split applied to every booking in this vertical.
            </p>
          </div>
        </div>

        {vertical && (
          <div className="flex items-center gap-2 self-start sm:self-auto bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-xs">
            <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${verticalVisual.tone}`}>
              <VerticalIcon size={15} />
            </span>
            <div className="text-left">
              <p className="text-xs font-bold text-slate-800 leading-tight">
                {vertical.display_name || vertical.name}
              </p>
              <p className="text-[10px] font-mono text-slate-400 leading-none mt-0.5">
                {vertical.name}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="p-5 sm:p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Loader2 className="animate-spin text-teal-600 mb-3" size={28} />
            <span className="text-sm font-medium text-slate-500">Loading commission settings...</span>
          </div>
        ) : !vertical ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
              <Info size={24} />
            </div>
            <p className="font-semibold text-slate-700">No vertical assigned</p>
            <p className="text-xs text-slate-400 mt-1">This admin account is not mapped to an active service vertical.</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {/* Split Metrics Summary Tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
              <div className="p-4 rounded-xl border border-teal-100 bg-teal-50/50 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-800/90">Platform Take Rate</span>
                  <Coins size={16} className="text-teal-600" />
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-teal-600 tracking-tight">{numRate}%</span>
                  <span className="text-xs font-medium text-teal-700/80">commission</span>
                </div>
                <p className="mt-1 text-[11px] text-teal-700/75 leading-relaxed">
                  Platform revenue deducted per completed service.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/40 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-900/90">Provider Earnings</span>
                  <TrendingUp size={16} className="text-indigo-600" />
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-indigo-600 tracking-tight">{providerShare}%</span>
                  <span className="text-xs font-medium text-indigo-700/80">payout</span>
                </div>
                <p className="mt-1 text-[11px] text-indigo-700/75 leading-relaxed">
                  Net earnings credited to the assigned professional.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/70 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Distribution Ratio</span>
                  <ShieldCheck size={16} className="text-slate-500" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-800">{numRate}</span>
                  <span className="text-sm font-semibold text-slate-400">:</span>
                  <span className="text-2xl font-bold text-slate-800">{providerShare}</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                  Transparent fee model guaranteed across all bookings.
                </p>
              </div>
            </div>

            {/* Split Progress Bar */}
            <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-100">
              <div className="flex items-center justify-between text-xs font-semibold mb-2">
                <span className="text-teal-700 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                  Fixonest Platform: {numRate}%
                </span>
                <span className="text-indigo-700 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  Provider Share: {providerShare}%
                </span>
              </div>
              <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
                <div
                  className="bg-teal-500 transition-all duration-300 ease-out flex items-center justify-center"
                  style={{ width: `${numRate}%` }}
                  title={`Platform: ${numRate}%`}
                />
                <div
                  className="bg-indigo-500 transition-all duration-300 ease-out flex items-center justify-center"
                  style={{ width: `${providerShare}%` }}
                  title={`Provider: ${providerShare}%`}
                />
              </div>
            </div>

            {/* Interactive Controller (Number Input + Range Slider + Quick Presets) */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <label htmlFor="adminCommissionInput" className="text-sm font-bold text-slate-800 block">
                    Adjust Platform Commission Rate
                  </label>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Drag the slider, type a percentage, or choose a preset rate below.
                  </p>
                </div>

                {/* Number Input with Stepper */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => handleStep(-1)}
                    disabled={numRate <= 0 || saving}
                    title="Decrease 1%"
                    className="w-9 h-9 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 active:bg-slate-200 flex items-center justify-center disabled:opacity-40 transition-colors"
                  >
                    <Minus size={15} />
                  </button>

                  <div className="relative w-28">
                    <input
                      id="adminCommissionInput"
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={rateInput}
                      onChange={(e) => setRateInput(e.target.value)}
                      disabled={saving}
                      className="w-full text-center py-1.5 pr-6 pl-2 rounded-lg border border-slate-300 font-extrabold text-slate-800 text-base focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">%</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleStep(1)}
                    disabled={numRate >= 100 || saving}
                    title="Increase 1%"
                    className="w-9 h-9 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 active:bg-slate-200 flex items-center justify-center disabled:opacity-40 transition-colors"
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>

              {/* Slider */}
              <div className="pt-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.5"
                  value={numRate}
                  onChange={(e) => setRateInput(Number(e.target.value))}
                  disabled={saving}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600 focus:outline-none"
                />
                <div className="flex justify-between text-[11px] font-medium text-slate-400 mt-1">
                  <span>0% (No Fee)</span>
                  <span>10% (Default)</span>
                  <span>25%</span>
                  <span>50%</span>
                  <span>100% (Platform Only)</span>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-slate-500 mr-1 flex items-center gap-1">
                  <Sparkles size={13} className="text-teal-600" />
                  Quick Presets:
                </span>
                {QUICK_PRESETS.map((preset) => {
                  const active = Math.abs(numRate - preset) < 0.01;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handlePreset(preset)}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                        active
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800'
                      }`}
                    >
                      {preset}%{preset === 10 ? ' (Default)' : ''}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Calculation Simulator */}
            <div className="bg-slate-50/70 rounded-xl border border-slate-200/80 p-5 space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Calculator size={16} className="text-teal-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Live Booking Revenue Simulator
                  </span>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  <span className="text-[11px] text-slate-400 mr-1">Booking Value:</span>
                  {SIMULATION_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setSimAmount(amt)}
                      className={`px-2.5 py-0.5 rounded-md text-xs font-semibold transition-colors ${
                        simAmount === amt
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      ₹{amt.toLocaleString('en-IN')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-xl border border-slate-200/70 text-sm">
                <div>
                  <p className="text-xs text-slate-400 font-medium">Customer Paid</p>
                  <p className="text-lg font-bold text-slate-800 mt-0.5">₹{simAmount.toFixed(2)}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Total booking charge</p>
                </div>
                <div className="border-t sm:border-t-0 sm:border-l border-slate-100 pt-2 sm:pt-0 sm:pl-4">
                  <p className="text-xs text-teal-700 font-medium">Platform Fee ({numRate}%)</p>
                  <p className="text-lg font-bold text-teal-600 mt-0.5">₹{platformFee.toFixed(2)}</p>
                  <p className="text-[11px] text-teal-600/70 mt-0.5">Retained by Fixonest</p>
                </div>
                <div className="border-t sm:border-t-0 sm:border-l border-slate-100 pt-2 sm:pt-0 sm:pl-4">
                  <p className="text-xs text-indigo-700 font-medium">Provider Payout ({providerShare}%)</p>
                  <p className="text-lg font-bold text-indigo-600 mt-0.5">₹{providerEarning.toFixed(2)}</p>
                  <p className="text-[11px] text-indigo-600/70 mt-0.5">Direct to technician wallet</p>
                </div>
              </div>
            </div>

            {/* Save / Status Bar */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
              <div className="text-xs text-slate-500">
                {isDirty ? (
                  <span className="inline-flex items-center gap-1.5 text-amber-700 font-medium bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Unsaved changes: Modified from {savedRate}% to {numRate}%
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-slate-400">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    Current rate is active and up to date
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
                {isDirty && (
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors disabled:opacity-50"
                  >
                    <RotateCcw size={14} />
                    Reset
                  </button>
                )}

                <button
                  type="submit"
                  disabled={saving || !isDirty}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs sm:text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 rounded-xl transition-all shadow-sm shadow-teal-600/30 disabled:opacity-50 disabled:shadow-none"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  <span>Save Commission Rate</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
